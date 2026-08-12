import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/tests/**/*.test.ts"],
    exclude: ["src/tests/ui/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/tests/**"],
      reporter: ["text", "json-summary", "json", "html"],
      reportOnFailure: true,
      // thresholds intentionally off until a baseline is known (ratchet later):
      // thresholds: { lines: 80, statements: 80, functions: 75, branches: 70 },
    },
  },
});
