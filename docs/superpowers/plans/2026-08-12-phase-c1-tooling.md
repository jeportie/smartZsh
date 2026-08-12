# Phase C1 — Local Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate smartzsh's local tooling to the tskickstart stack — vitest, eslint 9 flat, cspell, secretlint, commitlint, husky + lint-staged, and a `check` bundle — so `npm run check`, `npm test`, and `npm run e2e` pass and hooks enforce lint-staged + conventional commits.

**Architecture:** Config-and-scripts migration on top of the merged Phase A codebase (zsh/macOS-only smartzsh). jest→vitest is the only code-touching change (test files + snapshots); everything else is config/deps. `@microsoft/shell-use` is runner-agnostic, so the PTY e2e moves to vitest unchanged.

**Tech Stack:** vitest 2 (+@vitest/coverage-v8), eslint 9 flat + typescript-eslint 8 + eslint-config-prettier, prettier 3, cspell 8, secretlint 8, @commitlint/cli 19 + config-conventional + commitlint-plugin-cspell, husky 9 + lint-staged 15.

## Global Constraints

- **Base:** branch `feat/phase-c1-tooling` off `dev` (has Phase A). Do not touch `src/**` behaviour — only tests, config, and the per-file header comments.
- **Env (from Phase A):** `npm test` / `npm run e2e` / `git commit` need the **sandbox disabled** (data-dir writes at `~/.local/share/smartzsh`; GPG signing). `rm -rf` is blocked → use `trash`.
- **e2e determinism:** the clean-zsh fixture (`src/tests/fixtures/cleanzsh`) + `dirname(process.execPath)` on PATH in `helpers.ts` must survive the vitest migration.
- **Commits:** Conventional Commits, no AI attribution. Use the ledger `create-pr` skill for the final PR (draft, base `dev`).

---

## File Structure

| File                                                                             | Change                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `vitest.config.ts`, `vitest.e2e.config.ts`                                       | Create (replace `jest.config.cjs`, `jest.e2e.config.cjs`). |
| `src/tests/**/*.test.ts`                                                         | Migrate jest APIs → vitest; regenerate `__snapshots__`.    |
| `eslint.config.js`                                                               | Create (replace `.eslintrc.cjs`); typescript-eslint flat.  |
| `src/**/*.ts` (+ `scripts`, configs)                                             | Remove the 2-line MS copyright header.                     |
| `cspell.json`, `.secretlintrc.json`, `.secretlintignore`, `commitlint.config.js` | Create.                                                    |
| `.husky/pre-commit`, `.husky/commit-msg`                                         | Fix.                                                       |
| `package.json`                                                                   | Scripts + devDeps.                                         |

---

## Task 1: Baseline

**Files:** none (verification)

- [ ] **Step 1: Confirm the Phase A tree is green under jest before migrating**

Run: `npm run build && npm test && npm run test:e2e` (sandbox off).
Expected: unit 159 pass, e2e 17 pass. This is the behaviour the vitest migration must preserve.

---

## Task 2: vitest — config, scripts, deps

**Files:** Create `vitest.config.ts`, `vitest.e2e.config.ts`; Modify `package.json`; Delete `jest.config.cjs`, `jest.e2e.config.cjs`

- [ ] **Step 1: Install vitest, remove jest**

```bash
npm install -D vitest@^2 @vitest/coverage-v8@^2   # sandbox off (network)
npm uninstall -D jest ts-jest @types/jest
```

- [ ] **Step 2: `vitest.config.ts`** (unit)

```ts
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
```

- [ ] **Step 3: `vitest.e2e.config.ts`** (PTY suite — sequential, slow, retried)

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/tests/ui/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    retry: 2, // replaces jest.retryTimes(2)
  },
});
```

- [ ] **Step 4: package.json scripts**

Replace the jest scripts with:

```json
"test": "vitest --run",
"test:coverage": "vitest --coverage --run",
"e2e": "vitest --run --config vitest.e2e.config.ts",
"e2e:gen": "vitest --run --config vitest.e2e.config.ts",
```

Remove the `watchman: false` note (was in `jest.config.cjs`, now deleted).

- [ ] **Step 5: Delete jest configs**

```bash
git rm jest.config.cjs jest.e2e.config.cjs
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "build: add vitest config and scripts, remove jest"
```

_(Tests won't pass yet — the test files still use jest APIs; that's Task 3.)_

---

## Task 3: vitest — migrate test files + snapshots

**Files:** Modify all `src/tests/**/*.test.ts` + `src/tests/ui/helpers.ts`; regenerate `src/tests/**/__snapshots__/*.snap`

- [ ] **Step 1: Global jest→vitest API sweep**

Across `src/tests/**`:

- Remove `import { jest } from "@jest/globals";` (vitest provides `describe/test/expect` as globals; import `vi` from `"vitest"` where mocking is used).
- `jest.fn` → `vi.fn`, `jest.clearAllMocks` → `vi.clearAllMocks`, `jest.spyOn` → `vi.spyOn`.
- Remove per-test `jest.retryTimes(2, …)` in `autocomplete.test.ts` and `status.test.ts` (now handled by `retry: 2` in `vitest.e2e.config.ts`).

- [ ] **Step 2: Convert module mocks (`alias.test.ts`, `suggestionManager*.test.ts`)**

`jest.unstable_mockModule("../../runtime/utils.js", () => ({...}))` + dynamic `await import(...)` → hoisted `vi.mock`:

```ts
import { vi } from "vitest";
vi.mock("../../runtime/utils.js", () => ({
  buildExecuteShellCommand: () => mockExecuteShellCommand,
  getShellWhitespaceEscapeChar: () => "\\",
}));
vi.mock("../../utils/config.js", () => ({ getConfig: mockGetConfig }));
// hoisted mocks: define mockFns with vi.hoisted if referenced in the factory
const { mockExecuteShellCommand, mockGetConfig } = vi.hoisted(() => ({
  mockExecuteShellCommand: vi.fn(),
  mockGetConfig: vi.fn(),
}));
import { aliasExpand, loadAliases } from "../../runtime/alias.js"; // static import now
```

(vitest hoists `vi.mock`, so the dynamic-import dance jest needed is gone. Use `vi.hoisted` for factory-referenced mocks.)

- [ ] **Step 3: Regenerate snapshots under vitest**

Run: `rm-free` regen — `npm test -- -u` then `npm run e2e -- -u` (sandbox off). vitest writes its own `__snapshots__` format.
Review: `git diff --stat` — snapshot _content_ should match Phase A; only the vitest serializer header differs. Any content change beyond that must be explained.

- [ ] **Step 4: Verify unit + e2e green under vitest**

Run: `npm test` then `npm run e2e` (sandbox off).
Expected: unit 159 pass, e2e 17 pass — same as the Task 1 baseline.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "test: migrate suites from jest to vitest"
```

---

## Task 4: eslint 9 flat + prettier + header removal

**Files:** Create `eslint.config.js`; Delete `.eslintrc.cjs`; Modify all `src/**/*.ts` (+ `scripts/*`); Modify `package.json`

- [ ] **Step 1: Install eslint 9 stack, remove eslint 8**

```bash
npm install -D eslint@^9 typescript-eslint@^8 @eslint/js@^9 globals eslint-config-prettier@^9
npm uninstall -D @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-header eslint-plugin-react
```

- [ ] **Step 2: `eslint.config.js`** (flat, TypeScript — tskickstart's is JS-only, so add typescript-eslint)

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["node_modules/**", "build/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
  prettier,
);
```

- [ ] **Step 3: Delete the old config + per-file headers**

```bash
git rm .eslintrc.cjs
```

Remove the 2-line header from every source file:

```bash
# sandbox off; removes the exact 2-line MS header block
find src scripts -name "*.ts" -o -name "*.js" | while read f; do
  perl -0777 -i -pe 's{^// Copyright \(c\) Microsoft Corporation\.\n// Licensed under the MIT License\.\n\n?}{}' "$f"
done
```

(Verify with `rtk grep -rl "Copyright (c) Microsoft" src scripts` → empty. The `LICENSE` retains the notice.)

- [ ] **Step 4: package.json scripts**

```json
"lint": "eslint .",
"format": "prettier . --write",
```

- [ ] **Step 5: Fix any eslint 9 findings**

Run: `npm run lint`. Expected: clean, or a small set of real findings (e.g. the vestigial `_shell`/`_ ` params from Phase A — already underscore-prefixed, so `no-unused-vars` args should pass). Fix genuine issues; do not disable rules wholesale.

- [ ] **Step 6: Verify build still green + commit**

```bash
npm run build && npm test
git add -A && git commit -m "build: migrate to eslint 9 flat config, drop per-file license headers"
```

---

## Task 5: cspell

**Files:** Create `cspell.json`; Modify `package.json`

- [ ] **Step 1: Install + `cspell.json`**

```bash
npm install -D cspell@^8
```

```json
{
  "version": "0.2",
  "words": [
    "smartzsh",
    "smz",
    "zsh",
    "zshrc",
    "zshenv",
    "zprofile",
    "zlogin",
    "zdotdir",
    "wezterm",
    "isterm",
    "xterm",
    "inshellisense",
    "withfig",
    "napi",
    "pty",
    "commitlint",
    "cspell",
    "secretlint",
    "vitest",
    "tseslint",
    "cjs",
    "tsx",
    "jeportie",
    "nushell",
    "xonsh",
    "pwsh",
    "posix",
    "kitty",
    "unicode",
    "OSC",
    "toml",
    "ansi",
    "readline",
    "keypress",
    "cwd",
    "dotfiles",
    "reinit",
    "unpack"
  ],
  "ignorePaths": ["node_modules/**", "build/**", "coverage/**", "**/*.snap", "package-lock.json"]
}
```

- [ ] **Step 2: Script + verify**

```json
"spellcheck": "cspell --no-progress \"**/*.{js,mjs,cjs,ts,tsx,md,json,yml}\""
```

Run: `npm run spellcheck`. Add any real project words that redden it (don't whitelist typos). Commit: `chore: add cspell spellcheck`.

---

## Task 6: secretlint

**Files:** Create `.secretlintrc.json`, `.secretlintignore`; Modify `package.json`

- [ ] **Step 1: Install + config** (ported from tskickstart)

```bash
npm install -D secretlint@^8 @secretlint/secretlint-rule-preset-recommend@^8 @secretlint/secretlint-rule-pattern@^8
```

`.secretlintrc.json` (as tskickstart) + `.secretlintignore`:

```
**/.env*
**/*.snap
```

- [ ] **Step 2: Script + verify**

```json
"secretlint": "secretlint \"**/*\" --maskSecrets --secretlintignore .secretlintignore"
```

Run: `npm run secretlint`. Expected: clean. Commit: `chore: add secretlint`.

---

## Task 7: `check` bundle + typecheck

**Files:** Modify `package.json`

- [ ] **Step 1: Add scripts**

```json
"typecheck": "tsc --noEmit",
"check": "npm run lint && npm run secretlint && npm run spellcheck && npm run typecheck && npm test"
```

- [ ] **Step 2: Verify + commit**

Run: `npm run check` (sandbox off). Expected: all five stages pass. Commit: `build: add check bundle (lint+secretlint+spellcheck+typecheck+test)`.

---

## Task 8: commitlint + husky + lint-staged

**Files:** Create `commitlint.config.js`; Modify `package.json`; Fix `.husky/pre-commit`, create `.husky/commit-msg`

- [ ] **Step 1: Install**

```bash
npm install -D @commitlint/cli@^19 @commitlint/config-conventional@^19 commitlint-plugin-cspell husky@^9 lint-staged@^15
```

- [ ] **Step 2: `commitlint.config.js`** (ported from tskickstart, `type-enum`/`scope-case`/cspell rules)

Copy tskickstart's `commitlint.config.js` verbatim (it references only `@commitlint/config-conventional` + `commitlint-plugin-cspell`, both installed).

- [ ] **Step 3: husky hooks**

```bash
npx husky init      # writes prepare script + .husky/_
```

`.husky/pre-commit`:

```
npx --no lint-staged
```

`.husky/commit-msg`:

```
npx --no -- commitlint --edit "$1"
```

- [ ] **Step 4: lint-staged config** (package.json)

```json
"lint-staged": { "*.{ts,tsx}": ["eslint --fix", "prettier --write"] }
```

- [ ] **Step 5: Verify hooks fire**

- Bad message rejected: `git commit --allow-empty -m "bad message"` → commitlint fails (then discard).
- Good message + staged auto-fix: stage a file with a lint nit, commit with `chore: verify hooks` → lint-staged fixes it, commit succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "build: add commitlint, husky hooks, and lint-staged"
```

---

## Task 9: Final verification + PR

**Files:** none

- [ ] **Step 1: Full gate**

Run: `npm run check && npm run e2e` (sandbox off). Expected: all green.

- [ ] **Step 2: Residue check**

`rtk grep -rl "Copyright (c) Microsoft" src scripts` → empty. `rtk grep -rn "@jest/globals\|jest\\.\|ts-jest" src` → empty (no jest residue).

- [ ] **Step 3: Manual sanity** (`npm run try` in WezTerm still launches — tooling changes shouldn't affect runtime).

- [ ] **Step 4: PR to dev**

Use the ledger `create-pr` skill (`.agents/skills/create-pr/SKILL.md`): conventional title (`build: adopt vitest + eslint 9 + commit tooling (Phase C1)`), Description/Context body, **draft**, base `dev`, open in browser. Skip changeset/JIRA/Slack (personal repo).

---

## Self-Review Notes

- **Spec coverage:** §5.1 vitest → Tasks 2-3; §5.2 eslint+headers → Task 4; §5.3 cspell/secretlint → Tasks 5-6; §5.4 check → Task 7; §5.5 hooks → Task 8; §5.6 e2e:gen → Task 2 Step 4; §6 validation → Task 9.
- **Biggest risk (called out in spec §7):** the `vi.mock` hoisting conversion in Task 3 Step 2 — if the mock factories misbehave, the two mock-based suites fail; `vi.hoisted` is the fix.
- **Coverage** stays configured-but-off (thresholds commented) per the decision — no gate failures from coverage in C1.
