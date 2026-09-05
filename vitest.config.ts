import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@admin": fileURLToPath(new URL("./src/admin", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tooling/vitest/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "marketing/videos/**"],
    environment: "jsdom",
    setupFiles: ["./tooling/vitest/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "src/app/app-config.ts",
        "src/app/_features/quiz/domain/**/*.ts",
        "src/app/_features/vocabulary/domain/**/*.ts",
        "src/app/_features/speaking/domain.ts",
        "src/app/api/_server/telegram/auth.ts",
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
});
