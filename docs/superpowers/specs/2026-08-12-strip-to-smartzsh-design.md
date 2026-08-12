# Phase A — Strip to `smartzsh`

- **Date:** 2026-08-12
- **Status:** Approved design → spec review
- **Branch:** `support/strip-to-smartzsh` (off `dev`, off `main`)
- **Scope:** Phase A only (of the A→C→D→E roadmap below)

## 1. Context & roadmap

`smartzsh` is a personal fork of [microsoft/inshellisense](https://github.com/microsoft/inshellisense),
a terminal-native autocomplete runtime (a PTY-wrapped shell + a headless xterm parser + the
`@withfig/autocomplete` spec engine). Upstream supports 8 shells across Windows/Linux/macOS. The owner
only uses **zsh on macOS in WezTerm** and wants a lean, personally-owned tool to build features on.

The full effort is decomposed into phases, each with its own spec → plan → implementation cycle:

- **Phase A — Strip down + rebrand (this spec):** reduce to zsh/macOS only, drop packaging, rename to `smartzsh`.
- **Phase C — Tooling/workflow:** `hk` (replacing husky), commitlint, CI/CD gates, align npm scripts,
  formalize the `dev` + feature-branch workflow (`CURRFIX.md`, branch protection), revisit eslint/jest →
  the familiar stack. _(The `dev` branch itself already exists — created to host Phase A work.)_
- **Phase D — Agent pipeline:** import + adapt the TDD crew (orchestrator/thinker/operator/review/quality/triage),
  skills, `settings.json`, `INTEL.md`, wired to Phase C's gates.
- **Phase E — Features:** on-the-fly/dynamic intellisense, manual hover, history-based suggestions,
  deeper config integration.

> Note on ordering: the imported agents (D) hard-require the tooling gates (C) — e.g. the `quality`
> agent runs `npm run check` / `npm run e2e:gen` and treats a missing test runner as a blocker — so C
> must precede D.

## 2. Goal

Turn the cross-platform inshellisense runtime into a lean **zsh-on-macOS** tool, personally rebranded as
**`smartzsh`**, built and run locally via `tsc` (`npm run build && npm link`) with **no** single-executable
packaging. Behaviour for the zsh/macOS/WezTerm path is unchanged; everything else is removed.

## 3. Non-goals (explicitly deferred)

- Any new tooling: `hk`, commitlint, CI gate redesign, vitest/oxlint/cspell/secretlint → **Phase C**.
- The eslint MIT-header rule rewrite + per-file header edits → **Phase C** (avoid touching every file twice).
- Importing/adapting the agent crew, skills, `settings.json`, `INTEL.md` → **Phase D**.
- History-based suggestions, dynamic intellisense, manual hover → **Phase E**.
- Renaming internal identifiers (`ISTERM` env guard, OSC `6973` constants) — kept as implementation detail.

## 4. Acceptance criteria (binary)

- [ ] No support code remains for bash / fish / pwsh / powershell / cmd / xonsh / nushell in `src/`.
- [ ] No `os.platform()` / `win32` branches remain in `shell.ts`, `pty.ts`, `runtime/utils.ts`,
      `runtime/alias.ts`, `constants.ts`, `stdioProxy.ts`, `ansi.ts`, `commandManager.ts`, `commands/complete.ts`.
- [ ] `shell/` contains only the four `*.zsh` files.
- [ ] Packaging removed: `scripts/pkg.ts`, `scripts/pkg-base.ts`, `scripts/bin.js`, `Formula/`,
      `.github/workflows/release.yml`, `scripts/perf/*`, and the corresponding npm scripts.
- [ ] MS governance removed: `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `.github/ISSUE_TEMPLATE/*`.
- [ ] `package.json`: name `smartzsh`, `"private": true`, bin `smartzsh` + `smz`, author updated, MS
      repo/bugs/homepage links removed or repointed to `jeportie/smartZsh`.
- [ ] `LICENSE` retains Microsoft's copyright line **and** adds `Copyright (c) 2026 Jerome Portier`.
- [ ] `README.md` rewritten for smartzsh / zsh + macOS + WezTerm.
- [ ] Config/data paths use `smartzsh` (`~/.smartzshrc`, `$XDG_CONFIG_HOME/smartzsh/rc.toml`); rc snippet
      re-execs `smartzsh -s zsh`.
- [ ] `npm run build` succeeds; `npm test` + e2e are green (updated to zsh-only).
- [ ] Regression baseline established: characterization tests lock the zsh/macOS path **before** stripping.
- [ ] After each atomic step, `npm test` is green; the e2e suite is green at each task boundary — evidence recorded per step.
- [ ] `npm run try` builds and launches smartzsh for manual testing; documented in the README.
- [ ] Manual smoke test passes in WezTerm (see §7).

## 5. Detailed changes

### 5.1 Files deleted outright

- **`shell/`**: `bash-preexec.sh`, `shellIntegration.bash`, `shellIntegration.fish`, `shellIntegration.ps1`,
  `shellIntegration.nu`, `shellIntegration.xsh`. Keep: `shellIntegration-{env,login,profile,rc}.zsh`.
- **Packaging**: `scripts/pkg.ts`, `scripts/pkg-base.ts`, `scripts/bin.js`, `Formula/`,
  `.github/workflows/release.yml`.
- **Perf harness**: `scripts/perf/*` and the `perf`, `perf:session`, `perf:profile` npm scripts. _(Confirmed drop; restorable from git history if missed.)_
- **MS governance**: `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `.github/ISSUE_TEMPLATE/*`.

### 5.2 Files collapsed (simplified, kept)

| File                                         | Change                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/shell.ts`                         | Collapse to zsh-only constants. Remove the 8-value `Shell` enum arms, `supportedShells`/`initSupportedShells`/`aliasSupportedShells` platform gating, Windows Git-Bash discovery (`gitBashPath`/`getGitBashPaths`), and every per-shell `switch` (`getProfilePath`, `getShellConfigName`, `getBackspaceSequence`, `getPathSeparator`, `getShellPromptRewrites`, `getShellSourceCommand`, `getShellConfig`). |
| `src/isterm/pty.ts`                          | Drop win32 cwd sanitization, and the non-zsh arms of `convertToPtyTarget` / `convertToPtyEnv` (keep the Zsh `ZDOTDIR` path).                                                                                                                                                                                                                                                                                |
| `src/runtime/utils.ts`                       | Drop `getExecutionShell` git-bash branch and the `getShellQuoteChar`/`getShellWhitespaceEscapeChar` switches; keep zsh behaviour.                                                                                                                                                                                                                                                                           |
| `src/runtime/alias.ts`                       | Remove `loadBashAliases` + dispatch; keep `loadZshAliases`.                                                                                                                                                                                                                                                                                                                                                 |
| `src/utils/constants.ts`                     | Remove `win32` guards in XDG resolution.                                                                                                                                                                                                                                                                                                                                                                    |
| `src/ui/stdioProxy.ts` + `src/utils/ansi.ts` | Remove win32 input-mode handling (`enableWin32InputMode`/`disableWin32InputMode`). **Keep** kitty/xterm handling — WezTerm relies on it.                                                                                                                                                                                                                                                                    |
| `src/isterm/commandManager.ts`               | Remove the pwsh/powershell-only inline-suggestion detection in `_isSuggestion`.                                                                                                                                                                                                                                                                                                                             |
| `src/utils/node.ts`                          | Keep `unpackResources`' local-copy logic (it populates the data dir on non-SEA installs) but remove the SEA-only branches; resolve `shell/` + fig specs from the **package root** (`import.meta.url`) instead of `process.cwd()`, so a linked install works from any directory.                                                                                                                             |
| `src/commands/complete.ts`                   | Default shell = zsh; remove `win32 ? Cmd : Bash`. Plan greps for any residual `win32`/`Cmd`/`Bash` defaults elsewhere.                                                                                                                                                                                                                                                                                      |

### 5.3 Rebrand (user-facing only)

- **`package.json`**: `name` → `smartzsh`; add `"private": true`; `bin` → `{ "smartzsh": ..., "smz": ... }`;
  `author` → Jerome Portier; repoint `repository` to `github.com/jeportie/smartZsh` (the actual origin) and
  drop/repoint `bugs`/`homepage`; update `description`; keep `"license": "MIT"`.
- **`LICENSE`**: keep the existing Microsoft copyright line (MIT requires retaining it); add
  `Copyright (c) 2026 Jerome Portier`.
- **`README.md`**: rewritten for smartzsh — zsh + macOS + WezTerm install/usage; drop the multi-shell/OS
  and CLA/trademark sections.
- **Config/data paths**: `inshellisense` → `smartzsh` (`~/.smartzshrc`, `$XDG_CONFIG_HOME/smartzsh/rc.toml`,
  data dir `smartzsh`); the zsh rc snippet re-execs `smartzsh -s zsh`.
- **Binary/command rename** `is`/`inshellisense` → `smartzsh` (+ `smz`): update the command strings in the
  zsh rc snippet and the `init`/`doctor`/`reinit`/`uninstall` command help/output and docs.

### 5.4 Dev run command (manual testing)

Add a one-command way to build and run the tool for interactive user testing:

- `npm run try` → `npm run build && node build/index.js` — builds, then launches the smartzsh session on
  the current shell. Because it takes over the TTY (PTY-wrapped zsh), run it in a real WezTerm zsh session
  (or `! npm run try` in-session).
- Document it in the README under a short **Development** section.

This is a minimal dev convenience only; the full tooling/workflow (`hk`, commitlint, CI) remains Phase C.

## 6. Validation strategy (test all the way along)

The refactor is a _collapse_ of the zsh path, so behaviour preservation is proven by tests, not asserted.

1. **Regression baseline first (golden master).** Before deleting anything, assess zsh-path coverage and
   add **characterization tests** that lock current zsh/macOS behaviour: shell-config/rc-snippet generation
   (`shell.ts`), zsh alias loading (`alias.ts`), PTY target/env construction (`pty.ts` `ZDOTDIR` path), and
   the end-to-end autocomplete flow (`src/tests/ui/autocomplete.test.ts`). This baseline is the safety net.
2. **Strip in small atomic steps, verified green each time** (sequential-delivery discipline):
   - Run `npm test` (unit + regression) after **every** change; it must be green before continuing.
   - Run the e2e suite (`npm run test:e2e`, real PTY + zsh) at **each atomic task boundary**; green before
     advancing. (e2e is slower — `maxWorkers:1`, 120s timeout — so it gates task boundaries rather than
     every keystroke-level edit.)
   - Record the evidence (what passed) per step; a failing step pauses the queue — no skipping ahead.
   - Snapshots/fixtures (`src/tests/ui/helpers.ts` `windowsConfigs`/`unixConfigs`) are updated to zsh-only;
     each snapshot change must correspond to a removed platform and nothing else.
3. **Manual checkpoints.** Run `npm run try` in WezTerm at meaningful checkpoints — verify suggestions
   render, tab/↑/↓/esc behave, cwd tracking works, and `smartzsh init zsh` re-execs cleanly in a fresh shell.

`@microsoft/shell-use` (the e2e PTY harness) stays — it is only a dev/test dependency.

## 7. Risks & mitigations

- **Collapsing `shell.ts`'s abstraction could subtly break the zsh path.** Mitigation: the §6 regression
  baseline (characterization tests) + per-step unit/e2e gating + manual `npm run try` checkpoints; collapse
  conservatively (inline zsh values, don't rewrite working logic).
- **Snapshot churn.** Deleting platforms invalidates UI/parser snapshots. Mitigation: regenerate and
  eyeball diffs; a snapshot change must correspond to a removed platform, nothing else.
- **Temporary header inconsistency.** LICENSE rebrands now but per-file MS headers + the eslint header
  rule are revised in Phase C. Accepted, tracked as a Phase C item.

## 8. Decisions (confirmed)

- Binary names: `smartzsh` (primary) + `smz` (short alias). ✔
- Drop the perf harness. ✔
- Packaging: dropped; local `tsc` build + `npm link`. ✔
- Ownership: full personal rebrand to `smartzsh`, MIT retained with both copyright lines. ✔
- Testing: regression baseline first, then strip with `npm test` green every step + e2e green every task
  boundary. ✔
- Add `npm run try` (build + run) for manual user testing. ✔
