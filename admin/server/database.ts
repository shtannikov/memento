import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getAdminDatabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("ADMIN_DATABASE_NOT_CONFIGURED");

  client = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client.schema("memento");
}
