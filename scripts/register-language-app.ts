import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { APP_IDS, isAppId } from "../src/languages/registry";
import { readArgument } from "./cli-arguments";
import { registerLanguageApp } from "./register-language-app-workflow";

loadEnvConfig(process.cwd());

const requestedAppId = readArgument(process.argv.slice(2), "--app");
if (!requestedAppId || !isAppId(requestedAppId)) {
  fail(`Use --app with one of: ${APP_IDS.join(", ")}.`);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl) fail("SUPABASE_URL is required.");
if (!supabaseSecret) fail("SUPABASE_SECRET_KEY is required.");

const database = createClient(supabaseUrl, supabaseSecret, {
  auth: { autoRefreshToken: false, persistSession: false },
}).schema("memento");

registerLanguageApp(
  {
    async register(appId) {
      const { error } = await database.from("language_apps").upsert(
        { app_id: appId },
        { onConflict: "app_id", ignoreDuplicates: true },
      );
      if (error) throw new Error(`Could not register ${appId}: ${error.message}`);
    },
    async find(appId) {
      const { data, error } = await database
        .from("language_apps")
        .select("app_id")
        .eq("app_id", appId)
        .single();
      if (error) throw new Error(`Could not verify ${appId}: ${error.message}`);
      return data?.app_id ?? null;
    },
  },
  requestedAppId,
)
  .then(() => {
    console.log(`Registered ${requestedAppId} in memento.language_apps.`);
  })
  .catch((error: unknown) => {
    fail(error instanceof Error ? error.message : "Language registration failed.");
  });

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
