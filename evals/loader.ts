import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { APP_IDS } from "../src/languages/registry";
import type { EvalCase } from "./types";

type EvalModule = { EVAL_CASES?: unknown };

export async function loadEvalCases(): Promise<EvalCase[]> {
  const suites = await Promise.all(
    APP_IDS.map(async (appId) => {
      const modulePath = pathToFileURL(
        resolve(process.cwd(), "src/languages", appId, "evals.ts"),
      ).href;
      const evalModule = (await import(modulePath)) as EvalModule;
      if (!Array.isArray(evalModule.EVAL_CASES)) {
        throw new Error(`Language ${appId} must export EVAL_CASES from evals.ts`);
      }
      const cases = evalModule.EVAL_CASES as EvalCase[];
      if (cases.some((evalCase) => evalCase.appId !== appId)) {
        throw new Error(`Language ${appId} contains an eval for another app`);
      }
      return cases;
    }),
  );
  return suites.flat();
}
