import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["node_modules/**", "build/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/tests/**/*.ts"],
    languageOptions: {
      globals: {
        describe: "readonly",
        test: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
      },
    },
  },
  prettier,
);
