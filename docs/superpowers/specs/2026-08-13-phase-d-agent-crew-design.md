# Phase D — Agent Crew Adaptation Design

**Date:** 2026-08-13
**Status:** Design (pending user review)
**Phase:** D of the smartzsh transformation (A ✅ → C1 ✅ → C2 ✅ → **D** → E)

## Goal

Import the TDD agent crew from `~/src/tries/2026-08-06-jeportie-tskickstart/.claude` into smartzsh and adapt every tskickstart-specific string to smartzsh's toolchain, gates, branch model, and domains — so feature work (Phase E) is built through the crew's Red-Green-Refactor + review/quality pipeline.

## Context

- smartzsh has **no `.claude/` directory** today — this is a clean import.
- smartzsh is a **TypeScript/Node CLI** (the microsoft/inshellisense fork), so tskickstart's `npm`/vitest/eslint/secretlint/cspell toolchain maps **1:1**. No shell-testing substitution is needed.
- The branch model (`dev` ← `feat|fix|support|chore/*` → PR; `main` + semantic-release; both protected; agents never `gh pr merge`) **already matches** the user's global CLAUDE.md and what C1/C2 built.
- Phase C already produced the CI gate names the crew references: **`checks`** and **`e2e`** (C2's `pull-request-checks.yml`).

## Scope Decisions (locked with user)

**Import all 6 agents:** `orchestrator`, `triage`, `thinker`, `operator`, `review`, `quality`.

- Daily drivers: thinker + operator (TDD pair), review (branch gate), quality (post-merge / pre-release gate).
- Situational: orchestrator (multi-feature coordination), triage (issue → CURRFIX intake).

**Import 2 skills (adapted):** `create-pr`, `sequential-delivery`.

**Drop (YAGNI for a solo personal tool):**

- `onboard-company` skill (Slack/Gmail/Obsidian channel setup — irrelevant).
- `upstream-fix` skill (tskickstart-_generator_-specific).
- The CI triage automation: `.github/workflows/agent-triage.yml`, `scripts/ci/labels.mjs`, `triage-router` skill, and the `AI_REVIEW_API_KEY` / `ANTHROPIC_API_KEY` repo secrets. The `triage` agent keeps a **lightweight inline routing heuristic** (do-now / queue-to-CURRFIX / human-only / reject) instead of the CI classifier + `triage:l1/l2/l3` labels.

## Target File Structure

```
smartzsh/
├── CLAUDE.md                         # NEW — lean smartzsh crew canon (defers to global for governance)
├── CURRFIX.md                        # RECONCILE — table → CF line grammar
└── .claude/
    ├── INTEL.md                      # SEED — smartzsh lessons + reusable meta-lessons
    ├── settings.json                 # ADAPT — permissions + context7 enablement
    ├── agents/
    │   ├── orchestrator.md
    │   ├── thinker.md
    │   ├── operator.md
    │   ├── review.md
    │   ├── quality.md
    │   └── triage.md
    └── skills/
        ├── create-pr/SKILL.md
        └── sequential-delivery/SKILL.md
```

## Adaptation Canon (applies to every imported file)

| Concept (tskickstart)                                           | → smartzsh                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `tskickstart`, `@jeportie/create-tskickstart`                   | `smartzsh`                                                                               |
| upstream repo `jeportie/tskickstart`                            | `jeportie/smartZsh`                                                                      |
| gate names `checks` + `e2e-gen`                                 | `checks` + **`e2e`**                                                                     |
| `npm run e2e:gen`, `node scripts/e2e/run.mjs`                   | **`npm run e2e`** (vitest e2e config)                                                    |
| `npm run test:integration`                                      | (drop — smartzsh's integration layer _is_ `e2e`)                                         |
| gate bundle                                                     | `npm run check` (lint · secretlint · spellcheck · typecheck · test) **&& `npm run e2e`** |
| CF AREA taxonomy (`PROMPTS/DB/REDIS/…`)                         | `PTY, SHELL, RENDER, SPECS, CLI, UI, E2E, CI, DOCS, BUILD, AGENTS, DX`                   |
| commit scopes (`prompts/generators/backend/…`)                  | `pty, shell, render, specs, cli, ui, e2e, ci, docs, build, agents`                       |
| operator TS standards ("never `any`", explicit types)           | **keep as-is** (smartzsh is TypeScript)                                                  |
| Context7 MCP mandate + `enabledMcpjsonServers: ["context7"]`    | **keep** (smartzsh uses node-pty/@xterm/@withfig; global rule mandates it)               |
| `rtk` prefix                                                    | **keep** (global rule)                                                                   |
| "NEVER add Co-Authored-By / AI attribution"                     | **keep** (global rule)                                                                   |
| worktree `git worktree add ../wt-<id> -b fix/cf-<n>-<slug> dev` | **keep** (branch model matches)                                                          |
| "agents never `gh pr merge`; human merges → semantic-release"   | **keep**                                                                                 |

## Per-File Adaptation Notes

### agents/orchestrator.md

Keep role/pipeline. Adapt: gate names (`e2e`), CF branch naming, worktree command, references to CLAUDE.md/CURRFIX.md. Progress board states unchanged (`PENDING → IN-PROGRESS → IN-REVIEW → AWAITING-HUMAN-MERGE → DONE/REJECTED`).

### agents/thinker.md

Mostly repo-agnostic TDD. Keep Context7 mandate. Verify-branch step references `feat/*`|`fix/*` worktree.

### agents/operator.md

Keep TS code standards verbatim (they apply). Keep Context7. Conventional-Commit messages with smartzsh scopes.

### agents/review.md

Adapt gate line to **`npm run check` and `npm run e2e`** green; diff `git diff dev...<branch>`; PR via `create-pr` skill → `gh pr create --draft --base dev`; report line `Gates: checks <PASS/FAIL>, e2e <PASS/FAIL>`. Release PR path `--base main` then STOP (triggers semantic-release). Keep `gh pr merge` denial.

### agents/quality.md

Adapt tooling list → "npm + Vitest + ESLint + secretlint + cspell + the `e2e` PTY harness". Post-merge gate: `npm run check && npm run e2e`. Pre-PR (dev→main) gate: same. Keep "coverage has not dropped significantly" (no numeric threshold — C1 decision). Embed the smartzsh e2e lesson (fileParallelism:false; clean-zsh fixture).

### agents/triage.md

Keep the local human-triggered issue→CF flow: `gh issue view <n> --json …`, next-id `grep -oE 'CF-[0-9]{3}' CURRFIX.md | sort | tail -1`, branch `git switch -c fix/cf-<n>-<slug> dev`, ack `gh issue comment`. **Inline** a minimal routing heuristic (replacing the dropped triage-router skill): reject / do-now-trivial / queue-as-CF / human-only. Use smartzsh AREA taxonomy. Labels `bug`/`enhancement`.

### skills/create-pr/SKILL.md

Adapt title scopes → smartzsh scopes; green-check commands → `npm run check` + `npm run e2e`; keep draft-PR-to-`dev` flow + `--body-file`; reviewer-notes references → smartzsh source layout (`src/`, `src/tests/`, the PTY/spec engine). Note it mirrors `.github/pull_request_template.md` (create a matching template, or drop the mirror claim if we don't add one — **decision: add a minimal PR template** so the claim holds).

### skills/sequential-delivery/SKILL.md

Light: example gates → `npm run check` + `npm run e2e`; gate names `checks`/`e2e`; crew role names unchanged.

### .claude/settings.json

`permissions.allow`: keep git (`status/diff/log/branch/checkout/switch/worktree/add/commit/restore`) + gh (`issue view/list/comment/create`, `pr create/view/diff/list`). Replace node/npm entries with smartzsh's: `npm ci`, `npm test`, `npm run:*`, `npm run build`, `npm link`, `node build/index.js:*`. `permissions.deny`: keep `gh pr merge:*`, `git push --force:*`, `git push -f:*`. Keep `enabledMcpjsonServers: ["context7"]`.

### .claude/INTEL.md

Wipe tskickstart war-stories. **Seed** with the real smartzsh lessons (already captured in the session memory `smartzsh-dev-loop`):

- `[Sandbox]` commits/tests/`npm ci`/`npm link` need sandbox off (GPG `~/.gnupg`, data-dir + network writes).
- `[Data-dir staleness]` `unpackResources`+`copyFiles` skips existing files → `trash ~/.local/share/smartzsh` after changing `shell/`.
- `[E2E fixture]` clean-zsh fixture via `ZDOTDIR` (`src/tests/fixtures/cleanzsh`) → deterministic + ~8x faster; run vitest sequentially (`fileParallelism:false`).
- `[E2E / git specs]` commit `git rm` deletions before trusting e2e (git-archive lists committed HEAD tree).
- `[CI Gate]` coverage-report action needs `coverage/coverage-summary.json` → checks job runs stages separately ending in `npm run test:coverage`, not `npm run check`.
- `[Merge Gate]` agents open draft PRs and STOP; human merges.
  Plus reusable meta-lessons carried over: `[TDD]`, `[Requirements Fidelity]`, `[Scope Control]`, `[Requirement Drift]`.

### CLAUDE.md (repo root — NEW)

Lean canon the crew reads. **Defers to the user's global CLAUDE.md** for governance (Socratic rule, branching strategy, no-AI-attribution, rtk, Context7) — encodes only smartzsh specifics:

- Identity: personal zsh autocomplete, inshellisense fork, **macOS + WezTerm + zsh only**, `private` (no npm publish).
- Stack: TS/Node 22, vitest, eslint 9 flat, cspell, secretlint, commitlint, husky, semantic-release on `main`.
- Gates: `checks` = lint · secretlint · spellcheck · typecheck · test; `e2e` = `npm run e2e` (PTY suite). Reproduce with `npm run check && npm run e2e`. New vocab → `cspell.json`.
- CF grammar + AREA taxonomy + commit scopes (below).
- Crew diagram: `you → TRIAGE → ORCHESTRATOR → THINKER+OPERATOR → REVIEW → QUALITY → you merge → semantic-release`.

### CURRFIX.md (reconcile)

Replace the C2 table with the crew's grammar under `## Reported Issues`:

```
- [ ] CF-0NN | <AREA> | <short description> | STATUS=OPEN | reported_by=<login> | GH=#<n>
```

Done-marking: `- [x] … STATUS=DONE … PR=#<n> merged to dev`.

## CF Grammar, AREA Taxonomy, Commit Scopes

- **AREA:** `PTY, SHELL, RENDER, SPECS, CLI, UI, E2E, CI, DOCS, BUILD, AGENTS, DX` (composite allowed, e.g. `UI/RENDER`).
- **Commit scopes:** `pty, shell, render, specs, cli, ui, e2e, ci, docs, build, agents`.
- **Branch prefixes:** `feat|feature/`, `fix/` (CF: `fix/cf-<n>-<slug>`), `support/`, `chore/`.

## Verification (how we know the crew is wired correctly)

This phase produces **configuration**, not application code, so verification is structural + one live smoke test:

1. **Structural:** every imported file exists at its target path; `npm run spellcheck` passes over the new `.claude/**` + `CLAUDE.md` + `CURRFIX.md` (add new vocab to `cspell.json`); no residual `tskickstart` / `e2e-gen` / `test:integration` / `scripts/e2e` strings remain (grep clean).
2. **Consistency:** every gate reference resolves to a real smartzsh script (`check`, `e2e`, `test:coverage`, `build`, `lint`, …); every path referenced by an agent exists or is explicitly a to-be-created ledger.
3. **Live smoke test:** dispatch the `triage` agent on a throwaway prompt (a fake feature request) and confirm it produces a correctly-formatted `CF-0NN` line for smartzsh (right AREA, grammar, branch name) **without** writing code or opening a PR. This exercises the CLAUDE.md + CURRFIX.md + taxonomy wiring end-to-end.

## Out of Scope

- CI triage automation (`agent-triage.yml`, `labels.mjs`, LLM classifier, API-key secrets).
- `onboard-company` and `upstream-fix` skills.
- Phase E features (history import, hover, dynamic intellisense) — the crew is the _vehicle_ for those, built next.
- Any change to the C1/C2 toolchain, workflows, or branch protection.

## Success Criteria

- All 6 agents + 2 skills + `settings.json` + `INTEL.md` present and adapted under `.claude/`; `CLAUDE.md` + reconciled `CURRFIX.md` at root.
- `grep -rIE 'tskickstart|e2e-gen|test:integration|scripts/e2e|@jeportie/create-tskickstart' .claude CLAUDE.md CURRFIX.md` returns nothing.
- `npm run check` stays green (spellcheck clean over the new files).
- The `triage` smoke test yields a valid smartzsh `CF-0NN` line.
- Merged to `dev` via a draft PR through the C2 gates.
