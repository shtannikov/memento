import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { APP_IDS } from "../../src/app/_languages/registry";
import type { EvalCase, SpeakingEvalCase } from "./types";

type EvalModule = { EVAL_CASES?: unknown; SPEAKING_EVAL_CASES?: unknown };

export async function loadEvalCases(): Promise<EvalCase[]> {
  const suites = await Promise.all(
    APP_IDS.map(async (appId) => {
      const modulePath = pathToFileURL(
        resolve(process.cwd(), "src/app/_languages", appId, "evals.ts"),
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

export async function loadSpeakingEvalCases(): Promise<SpeakingEvalCase[]> {
  const suites = await Promise.all(
    APP_IDS.map(async (appId) => {
      const modulePath = pathToFileURL(
        resolve(process.cwd(), "src/app/_languages", appId, "evals.ts"),
      ).href;
      const evalModule = (await import(modulePath)) as EvalModule;
      if (evalModule.SPEAKING_EVAL_CASES === undefined) return [];
      if (!Array.isArray(evalModule.SPEAKING_EVAL_CASES)) {
        throw new Error(`Language ${appId} SPEAKING_EVAL_CASES must be an array`);
      }
      const cases = evalModule.SPEAKING_EVAL_CASES as SpeakingEvalCase[];
      if (cases.some((evalCase) => evalCase.appId !== appId)) {
        throw new Error(`Language ${appId} contains a speaking eval for another app`);
      }
      return cases;
    }),
  );
  return suites.flat();
}
