# Phase C2 — CI/CD & release

- **Date:** 2026-08-12
- **Status:** Approved design → spec review
- **Branch:** `feat/phase-c2-cicd` (from `dev`, after C1 merged)
- **Scope:** Phase C2 (Phase C = C1 local tooling ✅ + C2 CI/release). Completes Phase C.

## 1. Goal

Add GitHub Actions CI + automated releases for smartzsh, matching the tskickstart conventions and wiring
the gates the Phase D agents expect. Smartzsh is **macOS-only** and **`private: true`** (unpublished), so
the workflows are adapted accordingly.

## 2. Non-goals (deferred)

- Agent crew import → **Phase D**. Features → **Phase E**.
- npm publishing (package is private). No nightly/verify e2e tier (smartzsh's PTY e2e is fast — ~25s — and
  runs on every PR).

## 3. Decisions (confirmed)

- **Release:** semantic-release on `main` → version + release notes (changelog) + GitHub Release + git tag.
  **No npm publish.** ✔
- **CI runners:** the `check` gate on **ubuntu-latest** (fast/cheap; darwin-only tests self-skip); the PTY
  **e2e on macos-latest** (needs a real zsh + node-pty). ✔
- **Branch protection:** configured via `gh api` on `dev` + `main` (require the PR checks + 1 approving
  review; no direct pushes). ✔

## 4. Detailed changes

### 4.1 `.github/workflows/pull-request-checks.yml` (replaces `ci.yml`)

- Trigger: `pull_request` to `dev` + `main` (`opened`, `synchronize`); concurrency-cancel.
- Job **`checks`** (ubuntu-latest): checkout → setup-node (`.nvmrc`, npm cache) → `npm ci` → `npm run check`
  (lint + secretlint + spellcheck + typecheck + test) → coverage report comment (`davelosert/vitest-coverage-report-action`).
- Job **`e2e`** (macos-latest): checkout → setup-node → `npm ci` → `npm run build` → `npm link` →
  `node build/index.js init zsh` (populates the data dir) → `npm run e2e`.
- Delete the stale `ci.yml` (Phase-A 3-OS jest matrix).

### 4.2 `.github/workflows/release.yml`

- Trigger: `push` to `main`.
- Job **`gate`** (macos-latest, so it also covers e2e): `npm ci` → build → link → init → `npm run check` → `npm run e2e`.
- Job **`release`** (needs `gate`, ubuntu-latest): checkout `fetch-depth: 0` → setup-node → `npm ci` →
  `npx --no semantic-release`. Perms: `contents: write`, `issues: write`, `pull-requests: write`. Only `GITHUB_TOKEN`.

### 4.3 `release.config.mjs`

- `branches: ["main"]`, `tagFormat: "v${version}"`, `preset: "conventionalcommits"`.
- Plugins: `@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`,
  `[@semantic-release/npm, { npmPublish: false }]` (computes version, no publish),
  `@semantic-release/github` (Release + tag). **No `@semantic-release/git`** — avoids committing back to
  protected `main`; the changelog lives in the GitHub Release notes.

### 4.4 Supporting files

- **`.nvmrc`**: `22` (matches the local proto node; setup-node reads it).
- **`CURRFIX.md`**: the agents' intake ledger — a short template header + empty table (used from Phase D).
- **devDeps**: `semantic-release`, `@semantic-release/commit-analyzer`, `@semantic-release/release-notes-generator`,
  `@semantic-release/npm`, `@semantic-release/github`, `conventional-changelog-conventionalcommits`.

### 4.5 Branch protection (`gh api`)

- `dev` + `main`: require the `pull-request-checks` status checks to pass, require ≥1 approving review,
  dismiss stale reviews, no force-push, no deletion. Applied via `gh api repos/jeportie/smartZsh/branches/<b>/protection`.

## 5. Validation

- Workflow YAML parses (visually + `gh workflow list` after push, or `actionlint` if available).
- The C2 PR's own `pull-request-checks` run goes green (checks on ubuntu, e2e on macos) — this is the real
  validation, watched via `gh run watch`.
- `npm run check` + `npm run e2e` still green locally (no source changes, but confirm the config files don't break lint/spellcheck).
- Branch protection visible via `gh api .../branches/dev/protection`.

## 6. Risks & mitigations

- **e2e in CI needs `smartzsh` on PATH + a populated data dir** → the e2e job does build + `npm link` +
  `init zsh` before `npm run e2e`. If PATH still doesn't resolve, prepend the npm global bin explicitly.
- **node-pty native build on the macOS runner** → node-pty ships prebuilds; `npm ci` should resolve; if not, add a build step.
- **semantic-release on protected `main`** → no `@semantic-release/git` (no push-back), so `GITHUB_TOKEN` +
  the protection rules suffice; the release job only creates a tag + GitHub Release.
- **New config words for cspell** (release.config.mjs, workflow yml) → add to `cspell.json` if the `check` reddens.

## 7. Dependency

Builds on C1 (the `check`/`e2e` scripts + hooks), now merged to `dev`. Branch from `dev`; PR back to `dev`.
Completes Phase C; Phase D (agents) can then import the crew against a working gate stack.
