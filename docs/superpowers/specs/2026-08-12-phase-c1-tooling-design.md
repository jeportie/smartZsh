# Phase C1 — Local tooling parity with tskickstart

- **Date:** 2026-08-12
- **Status:** Approved design → spec review
- **Branch:** `feat/phase-c1-tooling` (from `dev`, after the Phase A PR merged there)
- **Scope:** Phase C1 only (Phase C = C1 local tooling + C2 CI/release)

## 1. Context & roadmap

Phase C aligns smartzsh's dev tooling to the owner's familiar stack (the
`jeportie/tskickstart` conventions), which is also what the Phase D agent crew expects
(`npm run check`, `e2e:gen`, `secretlint`, `spellcheck`). It's split into:

- **C1 — Local tooling (this spec):** vitest, eslint 9 flat, prettier, cspell, secretlint,
  commitlint, husky + lint-staged, the `check` bundle, `e2e`/`e2e:gen` scripts.
- **C2 — CI/CD & release (next spec):** macOS GitHub Actions (pull-request-checks, e2e),
  semantic-release on `main`, `CURRFIX.md`, branch protection.

## 2. Goal

Replace smartzsh's current tooling (eslint 8 + `.eslintrc.cjs` + a Microsoft-header rule, jest +
ts-jest, a broken husky hook) with the tskickstart stack, so `npm run check`, `npm test` (vitest),
and `npm run e2e` all pass locally and git hooks enforce lint-staged + conventional commits.

## 3. Non-goals (deferred)

- CI workflows, semantic-release, `CURRFIX.md`, branch protection → **C2**.
- Importing/adapting the agent crew → **Phase D**.
- Features (history, hover) → **Phase E**.

## 4. Decisions (confirmed)

- **Test runner:** migrate jest → **vitest** (full parity). ✔
- **Scope:** full tskickstart parity (C2 covers semantic-release). ✔
- **Per-file headers:** **remove** the `// Copyright (c) Microsoft Corporation.` comments from every
  src file (the `LICENSE` retains the MIT + dual-copyright notice; tskickstart has no per-file headers). ✔
- **`check`:** `lint` + `secretlint` + `spellcheck` + `typecheck` (`tsc --noEmit`) + `test`. ✔
- **Coverage:** configure v8 coverage (`test:coverage`), thresholds commented out (ratchet later). ✔

## 5. Detailed changes

### 5.1 Test → vitest
- Delete `jest.config.cjs`, `jest.e2e.config.cjs`; add `vitest.config.ts` (globals, `include: src/tests/**/*.test.ts` excluding `src/tests/ui/**`, v8 coverage with thresholds commented) and `vitest.e2e.config.ts` (only `src/tests/ui/**`, `fileParallelism: false`, `testTimeout: 120_000` — replaces `maxWorkers:1`).
- Migrate every test file: drop `@jest/globals` imports (vitest globals), `jest.fn`→`vi.fn`, `jest.unstable_mockModule`→`vi.mock`, `jest.clearAllMocks`→`vi.clearAllMocks`, `jest.retryTimes(2)`→`test.retry(2)` (or config `retry`), and regenerate snapshots (jest→vitest `.snap` format).
- `@microsoft/shell-use` stays untouched (runner-agnostic: `dependencies: {}`, its own tests use `node --test`).
- Scripts: `test` = `vitest --run`, `test:coverage` = `vitest --coverage --run`, `e2e` / `e2e:gen` = `vitest --run --config vitest.e2e.config.ts`.
- Remove `jest`, `ts-jest`, `@types/jest` devDeps and the `watchman: false` workaround (vitest doesn't use watchman). Keep the sandbox / XDG data-dir / `dirname(process.execPath)` PATH needs (carry over unchanged in the e2e helpers).

### 5.2 Lint → eslint 9 flat + prettier
- Delete `.eslintrc.cjs`; add `eslint.config.js` (flat) using `@eslint/js` + `typescript-eslint` (v8, for eslint 9) + `eslint-config-prettier`. No `eslint-plugin-header`, no `eslint-plugin-react` unless a `.tsx` actually needs it.
- Remove the per-file `// Copyright (c) Microsoft Corporation. // Licensed under the MIT License.` header from all `src/**` files.
- `lint` = `eslint .` (+ `prettier . --check` retained or folded in); `format` = `prettier . --write`.
- Bump devDeps: `eslint@^9`, `typescript-eslint@^8`, `@eslint/js@^9`, `eslint-config-prettier@^9`; drop `@typescript-eslint/*@6`, `eslint-plugin-header`, `eslint-plugin-react`.

### 5.3 Quality tools
- **cspell:** add `cspell.json` (scan `**/*.{js,mjs,cjs,ts,tsx,md,json,yml}`) + a project vocabulary (smartzsh, zsh, wezterm, zdotdir, isterm, xterm, napi, fig terms, etc.); `spellcheck` = `cspell --no-progress ...`.
- **secretlint:** add `.secretlintrc.json` (preset-recommend + pattern) + `.secretlintignore`; `secretlint` = `secretlint "**/*" --maskSecrets` (or `./src`).

### 5.4 `check` bundle
- `typecheck` = `tsc --noEmit`.
- `check` = `npm run lint && npm run secretlint && npm run spellcheck && npm run typecheck && npm test`.
- e2e stays a **separate** gate (`npm run e2e`) — slow, needs a PTY.

### 5.5 Commit hooks
- `husky` reinstated: `prepare` = `husky`. `.husky/pre-commit` = `npx --no lint-staged`; `.husky/commit-msg` = `npx --no -- commitlint --edit "$1"`.
- `lint-staged` config: `*.{ts,tsx}` → `eslint --fix` + `prettier --write`.
- `commitlint.config.js`: `@commitlint/config-conventional` (+ the cspell plugin, matching tskickstart).

### 5.6 e2e scripts
- smartzsh's PTY suite (`src/tests/ui/**`) **is** the e2e; alias both `e2e` and `e2e:gen` to it so the Phase D `quality` agent's `npm run e2e:gen` works. No gen/verify tiers (tskickstart's scaffolding harness doesn't apply here).

## 6. Validation

- `npm run check` passes (lint + secretlint + spellcheck + typecheck + unit tests via vitest).
- `npm run e2e` passes (vitest, clean-zsh fixture, ~25s).
- Commit hooks fire: a non-conventional commit message is rejected; staged files are auto-fixed.
- Same env constraints as Phase A (sandbox off for test/commit; data dir at `~/.local/share/smartzsh`).

## 7. Risks & mitigations

- **Snapshot regeneration** (jest→vitest format differs): regenerate under vitest and eyeball diffs — content should match, only the serializer header changes.
- **eslint 8→9 flat migration**: typescript-eslint v8 flat presets; verify no rule regressions on the existing src.
- **vitest mock semantics** differ slightly from jest (`vi.mock` hoisting, ESM): the two mock-based tests (`alias.test.ts`, `suggestionManager*`) may need `vi.mock` factory tweaks.
- **e2e under vitest**: shell-use is runner-agnostic, but verify `terminalSnapshot` + `toMatchSnapshot` and `test.retry` behave; sequential execution via `fileParallelism:false`.

## 8. Dependency

C1's changes build on Phase A (the stripped/rebranded smartzsh), now merged to `dev`.
