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
