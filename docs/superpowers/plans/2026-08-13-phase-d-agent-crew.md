# Phase D — Agent Crew Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the tskickstart TDD agent crew into smartzsh and adapt every tskickstart-specific string to smartzsh's toolchain, gates, branch model, and domains.

**Architecture:** Config-only phase — no application code. Import 6 agents + 2 skills from `~/src/tries/2026-08-06-jeportie-tskickstart/.claude`, adapt via a fixed find-and-replace canon, add net-new `settings.json` / `INTEL.md` / repo-root `CLAUDE.md`, and reconcile `CURRFIX.md` to the crew's line grammar. Verification is structural (grep-clean + spellcheck + script-reference consistency) plus one live triage smoke test.

**Tech Stack:** Markdown + JSON config. Source repo: `~/src/tries/2026-08-06-jeportie-tskickstart`. Target repo: `~/src/tries/2026-08-12-jeportie-smartZsh` (branch `feat/phase-d-agent-crew`).

## Global Constraints

- **Platform/identity:** smartzsh = zsh/macOS/WezTerm only; `private` package (no npm publish); inshellisense fork.
- **Gate names:** `checks` + `e2e` (NOT `e2e-gen`). Gate bundle: `npm run check && npm run e2e`.
- **Keep verbatim:** Context7 MCP mandate, `rtk` prefix, "NEVER add Co-Authored-By / AI attribution", operator's TypeScript standards, the branch model, "agents open draft PRs and STOP — human merges; never `gh pr merge`".
- **AREA taxonomy:** `PTY, SHELL, RENDER, SPECS, CLI, UI, E2E, CI, DOCS, BUILD, AGENTS, DX`.
- **Commit scopes:** `pty, shell, render, specs, cli, ui, e2e, ci, docs, build, agents`.
- **Adaptation canon (apply to EVERY imported file):** `tskickstart`→`smartzsh`; `@jeportie/create-tskickstart`→`smartzsh`; `jeportie/tskickstart`→`jeportie/smartZsh`; `e2e-gen`→`e2e`; `npm run e2e:gen`→`npm run e2e`; `node scripts/e2e/run.mjs`→`npm run e2e`; drop `npm run test:integration`; CF AREA + scopes as above.
- **Commits:** Conventional Commits + cspell-clean; husky hooks active; run git/npm with `dangerouslyDisableSandbox: true`.
- **No residual strings:** `grep -rIE 'tskickstart|e2e-gen|test:integration|scripts/e2e|@jeportie/create-tskickstart'` over the new files must return nothing.

---

### Task 1: Scaffold `.claude/`, `settings.json`, cspell config

**Files:**

- Create: `.claude/agents/` `.claude/skills/create-pr/` `.claude/skills/sequential-delivery/` (dirs)
- Create: `.claude/settings.json`
- Modify: `cspell.json` (ignore `.claude/**`; add root-file vocab)

**Interfaces:**

- Produces: the `.claude/` tree all later tasks write into; the permission allow/deny list the crew relies on.

- [ ] **Step 1:** Create the directory tree: `.claude/agents`, `.claude/skills/create-pr`, `.claude/skills/sequential-delivery`.

- [ ] **Step 2:** Write `.claude/settings.json`:

```json
{
  "enabledMcpjsonServers": ["context7"],
  "permissions": {
    "allow": [
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)",
      "Bash(git checkout:*)",
      "Bash(git switch:*)",
      "Bash(git worktree:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git restore:*)",
      "Bash(npm ci)",
      "Bash(npm test)",
      "Bash(npm run:*)",
      "Bash(npm link)",
      "Bash(node build/index.js:*)",
      "Bash(gh issue view:*)",
      "Bash(gh issue list:*)",
      "Bash(gh issue comment:*)",
      "Bash(gh issue create:*)",
      "Bash(gh pr create:*)",
      "Bash(gh pr view:*)",
      "Bash(gh pr diff:*)",
      "Bash(gh pr list:*)"
    ],
    "deny": ["Bash(gh pr merge:*)", "Bash(git push --force:*)", "Bash(git push -f:*)"]
  }
}
```

- [ ] **Step 3:** In `cspell.json`, add `".claude/**"` to `ignorePaths` (agent/skill prose is domain-jargon-heavy; only root `CLAUDE.md` + `CURRFIX.md` stay checked). Add any root-file vocab needed (candidates: `kebab`, `OSC`, `Rodin`, `steelman`, `steelmanning`) — final set confirmed by the Step 4 spellcheck.

- [ ] **Step 4:** Verify: `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'));console.log('valid json')"` prints `valid json`; `npm run spellcheck` passes (sandbox off).

- [ ] **Step 5:** Commit `chore(agents): scaffold .claude with settings and cspell ignore`.

---

### Task 2: Repo-root `CLAUDE.md` (crew canon)

**Files:**

- Create: `CLAUDE.md`

**Interfaces:**

- Produces: the canon every agent reads (gates, branch model, CF grammar, AREA taxonomy, scopes, crew diagram).

- [ ] **Step 1:** Write `CLAUDE.md`:

```markdown
# smartzsh — Project Canon

Personal terminal autocomplete for **zsh on macOS + WezTerm** — a stripped, rebranded fork of microsoft/inshellisense. This is the crew's repo canon. For governance (Socratic Decision Rule, branch strategy, no-AI-attribution, `rtk`, Context7) it **defers to the user's global `~/.claude/CLAUDE.md`**; here it encodes only smartzsh specifics and crew wiring.

## Identity & Constraints

- **Platform:** macOS + WezTerm + zsh **only**. No cross-platform, no other shells.
- **Package:** `smartzsh` (bins `smartzsh`, `smz`), `private: true` — **never** npm-published. `main` is versioned + GitHub-released via semantic-release; never hand-edit `version`.
- **Architecture:** node-pty wraps zsh → @xterm/headless parses the stream → @withfig/autocomplete specs drive suggestions → a renderer draws them. ZDOTDIR redirection injects OSC markers; `ISTERM` guards re-exec.

## Stack

TypeScript / Node 22 (`.nvmrc`) · Vitest · ESLint 9 flat + Prettier · cspell · secretlint · commitlint + husky · semantic-release (on `main`).

## Gates

- **`checks`** = `npm run lint` · `npm run secretlint` · `npm run spellcheck` · `npm run typecheck` · `npm test` — bundled as **`npm run check`**.
- **`e2e`** = `npm run e2e` — the Vitest PTY suite (real zsh, macOS), run sequentially against a clean-zsh fixture.
- Reproduce a CI failure locally with **`npm run check && npm run e2e`**. New vocabulary → `cspell.json`.

## Branch Model

`main` (release; semantic-release) ← `dev` (integration) ← `feat|feature/<name>` · `fix/cf-<n>-<slug>` · `support/<name>` · `chore/<name>`. kebab-case, one concern per branch. `dev` + `main` are protected (required checks: `checks`, `e2e`). **Agents open draft PRs and STOP; the human merges.** Never `gh pr merge` from an agent.

## Commit Scopes

`pty · shell · render · specs · cli · ui · e2e · ci · docs · build · agents`

## Intake — CURRFIX.md

Feedback / issues become GitHub Issues → `CF-XXX` lines in `CURRFIX.md` under `## Reported Issues`:

`- [ ] CF-0NN | <AREA> | <short description> | STATUS=OPEN | reported_by=<login> | GH=#<n>`

Done: `- [x] … STATUS=DONE … PR=#<n> merged to dev`.

**AREA taxonomy:** `PTY · SHELL · RENDER · SPECS · CLI · UI · E2E · CI · DOCS · BUILD · AGENTS · DX` (composite allowed, e.g. `UI/RENDER`).

## Crew

`you → TRIAGE (issue→CF) → ORCHESTRATOR (coord) → THINKER + OPERATOR (TDD pair) → REVIEW (gate + draft PR) → QUALITY (post-merge / pre-release) → you merge → semantic-release`. Run the orchestrator as the primary session. Every agent reads `.claude/INTEL.md` at startup.
```

- [ ] **Step 2:** Verify: `npm run spellcheck` passes (add flagged words to `cspell.json`); `grep -nE 'tskickstart|e2e-gen|test:integration' CLAUDE.md` returns nothing.

- [ ] **Step 3:** Commit `docs: add repo-root CLAUDE.md crew canon`.

---

### Task 3: `.claude/INTEL.md` (seeded lessons)

**Files:**

- Create: `.claude/INTEL.md`

**Interfaces:**

- Produces: the startup lessons log every agent reads. (cspell-ignored via Task 1.)

- [ ] **Step 1:** Write `.claude/INTEL.md`:

```markdown
# INTEL — smartzsh crew lessons

Every agent reads this at startup and applies these lessons. Format: `- **[Category]**: mistake → what to do instead`. Append durable lessons here (never AI-attribution in commits).

- **[Sandbox]**: git commits, `npm ci`, `npm link`, `npm test`, `npm run e2e` fail under the tool sandbox (GPG `~/.gnupg`, resource data-dir writes, network) → run them with sandbox disabled.
- **[Data-dir staleness]**: `unpackResources` + `copyFiles` (src/utils/node.ts) SKIP files that already exist in `~/.local/share/smartzsh/` → after changing anything under `shell/` or the fig specs, `trash ~/.local/share/smartzsh` then repopulate (`npm test` runs `unpackResources`, or `smartzsh init zsh`). `rm -rf` is blocked → use `trash`.
- **[E2E fixture]**: the PTY e2e suite uses a clean-zsh fixture via `ZDOTDIR` (`src/tests/fixtures/cleanzsh`) so it does NOT source the user's oh-my-zsh/p10k `~/.zshrc` → deterministic + ~8x faster. Run Vitest sequentially (`fileParallelism:false`) — coverage/PTY share temp state.
- **[E2E / git specs]**: git-spec generators list files from the committed HEAD tree, so an uncommitted `git rm` still shows up as a suggestion and breaks tab-completion e2e → commit deletions before trusting e2e.
- **[CI Gate]**: the `davelosert/vitest-coverage-report-action` needs `coverage/coverage-summary.json`, which plain `vitest --run` does NOT emit → the `checks` job runs the stages separately ending in `npm run test:coverage`, not `npm run check`.
- **[Merge Gate]**: agents open **draft** PRs to `dev` and STOP at the human gate. Never `gh pr merge`; never `git merge` into `dev`/`main`.
- **[TDD]**: one failing test first (watch it fail for the RIGHT reason), minimal green, then refactor — never write implementation before a red test.
- **[Requirements Fidelity]**: build exactly what the CF/acceptance criteria state — no unrequested features, no scope drift; when in doubt, ask.
- **[Scope Control]**: one branch = one concern; if a fix reveals adjacent work, file a new CF rather than widening the branch.
```

- [ ] **Step 2:** Verify: file exists; `npm run spellcheck` still passes (INTEL is cspell-ignored, so this only re-confirms nothing else broke).

- [ ] **Step 3:** Commit `docs: seed .claude/INTEL.md with smartzsh lessons`.

---

### Task 4: Reconcile `CURRFIX.md` to CF line grammar

**Files:**

- Modify: `CURRFIX.md` (replace the C2 table)

**Interfaces:**

- Consumes: the CF grammar + AREA taxonomy from `CLAUDE.md` (Task 2).
- Produces: the ledger triage + orchestrator read/write.

- [ ] **Step 1:** Overwrite `CURRFIX.md`:

```markdown
# CURRFIX — current fix/feature intake ledger

Feedback and issues become `CF-XXX` lines here (via the `triage` agent). One line per item; each becomes a dedicated `fix/cf-<n>-<slug>` (or `feature/<name>`) branch → draft PR → `dev`.

Grammar: `- [ ] CF-0NN | <AREA> | <short description> | STATUS=OPEN | reported_by=<login> | GH=#<n>`
Done: `- [x] CF-0NN | <AREA> | <short description> | STATUS=DONE | reported_by=<login> | GH=#<n> | PR=#<m> merged to dev`
AREA ∈ `PTY, SHELL, RENDER, SPECS, CLI, UI, E2E, CI, DOCS, BUILD, AGENTS, DX`.

## Reported Issues

<!-- triage appends CF lines below -->
```

- [ ] **Step 2:** Verify: `npm run spellcheck` passes; `grep -c 'CF-' CURRFIX.md` shows the grammar lines only (no stale table headers).

- [ ] **Step 3:** Commit `docs: reconcile CURRFIX.md to CF line grammar`.

---

### Task 5: Import + adapt the 6 agents

**Files:**

- Create: `.claude/agents/{orchestrator,thinker,operator,review,quality,triage}.md`
- Read (source): `~/src/tries/2026-08-06-jeportie-tskickstart/.claude/agents/<name>.md`

**Interfaces:**

- Consumes: the adaptation canon (Global Constraints) + per-agent notes from the spec (`docs/superpowers/specs/2026-08-13-phase-d-agent-crew-design.md`).
- Produces: the 6 registered project agents.

For EACH agent: Read the source file, apply the canon (global find-and-replace) plus the per-agent swaps below, Write to the target path. Preserve frontmatter (`name`, `description`, `tools`, `model`, `color`) except where a swap changes a command.

- [ ] **Step 1 — orchestrator.md:** swaps: gate refs → `e2e`; keep worktree `git worktree add ../wt-<task-id> -b fix/cf-<n>-<slug> dev`; keep CLAUDE.md/CURRFIX.md reads; keep `gh pr merge` prohibition. Verify: `grep -nE 'tskickstart|e2e-gen|test:integration|scripts/e2e' .claude/agents/orchestrator.md` → empty.

- [ ] **Step 2 — thinker.md:** keep TDD body + Context7 mandate; branch-verify references `feat/*`|`fix/*`. Verify grep-clean (same pattern).

- [ ] **Step 3 — operator.md:** keep TypeScript standards verbatim + Context7; Conventional-Commit with smartzsh scopes (`pty/shell/render/specs/cli/ui/e2e/ci/docs/build/agents`). Verify grep-clean.

- [ ] **Step 4 — review.md:** gate line → "**`npm run check`** and **`npm run e2e`** are green"; diff `git diff dev...<branch>`; PR via the `create-pr` skill → `gh pr create --draft --base dev`; report line `Gates: checks <PASS/FAIL>, e2e <PASS/FAIL>`; release path `--base main` then STOP. Keep `gh pr merge` denial. Verify grep-clean.

- [ ] **Step 5 — quality.md:** tooling list → "npm + Vitest + ESLint + secretlint + cspell + the `e2e` PTY harness"; post-merge + pre-PR gate → `npm run check && npm run e2e`; keep "coverage has not dropped significantly" (no numeric threshold); embed the e2e lesson (`fileParallelism:false`, clean-zsh fixture). Verify grep-clean.

- [ ] **Step 6 — triage.md:** keep `gh issue view <n> --json …`, next-id `grep -oE 'CF-[0-9]{3}' CURRFIX.md | sort | tail -1`, branch `git switch -c fix/cf-<n>-<slug> dev`, ack `gh issue comment`. Replace the `triage-router` skill reference with an **inline** routing heuristic: `reject` (out of scope / not useful) · `do-now-trivial` (one-line, no branch) · `queue-as-CF` (normal path) · `human-only` (needs a decision). Use the smartzsh AREA taxonomy; labels `bug`/`enhancement`. Verify grep-clean (also `grep -n 'triage-router' .claude/agents/triage.md` → empty).

- [ ] **Step 7:** Full-set verify: `grep -rIE 'tskickstart|e2e-gen|test:integration|scripts/e2e|@jeportie/create-tskickstart' .claude/agents` → empty.

- [ ] **Step 8:** Commit `feat(agents): import and adapt the 6-agent TDD crew`.

---

### Task 6: Import + adapt the 2 skills

**Files:**

- Create: `.claude/skills/create-pr/SKILL.md`, `.claude/skills/sequential-delivery/SKILL.md`
- Read (source): `~/src/tries/2026-08-06-jeportie-tskickstart/.claude/skills/{create-pr,sequential-delivery}/SKILL.md`

**Interfaces:**

- Consumes: the adaptation canon.
- Produces: the PR + delivery-discipline skills the crew invokes.

- [ ] **Step 1 — create-pr:** Read source; adapt: title scopes → smartzsh scopes; green-check commands → `npm run check` + `npm run e2e`; keep draft-PR-to-`dev` flow (`git push -u origin HEAD` + `gh pr create --draft --base dev --title … --body-file …`); reviewer-notes → smartzsh source layout (`src/`, `src/tests/`, PTY/spec engine). **Make it self-contained: drop the "kept in sync with `.github/pull_request_template.md`" claim** (no separate template file — YAGNI). Verify grep-clean.

- [ ] **Step 2 — sequential-delivery:** Read source; adapt example gates → `npm run check` + `npm run e2e`; gate names `checks`/`e2e`; crew role names unchanged. Verify grep-clean.

- [ ] **Step 3:** Verify: `grep -rIE 'tskickstart|e2e-gen|test:integration|scripts/e2e|pull_request_template' .claude/skills` → empty.

- [ ] **Step 4:** Commit `feat(agents): import and adapt create-pr and sequential-delivery skills`.

---

### Task 7: Full verification, triage smoke test, PR

**Files:** (no new files — verification + PR)

- [ ] **Step 1 — grep sweep:** `grep -rIE 'tskickstart|e2e-gen|test:integration|scripts/e2e|@jeportie/create-tskickstart|agent-triage|labels\.mjs|triage-router|onboard-company|upstream-fix' .claude CLAUDE.md CURRFIX.md` → empty (confirms every dropped/renamed string is gone).

- [ ] **Step 2 — script-reference consistency:** every `npm run <x>` referenced in `.claude/**` + `CLAUDE.md` resolves to a real script in `package.json` (`check, e2e, test, test:coverage, build, lint, secretlint, spellcheck, typecheck`). Confirm via: `grep -rhoE 'npm run [a-z:]+' .claude CLAUDE.md | sort -u` cross-checked against `jq -r '.scripts|keys[]' package.json`.

- [ ] **Step 3 — gate green:** `npm run check` passes (sandbox off). (No app code changed, so `e2e` is unaffected — skip to save time; C2 CI will run it on the PR.)

- [ ] **Step 4 — live triage smoke test:** dispatch the `triage` agent (Task tool) on a throwaway request, e.g. _"feature: add a `smz doctor` subcommand that prints the resolved zsh + data-dir paths"_. Acceptance: it returns a correctly-formatted line `- [ ] CF-001 | CLI | … | STATUS=OPEN | reported_by=<login> | GH=#<n>` using a smartzsh AREA, proposes branch `fix/cf-001-…` or `feature/…`, and writes **no** application code / opens no PR. If the session has not hot-reloaded the new project agent, perform the check manually against `CLAUDE.md`'s grammar instead and note it. Do **not** commit the smoke-test CF line.

- [ ] **Step 5 — PR:** push `feat/phase-d-agent-crew`; open a **draft** PR to `dev` using the newly-adapted `.claude/skills/create-pr` skill (dogfood it). Title: `feat(agents): add the TDD agent crew (Phase D)`. Body: summary + spec/plan links + the drop list + verification evidence.

- [ ] **Step 6 — watch CI:** `gh pr checks <n> --watch`; confirm `checks` + `e2e` green. Fix forward if red.

- [ ] **Step 7:** Report PR URL + green CI; STOP at the human merge gate.

---

## Self-Review

- **Spec coverage:** all spec sections map to tasks — settings/scaffold (T1), CLAUDE.md (T2), INTEL (T3), CURRFIX (T4), 6 agents (T5), 2 skills (T6), verification + triage smoke test + PR (T7). Drops (onboard/upstream/CI-triage) are enforced by the T7 grep sweep. ✓
- **Placeholder scan:** net-new files (settings.json, CLAUDE.md, INTEL.md, CURRFIX.md) are embedded in full; adapted files specify source path + exact swaps + grep verification (not placeholders). ✓
- **Consistency:** gate names `checks`/`e2e`, AREA taxonomy, and scopes are identical across T2/T4/T5/T6/T7. ✓
- **Risk:** the only non-deterministic step is T7-Step-4 (agent hot-reload) — mitigated with a manual-verification fallback.
