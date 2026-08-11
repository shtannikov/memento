import "server-only";

import { z } from "zod";
import { DEFAULT_APP_ID, type AppId } from "@/lib/domain/app";
import { MAX_SPEAKING_TASKS_PER_DAY } from "@/features/speaking/domain";
import { processSpeakingVoiceAnswer } from "@/features/speaking/server/answers";
import {
  hasActiveSpeakingTask,
  regenerateSpeakingTaskCommand,
  runSpeakingTaskCommand,
} from "@/features/speaking/server/tasks";
import { getLanguage } from "@/languages/registry";

import {
  isSupportedTelegramCommand,
  parseImportCommand,
  readVocabularyCommand,
} from "@/lib/domain/vocabulary-import";
import {
  DEFINITION_MAX_LENGTH,
  IMPORT_MAX_ITEMS,
  TERM_MAX_LENGTH,
  VOCABULARY_MAX_ITEMS,
} from "@/lib/domain/vocabulary";
import { AppError } from "../api";
import type { TelegramUser } from "./auth";
import {
  importVocabularyItems,
  confirmLearningReset,
  ensureUserAndSeed,
  prepareLearningReset,
} from "@/features/vocabulary/server/vocabulary";
import {
  answerTelegramCallbackQuery,
  editTelegramMessage,
  sendTelegramTyping,
  type TelegramInlineButton,
} from "./bot";

const TelegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      message_id: z.number().int().positive(),
      text: z.string().optional(),
      voice: z
        .object({
          file_id: z.string().min(1),
          duration: z.number().int().nonnegative(),
        })
        .optional(),
      reply_to_message: z
        .object({ message_id: z.number().int().positive() })
        .optional(),
      chat: z.object({
        id: z.number().int(),
        type: z.string(),
      }),
      from: z
        .object({
          id: z.number().int().positive(),
          first_name: z.string().optional(),
          last_name: z.string().optional(),
          username: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  callback_query: z
    .object({
      id: z.string().min(1),
      data: z.string().min(1),
      from: z.object({
        id: z.number().int().positive(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        username: z.string().optional(),
      }),
      message: z.object({
        message_id: z.number().int().positive(),
        chat: z.object({
          id: z.number().int(),
          type: z.string(),
        }),
      }),
    })
    .optional(),
});

type TelegramUpdate = z.infer<typeof TelegramUpdateSchema>;

export type TelegramReply = {
  chatId: number;
  replyToMessageId: number;
  text: string;
  parseMode?: "HTML";
  inlineKeyboard?: TelegramInlineButton[][];
  followUps?: Array<{
    text: string;
    parseMode?: "HTML";
  }>;
};

type TelegramCommandDependencies = {
  importItems: typeof importVocabularyItems;
  prepareReset: typeof prepareLearningReset;
  confirmReset: typeof confirmLearningReset;
  ensureUser: typeof ensureUserAndSeed;
  hasActiveSpeakingTask: typeof hasActiveSpeakingTask;
  runSpeaking: typeof runSpeakingTaskCommand;
  regenerateSpeaking: typeof regenerateSpeakingTaskCommand;
  processVoice: typeof processSpeakingVoiceAnswer;
  sendTyping: typeof sendTelegramTyping;
  answerCallback: typeof answerTelegramCallbackQuery;
  editMessage: typeof editTelegramMessage;
};

const defaultDependencies: TelegramCommandDependencies = {
  importItems: importVocabularyItems,
  prepareReset: prepareLearningReset,
  confirmReset: confirmLearningReset,
  ensureUser: ensureUserAndSeed,
  hasActiveSpeakingTask,
  runSpeaking: runSpeakingTaskCommand,
  regenerateSpeaking: regenerateSpeakingTaskCommand,
  processVoice: processSpeakingVoiceAnswer,
  sendTyping: sendTelegramTyping,
  answerCallback: answerTelegramCallbackQuery,
  editMessage: editTelegramMessage,
};

const REGENERATE_CALLBACK_PREFIX = "speaking:regenerate:";
const RESET_CALLBACK_DATA = "vocabulary:reset";
const REGENERATION_WARNING =
  "⚠️ Regenerate your speaking task?\n\n" +
  "Your current task will become inactive. " +
  `Please note: the daily limit is ${MAX_SPEAKING_TASKS_PER_DAY} speaking tasks.`;

const IMPORT_HELP_MESSAGE =
  "<b>How to import</b>\n\n" +
  "Put /import on the first line, then add one phrase per line:\n" +
  "• phrase — description\n" +
  "• phrase — description\n\n" +
  "☝️ A few rules:\n" +
  `• A phrase can’t be longer than ${TERM_MAX_LENGTH} characters\n` +
  `• A description can’t be longer than ${DEFINITION_MAX_LENGTH} characters\n` +
  `• You can import up to ${IMPORT_MAX_ITEMS} phrases at a time\n\n` +
  "💡 <b>Tip:</b> ChatGPT can generate and format this list for you. " +
  "Just paste this message into ChatGPT and ask it to follow the formatting rules.";

export function parseTelegramUpdate(value: unknown): TelegramUpdate | null {
  const parsed = TelegramUpdateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function processTelegramUpdate(
  update: TelegramUpdate,
  dependencies: TelegramCommandDependencies = defaultDependencies,
  appId: AppId = DEFAULT_APP_ID,
): Promise<TelegramReply | null> {
  if (update.callback_query) {
    return processTelegramCallback(
      update.callback_query,
      dependencies,
      appId,
    );
  }
  const message = update.message;
  if (
    !message ||
    message.chat.type !== "private" ||
    !message.from ||
    message.from.id !== message.chat.id
  ) {
    return null;
  }

  const reply = (text: string, parseMode?: "HTML"): TelegramReply => ({
    chatId: message.chat.id,
    replyToMessageId: message.message_id,
    text,
    ...(parseMode ? { parseMode } : {}),
  });
  const user: TelegramUser = {
    id: message.from.id,
    first_name: message.from.first_name,
    last_name: message.from.last_name,
    username: message.from.username,
  };

  if (message.voice) {
    try {
      await dependencies.sendTyping(message.chat.id, appId);
      await dependencies.ensureUser(user, appId);
      await dependencies.processVoice(
        {
          chatId: message.chat.id,
          userId: user.id,
          messageId: message.message_id,
          replyToMessageId: message.reply_to_message?.message_id,
          fileId: message.voice.file_id,
          durationSeconds: message.voice.duration,
        },
        appId,
      );
      return null;
    } catch (error) {
      if (error instanceof AppError) return reply(error.message);
      throw error;
    }
  }
  if (!message.text) return null;
  const command = readVocabularyCommand(message.text);
  const fallbackMessage = buildFallbackMessage(appId);
  if (!command) {
    if (
      !isSupportedTelegramCommand(message.text) &&
      await dependencies.hasActiveSpeakingTask(user.id, appId)
    ) {
      return reply("🎙️Send a voice message to complete your speaking task.");
    }
    return {
      ...reply(fallbackMessage, "HTML"),
      followUps: [{ text: IMPORT_HELP_MESSAGE, parseMode: "HTML" }],
    };
  }
  if (command === "start") {
    return reply(
      `👋 Welcome to ${getLanguage(appId).appName}!\n\n` +
        "Tap <b>App</b> below to get started 👇",
      "HTML",
    );
  }

  if (command === "reset") {
    const preview = await dependencies.prepareReset(user, appId);
    return {
      ...reply(
        "⚠️ Reset your Learning list?\n\n" +
          `This will remove all ${preview.learningCount} ${preview.learningCount === 1 ? "phrase" : "phrases"} from your Learning list. ` +
          "Everything else will stay just as it is.",
      ),
      inlineKeyboard: [[{
        text: "Reset",
        callbackData: RESET_CALLBACK_DATA,
      }]],
    };
  }
  if (command === "speaking") {
    try {
      await dependencies.ensureUser(user, appId);
      const result = await dependencies.runSpeaking(
        user.id,
        appId,
        message.chat.id,
      );
      if (typeof result === "object") {
        return {
          ...reply(REGENERATION_WARNING),
          inlineKeyboard: [[{
            text: "Regenerate",
            callbackData: `${REGENERATE_CALLBACK_PREFIX}${result.activeTaskId}`,
          }]],
        };
      }
      return null;
    } catch (error) {
      if (error instanceof AppError) return reply(error.message);
      throw error;
    }
  }

  if (command === "help") {
    return {
      ...reply(fallbackMessage, "HTML"),
      followUps: [{ text: IMPORT_HELP_MESSAGE, parseMode: "HTML" }],
    };
  }

  const parsedImport = parseImportCommand(message.text);
  if (!parsedImport.ok) {
    return reply(
      parsedImport.message,
      parsedImport.formatHelp ? "HTML" : undefined,
    );
  }

  try {
    const imported = await dependencies.importItems(
      user,
      parsedImport.items,
      appId,
    );
    const noun = imported === 1 ? "phrase" : "phrases";
    return reply(`✅ Imported ${imported} ${noun}!`);
  } catch (error) {
    if (
      error instanceof AppError &&
      error.code === "VOCABULARY_LIMIT_EXCEEDED"
    ) {
      return reply(
        "📚 Your vocabulary is full. It can hold up to " +
          `${VOCABULARY_MAX_ITEMS} phrases, including Learned. ` +
          "Nothing was imported.",
      );
    }
    throw error;
  }
}

async function processTelegramCallback(
  callback: NonNullable<TelegramUpdate["callback_query"]>,
  dependencies: TelegramCommandDependencies,
  appId: AppId,
): Promise<null> {
  if (
    callback.message.chat.type !== "private" ||
    callback.from.id !== callback.message.chat.id
  ) {
    return null;
  }

  await dependencies.answerCallback(callback.id, appId);
  if (callback.data === RESET_CALLBACK_DATA) {
    return processResetCallback(callback, dependencies, appId);
  }

  const activeTaskId = readRegenerationTaskId(callback.data);
  if (!activeTaskId) return null;

  const chatId = callback.message.chat.id;
  const confirmationMessageId = callback.message.message_id;
  await dependencies.editMessage(
    chatId,
    confirmationMessageId,
    "⏳ Regenerating your speaking task…",
    appId,
  );

  try {
    await dependencies.ensureUser({
      id: callback.from.id,
      first_name: callback.from.first_name,
      last_name: callback.from.last_name,
      username: callback.from.username,
    }, appId);
    await dependencies.regenerateSpeaking(
      callback.from.id,
      appId,
      chatId,
      activeTaskId,
    );
    await dependencies.editMessage(
      chatId,
      confirmationMessageId,
      "✅ Your new speaking task is ready.",
      appId,
    );
  } catch (error) {
    const message = regenerationErrorMessage(error);
    if (!(error instanceof AppError)) console.error(error);
    await dependencies.editMessage(
      chatId,
      confirmationMessageId,
      message,
      appId,
    );
  }
  return null;
}

async function processResetCallback(
  callback: NonNullable<TelegramUpdate["callback_query"]>,
  dependencies: TelegramCommandDependencies,
  appId: AppId,
): Promise<null> {
  const chatId = callback.message.chat.id;
  const confirmationMessageId = callback.message.message_id;
  await dependencies.editMessage(
    chatId,
    confirmationMessageId,
    "⏳ Resetting your Learning phrases…",
    appId,
  );

  try {
    await dependencies.confirmReset({
      id: callback.from.id,
      first_name: callback.from.first_name,
      last_name: callback.from.last_name,
      username: callback.from.username,
    }, appId);
    await dependencies.editMessage(
      chatId,
      confirmationMessageId,
      "🧹 Done! The Learning list has been reset.",
      appId,
    );
  } catch (error) {
    if (!(error instanceof AppError)) console.error(error);
    await dependencies.editMessage(
      chatId,
      confirmationMessageId,
      error instanceof AppError
        ? error.message
        : "⚠️ I couldn’t reset your Learning phrases. Send /reset to try again.",
      appId,
    );
  }
  return null;
}

function readRegenerationTaskId(data: string): string | null {
  if (!data.startsWith(REGENERATE_CALLBACK_PREFIX)) return null;
  const parsed = z.string().uuid().safeParse(
    data.slice(REGENERATE_CALLBACK_PREFIX.length),
  );
  return parsed.success ? parsed.data : null;
}

function regenerationErrorMessage(error: unknown): string {
  if (!(error instanceof AppError)) {
    return "⚠️ I couldn’t regenerate the task. Your current task is still active. Send /speaking to try again.";
  }
  if (error.code === "TASK_PREPARING") {
    return "⏳ A new speaking task is already being prepared.";
  }
  if (error.code === "REGENERATION_STALE") {
    return "This regeneration request is no longer active. Send /speaking to check your current task.";
  }
  return error.message;
}

function buildFallbackMessage(appId: AppId): string {
  const hasSpeaking = Boolean(getLanguage(appId).speaking);
  const taskLine = hasSpeaking
    ? "\n🎙 /speaking — get your speaking task"
    : "";
  return (
    "👋 Hey there.\n\n" +
    "Looking for the main app? Tap the <b>App</b> button below.\n\n" +
    "Here’s what I can help with right here in chat:\n" +
    "📥 /import — add phrases to your vocabulary" +
    taskLine +
    "\n🧹 /reset — remove all phrases from Learning"
  );
}
