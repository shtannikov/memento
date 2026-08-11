import "server-only";

import { getMementoDb } from "@/server/supabase";

export async function purgeExpiredSpeakingTranscripts(): Promise<number> {
  const { data, error } = await getMementoDb().rpc(
    "purge_expired_speaking_transcripts",
  );
  if (error) throw error;
  return Number(data ?? 0);
}
