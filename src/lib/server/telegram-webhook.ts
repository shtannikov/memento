import "server-only";

import { z } from "zod";

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
};

type TelegramCommandDependencies = {
  importItems: typeof importVocabularyItems;
  resetItems: typeof resetVocabulary;
};

const defaultDependencies: TelegramCommandDependencies = {
  importItems: importVocabularyItems,
  resetItems: resetVocabulary,
};

const HELP_MESSAGE =
  "Unknown command. Available commands:\n\n" +
  "/import\n" +
  "Add phrases to your vocabulary.\n" +
  "Put /import on the first line, then add one phrase per line:\n" +
  "• phrase - description\n" +
  "• phrase — description\n\n" +
  "A few rules:\n" +
  `• a phrase can’t be greater than ${TERM_MAX_LENGTH} symbols\n` +
  `• a description can’t be greater than ${DEFINITION_MAX_LENGTH} symbols\n` +
  `• you can import only ${IMPORT_MAX_ITEMS} phrases at a time\n\n` +
  "/reset\n" +
  "Delete all phrases from your vocabulary.";

export function parseTelegramUpdate(value: unknown): TelegramUpdate | null {
  const parsed = TelegramUpdateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function processTelegramUpdate(
  update: TelegramUpdate,
  dependencies: TelegramCommandDependencies = defaultDependencies,
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

  const reply = (text: string): TelegramReply => ({
    chatId: message.chat.id,
    replyToMessageId: message.message_id,
    text,
  });
  const command = readVocabularyCommand(message.text);
  if (!command) return reply(HELP_MESSAGE);

  const user: TelegramUser = {
    id: message.from.id,
    first_name: message.from.first_name,
    last_name: message.from.last_name,
    username: message.from.username,
  };

  if (command === "reset") {
    await dependencies.resetItems(user);
    return reply("Vocabulary reset.");
  }

  const parsedImport = parseImportCommand(message.text);
  if (!parsedImport.ok) return reply(parsedImport.message);

  try {
    const imported = await dependencies.importItems(
      user,
      parsedImport.items,
    );
    return reply(`Imported ${imported} phrases.`);
  } catch (error) {
    if (
      error instanceof AppError &&
      error.code === "VOCABULARY_LIMIT_EXCEEDED"
    ) {
      return reply(
        "Import failed: your vocabulary can contain up to " +
          `${VOCABULARY_MAX_ITEMS} phrases, including Learned. ` +
          "Nothing was imported.",
      );
    }
    throw error;
  }
}
