import "server-only";

import { z } from "zod";
import { DEFAULT_APP_ID, type AppId } from "@/lib/domain/app";
import { getLanguage } from "@/languages/registry";

import {
  parseImportCommand,
  readVocabularyCommand,
} from "@/lib/domain/vocabulary-import";
import {
  DEFINITION_MAX_LENGTH,
  IMPORT_MAX_ITEMS,
  TERM_MAX_LENGTH,
  VOCABULARY_MAX_ITEMS,
} from "@/lib/domain/vocabulary";
import { AppError } from "./api";
import type { TelegramUser } from "./telegram-auth";
import {
  importVocabularyItems,
  resetVocabulary,
} from "./vocabulary";

const TelegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      message_id: z.number().int().positive(),
      text: z.string().optional(),
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
});

type TelegramUpdate = z.infer<typeof TelegramUpdateSchema>;

export type TelegramReply = {
  chatId: number;
  replyToMessageId: number;
  text: string;
  parseMode?: "HTML";
  followUps?: Array<{
    text: string;
    parseMode?: "HTML";
  }>;
};

type TelegramCommandDependencies = {
  importItems: typeof importVocabularyItems;
  resetItems: typeof resetVocabulary;
};

const defaultDependencies: TelegramCommandDependencies = {
  importItems: importVocabularyItems,
  resetItems: resetVocabulary,
};

const FALLBACK_MESSAGE =
  "👋 Hey there.\n\n" +
  "Looking for the main app? Tap the <b>App</b> button below.\n\n" +
  "Here’s what I can help with right here in chat:\n" +
  "📥 /import — Add phrases to your vocabulary\n" +
  "🧹 /reset — Delete all phrases from your vocabulary";

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
  "Ask it to put /import on the first line and use phrase — description for each item.";

export function parseTelegramUpdate(value: unknown): TelegramUpdate | null {
  const parsed = TelegramUpdateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function processTelegramUpdate(
  update: TelegramUpdate,
  dependencies: TelegramCommandDependencies = defaultDependencies,
  appId: AppId = DEFAULT_APP_ID,
): Promise<TelegramReply | null> {
  const message = update.message;
  if (
    !message?.text ||
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
  const command = readVocabularyCommand(message.text);
  if (!command) {
    return {
      ...reply(FALLBACK_MESSAGE, "HTML"),
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

  const user: TelegramUser = {
    id: message.from.id,
    first_name: message.from.first_name,
    last_name: message.from.last_name,
    username: message.from.username,
  };

  if (command === "reset") {
    await dependencies.resetItems(user, appId);
    return reply("🧹 Done! Your vocabulary has been reset.");
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
