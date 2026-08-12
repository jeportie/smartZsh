# Strip to `smartzsh` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the cross-platform inshellisense runtime to a lean, zsh-on-macOS autocomplete tool, personally rebranded as `smartzsh`, built and run locally with no single-executable packaging.

**Architecture:** This is a *regression-guarded refactor*, not a greenfield build. It is mostly deletion and collapse of an existing PTY-wrapped-shell + headless-xterm + `@withfig/autocomplete` runtime. We first lock the zsh path with golden-master tests, then strip in small verified increments (each ends green), then rebrand, then reduce the terminal-facing surface, verifying at every step. Behaviour for the zsh/macOS/WezTerm path is unchanged.

**Tech Stack:** TypeScript (ESM, `tsc` build), Node ≥18, jest + ts-jest (unit + snapshot), `@microsoft/shell-use` (e2e PTY harness), node-pty, `@xterm/headless`, `@withfig/autocomplete`, commander, toml/ajv.

## Global Constraints

- **Platform:** zsh on macOS only. No bash / fish / pwsh / powershell / cmd / xonsh / nushell; no Windows/Linux branches.
- **Build/run:** local `tsc` → `build/`, run via `node build/index.js` / `npm link`. No SEA packaging, no Homebrew, no release workflow.
- **Identity:** package name `smartzsh`, `"private": true`, bin `smartzsh` + `smz`. `"license": "MIT"`.
- **License:** `LICENSE` retains the existing `Copyright (c) Microsoft Corporation.` line **and** adds `Copyright (c) 2026 Jerome Portier`. Do not delete Microsoft's line.
- **Keep:** kitty keyboard protocol + xterm modifyOtherKeys output handling (WezTerm uses them). Internal `ISTERM` env var and OSC `6973` constants stay unchanged (implementation detail, not user-facing).
- **Config/data:** app folder name `smartzsh` (`~/.smartzshrc`, `$XDG_CONFIG_HOME/smartzsh/rc.toml`, data dir `smartzsh`). The zsh re-exec snippet calls `smartzsh -s zsh`.
- **Verification cadence:** `npm test` (unit + snapshot) green after **every** task; `npm run test:e2e` green at each task boundary from Task 3 onward. Record what passed. A red step pauses the queue — never skip ahead. Snapshot changes must be deliberate and correspond only to intended behaviour changes.
- **Commits:** Conventional Commits, imperative lowercase. **No `Co-Authored-By` / AI-attribution lines.** Work only on branch `support/strip-to-smartzsh`. `git commit` needs the sandbox disabled (GPG signing reads `~/.gnupg`).
- **Spec:** `docs/superpowers/specs/2026-08-12-strip-to-smartzsh-design.md`.

---

## File Structure (what changes and why)

| File | Change |
| --- | --- |
| `package.json` | Add `try` script; remove packaging/perf scripts; rebrand name/bin/author/links; `"private": true`. |
| `src/tests/utils/shell.test.ts` | Add zsh golden-master block; later trim non-zsh `getShellSourceCommand` cases + legacy tests. |
| `src/tests/ui/helpers.ts` | Reduce e2e `configs` to zsh-only. |
| `shell/` | Delete the 6 non-zsh files; keep the 4 `*.zsh`. |
| `scripts/`, `Formula/`, `.github/workflows/release.yml`, MS governance md, `.github/ISSUE_TEMPLATE/` | Delete. |
| `src/runtime/alias.ts`, `src/runtime/utils.ts` | Drop bash/git-bash; zsh-only shell-exec. |
| `src/isterm/pty.ts` | Zsh-only spawn target/args/env; drop win32 cwd sanitization. |
| `src/ui/stdioProxy.ts`, `src/utils/ansi.ts`, `src/isterm/commandManager.ts`, `src/commands/complete.ts` | Remove win32 input mode + pwsh suggestion detection; default shell zsh. |
| `src/utils/shell.ts` | Collapse per-shell switches to zsh; remove git-bash discovery; (Task 12) narrow `Shell` enum. |
| `src/utils/node.ts` | Remove SEA branches; resolve assets from package root, not cwd. |
| `src/utils/constants.ts`, `src/utils/config.ts` | Rebrand folder/rc names; drop win32 + legacy resource handling. |
| `src/commands/reinit.ts`, `src/commands/doctor.ts` (+ `ui-*`) | Drop legacy migration/detection. |
| `README.md`, `LICENSE` | Rewrite / dual-copyright. |

---

## Task 1: Baseline + `npm run try`

**Files:**
- Modify: `package.json` (`scripts`)

**Interfaces:**
- Produces: `npm run try` = build + launch the session (used for manual checkpoints in later tasks).

- [ ] **Step 1: Install deps and record the baseline**

Run: `npm ci` (or `npm install` if no lockfile changes needed), then `npm run build`, then `npm test`.
Expected: build succeeds; `npm test` passes. Note the pass count.

- [ ] **Step 2: Record the e2e baseline (informational)**

Run: `npm run test:e2e`
Expected: the **zsh** config passes. The bash/fish/other configs may fail if those shells aren't installed on this Mac — that is expected and will be removed in Task 3. Only the zsh result matters as our gate.

- [ ] **Step 3: Add the `try` script**

In `package.json` `scripts`, add:

```json
"try": "npm run build && node build/index.js"
```

- [ ] **Step 4: Verify `try` builds**

Run: `npm run build`
Expected: success (the script itself is exercised manually in WezTerm; it launches a PTY session so it can't run headless here).

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "chore: add npm run try for local manual testing"
```

---

## Task 2: Golden-master characterization tests for the zsh path

Lock current zsh behaviour of the exported helpers we will collapse, so the collapse is provably behaviour-preserving.

**Files:**
- Modify: `src/tests/utils/shell.test.ts`

**Interfaces:**
- Consumes (already exported from `src/utils/shell.ts`): `getShellConfig(shell)`, `getPathSeparator(shell)`, `getShellPromptRewrites(shell)`, `getBackspaceSequence(press, shell)`, `Shell`.

- [ ] **Step 1: Add the golden-master describe block**

Append to `src/tests/utils/shell.test.ts` (and extend the import on line 4 to include `getShellConfig, getPathSeparator, getShellPromptRewrites, getBackspaceSequence`):

```ts
import {
  getShellConfig,
  getPathSeparator,
  getShellPromptRewrites,
  getBackspaceSequence,
  getShellSourceCommand,
  hasLegacyShellConfig,
  Shell,
  shouldFlagLegacyResourcePlugin,
} from "../../utils/shell.js";

describe("zsh path (golden master)", () => {
  test("getShellConfig(zsh) re-exec snippet", () => {
    expect(getShellConfig(Shell.Zsh)).toMatchSnapshot();
  });

  test("getPathSeparator(zsh) is posix on macOS", () => {
    expect(getPathSeparator(Shell.Zsh)).toBe("/");
  });

  test("getShellPromptRewrites(zsh) is false", () => {
    expect(getShellPromptRewrites(Shell.Zsh)).toBe(false);
  });

  test("getBackspaceSequence(zsh) returns the raw key sequence", () => {
    const press = [undefined, { sequence: "" }] as unknown as Parameters<typeof getBackspaceSequence>[0];
    expect(getBackspaceSequence(press, Shell.Zsh)).toBe("");
  });
});
```

- [ ] **Step 2: Run to capture the snapshot and pass**

Run: `npm test -- src/tests/utils/shell.test.ts`
Expected: PASS; a new snapshot for `getShellConfig(zsh)` is written (it will contain `is -s zsh`; the rebrand in Task 10 updates it deliberately).

- [ ] **Step 3: Commit**

```bash
git add src/tests/utils/shell.test.ts src/tests/utils/__snapshots__/shell.test.ts.snap
git commit -m "test: add zsh-path golden-master characterization tests"
```

---

## Task 3: Reduce e2e to zsh + delete non-zsh shell integration files

Deleting `shellIntegration.bash` etc. would break their e2e configs, so reduce the e2e matrix first, in the same task.

**Files:**
- Modify: `src/tests/ui/helpers.ts:21-33`
- Delete: `shell/bash-preexec.sh`, `shell/shellIntegration.bash`, `shell/shellIntegration.fish`, `shell/shellIntegration.ps1`, `shell/shellIntegration.nu`, `shell/shellIntegration.xsh`

- [ ] **Step 1: Reduce the e2e configs to zsh**

Replace `helpers.ts` lines 21-33 (`windowsConfigs`, `unixConfigs`, `configs`) with:

```ts
const configs: ShellConfig[] = [
  { label: "zsh", shell: "zsh" },
  ...(hasOhMyZsh ? [{ label: "zsh-ohmyzsh", shell: "zsh", env: { USER_ZDOTDIR: ohmyzshFixtureDir } }] : []),
];
export { configs };
```

(Keep `hasOhMyZsh`, `ohmyzshFixtureDir`, `returnChar`, and everything else. If any test file imports `windowsConfigs`/`unixConfigs` directly, update it to `configs` — grep first: `rtk grep -n "windowsConfigs\|unixConfigs" src`.)

- [ ] **Step 2: Delete the six non-zsh shell files**

```bash
git rm shell/bash-preexec.sh shell/shellIntegration.bash shell/shellIntegration.fish shell/shellIntegration.ps1 shell/shellIntegration.nu shell/shellIntegration.xsh
```

- [ ] **Step 3: Verify unit + e2e**

Run: `npm run build && npm test`
Expected: PASS.
Run: `npm run test:e2e`
Expected: PASS (zsh only now).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: reduce e2e to zsh and remove non-zsh shell integration files"
```

---

## Task 4: Delete packaging, release, perf, and Microsoft governance

All build-time / repo-meta files, unreferenced by `src/`.

**Files:**
- Delete: `scripts/pkg.ts`, `scripts/pkg-base.ts`, `scripts/bin.js`, `scripts/perf/` (whole dir), `Formula/` (whole dir), `.github/workflows/release.yml`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `.github/ISSUE_TEMPLATE/` (whole dir)
- Modify: `package.json` (remove `package`, `package:base`, `perf`, `perf:session`, `perf:profile` scripts)

- [ ] **Step 1: Confirm nothing in `src/` imports these**

Run: `rtk grep -n "scripts/pkg\|scripts/bin\|scripts/perf\|pkg-base" src`
Expected: no results.

- [ ] **Step 2: Delete the files and dirs**

```bash
git rm scripts/pkg.ts scripts/pkg-base.ts scripts/bin.js
git rm -r scripts/perf Formula .github/ISSUE_TEMPLATE
git rm .github/workflows/release.yml CODE_OF_CONDUCT.md SECURITY.md SUPPORT.md
```

- [ ] **Step 3: Remove the dead npm scripts**

In `package.json`, delete the `package`, `package:base`, `perf`, `perf:session`, and `perf:profile` script entries. (Leave `esbuild`/other devDeps for now — dependency pruning is Phase C.)

- [ ] **Step 4: Verify**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove SEA packaging, release, perf, and Microsoft governance files"
```

---

## Task 5: Collapse `runtime/alias.ts` + `runtime/utils.ts` to zsh

**Files:**
- Modify: `src/runtime/alias.ts`, `src/runtime/utils.ts`, `src/tests/runtime/alias.test.ts`

**Interfaces:**
- Produces: `getShellWhitespaceEscapeChar()` (no args), `escapePath(value, shell)` unchanged signature, `buildExecuteShellCommand(timeout, signal?)` unchanged signature.

- [ ] **Step 1: Collapse `alias.ts`**

- Remove `loadBashAliases` (lines 16-36) and the `case Shell.Bash` arm in `loadAliases` (57-59).
- Remove `gitBashPath` from the import on line 6 and the now-unused `platform`/`os` if unused (line 9, 13). `loadAliases` keeps only the `Shell.Zsh` case.

- [ ] **Step 2: Collapse `utils.ts`**

- Remove `getExecutionShell` (17-24), `escapeArgs` (35-39), `shouldEscapeArg` (28-32), `bashSpecialCharacters` (26), and the `gitBashPath` import (line 10; keep `getPathSeparator, Shell`).
- In `buildExecuteShellCommand`, drop `executionShell`/`escapedArgs`; spawn directly:

```ts
const child = spawn(command, args ?? [], { cwd, env: { ...process.env, ...env, ISTERM: "1" }, signal });
```

- Replace the `getShellQuoteChar` switch (53-69) and `getShellWhitespaceEscapeChar` switch (71-85) with zsh constants:

```ts
const getShellQuoteChar = (): QuoteChar => `"`;
export const getShellWhitespaceEscapeChar = (): string => "\\";
```

- Update `escapePath` (87-88) to call `getShellQuoteChar()` (no arg); keep its `shell` param only if still used elsewhere (grep `escapePath(`); otherwise it's fine to keep the param unused-but-typed for now.
- Run `rtk grep -rn "getShellWhitespaceEscapeChar\|getShellQuoteChar" src` and update any callers to the no-arg signatures; `npm run build` (tsc) confirms none were missed.

- [ ] **Step 3: Update `alias.test.ts`**

- The mock on line 12 `getShellWhitespaceEscapeChar: () => "\\"` already matches the new no-arg signature — keep it.
- Change the "don't expand when aliases are disabled" test (26-38) to use `Shell.Zsh` instead of `Shell.Bash`.
- Delete the "expand on bash aliases" test (40-54). Keep "expand on zsh aliases".

- [ ] **Step 4: Verify (unit + e2e)**

Run: `npm run build && npm test`
Expected: PASS (zsh alias snapshots unchanged).
Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(runtime): collapse alias loading and shell-exec to zsh"
```

---

## Task 6: Collapse `isterm/pty.ts` to zsh

**Files:**
- Modify: `src/isterm/pty.ts`

- [ ] **Step 1: Simplify `_sanitizedCwd` (162-175)**

Keep the quote-strip (163-165) and `return cwd`. Delete both win32 blocks (167-169 git-bash drive prefix, 171-173 uppercase drive letter).

- [ ] **Step 2: Simplify `convertToPtyTarget` (432-484)**

Replace the body with the zsh-only form:

```ts
const convertToPtyTarget = async (login: boolean) => {
  const shellTarget = Shell.Zsh;
  const shellArgs: string[] = login ? ["--login"] : [];
  return { shellTarget, shellArgs };
};
```

Update the caller in `spawn` (419): `const { shellTarget, shellArgs } = await convertToPtyTarget(options.login);`. Remove the now-unused `gitBashPath` import.

- [ ] **Step 3: Simplify `convertToPtyEnv` (486-508)**

Remove the `case Shell.Cmd` block (495-501); keep the `Shell.Zsh` block (502-504). The function returns `{ ...env, ZDOTDIR: zdotdir(underTest), USER_ZDOTDIR: userZdotdir }` (with the ISTERM/ISTERM_TESTING/ISTERM_LOGIN env already set above). Let tsc flag any now-unused params/imports and remove them.

- [ ] **Step 4: Verify (unit + e2e)**

Run: `npm run build && npm test`
Expected: PASS.
Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 5: Manual checkpoint**

In WezTerm: `npm run try`, type `git ` and confirm suggestions render, tab/↑/↓/esc work, cwd tracking updates on `cd`. `exit` to close.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(isterm): collapse pty spawn target and env to zsh"
```

---

## Task 7: Remove win32 input mode + pwsh suggestion detection

**Files:**
- Modify: `src/utils/ansi.ts`, `src/ui/stdioProxy.ts`, `src/isterm/commandManager.ts`, `src/commands/complete.ts`, `src/tests/utils/stdioProxy.test.ts`, and any wiring found by grep (e.g. `src/ui/ui-root.ts`)

- [ ] **Step 1: `ansi.ts` — drop win32 input-mode escapes**

Delete `enableWin32InputMode` (line 29) and `disableWin32InputMode` (line 30).

- [ ] **Step 2: Find and remove the win32 wiring**

Run: `rtk grep -n "enableWin32InputMode\|disableWin32InputMode\|onWin32InputMode" src`
Remove every usage found (the writer of these escapes and the `onWin32InputMode` handler wiring, likely in `ui-root.ts` and where `StdioProxy` is constructed).

- [ ] **Step 3: `stdioProxy.ts` — keep kitty/xterm, drop win32**

- Remove `onWin32InputMode` from `StdioProxyOptions` (46-48), the `#onWin32InputMode` field (54), its constructor param/assignment (58-59).
- In `keyEncodingUpgrade` (line 17), drop the win32 alternative `\?9001([hl])|`, keeping kitty + xterm: `new RegExp("\\u001B\\[(?:\\?u|[=><][\\d;]*u|>[\\d;]*m)", "g")`. Update the comment (15) to drop "win32 input mode".
- In `partialKeyEncodingUpgrade` (line 20), drop the `9(?:0(?:0(?:1)?)?)?` win32 partial branch, keeping the rest.
- In `handleOutput` (79-84), the replace no longer needs a capture/callback:

```ts
return replaceBareLineFeeds(completeInput.replace(keyEncodingUpgrade, () => ""));
```

- [ ] **Step 4: `commandManager.ts` — drop pwsh suggestion branch (112-122)**

Remove the `if (this.#shell == Shell.Pwsh || this.#shell == Shell.Powershell) return dimItalic;` branch; the method returns `dullColor`. `dimItalic` becomes unused — remove its declaration (117). If `#shell` is now unused in the file (grep `#shell` within the file), remove the field and its assignment and the `Shell` import; otherwise leave it.

- [ ] **Step 5: `complete.ts` — default shell zsh (line 10)**

```ts
const shell = Shell.Zsh;
```

Remove the now-unused `os` import if unused.

- [ ] **Step 6: Update `stdioProxy.test.ts`**

Run: `rtk grep -n "win32\|9001\|onWin32InputMode" src/tests/utils/stdioProxy.test.ts`
Remove win32-input-mode test cases; **keep** the kitty (`[?u`, `[>1u`) and xterm (`[>4;2m`) stripping cases. If a kept case asserted a win32 side effect, adjust it to assert only that the sequence is stripped from output.

- [ ] **Step 7: Verify (unit + e2e)**

Run: `npm run build && npm test`
Expected: PASS.
Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(ui): remove win32 input mode and pwsh suggestion detection"
```

---

## Task 8: Collapse `utils/shell.ts` internals to zsh

Simplify every per-shell switch to its zsh value and remove git-bash discovery. **Keep** the `Shell` enum members (narrowed in Task 12) and keep the snippet command as `is` (rebranded in Task 10) so the Task 2 golden master stays green here.

**Files:**
- Modify: `src/utils/shell.ts`, `src/tests/utils/shell.test.ts`

- [ ] **Step 1: Remove git-bash discovery**

Delete `cachedGitBashPath` (209), `gitBashPath` (211), `getGitBashPath` (213-221), `getGitBashPaths` (223-256), and the `which` import if now unused (grep `which(` in file first).

- [ ] **Step 2: Collapse the switches to zsh**

- `getProfilePath` (115-132): `return path.join(os.homedir(), ".zshrc");` (drop the switch + `safeExec`/`find` if now unused — grep before removing).
- `getShellConfigName` (143-161): `return "init.zsh";`.
- `getShellSourceCommand` (295-320): keep only the Zsh branch → `return \`[[ -f ${posixPath} ]] && source ${posixPath}\`;` (retain `getShellInitPath`, `quotePosixPath`; drop `quotePowerShellPath` if unused).
- `getShellConfig` (322-371): keep only the Zsh branch (325-331), still using `is -s zsh` for now.
- `getBackspaceSequence` (258-259): `=> press[1].sequence;`.
- `getPathSeparator` (261): `=> path.sep;`.
- `getShellPromptRewrites` (284): `=> false;`.

Keep the `shell: Shell` params on these exported functions (their call sites pass a shell); tsc/eslint may warn unused — add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` where needed, or leave the param referenced. Do **not** narrow the enum here.

- [ ] **Step 3: Trim `shell.test.ts` non-zsh cases**

In the `getShellSourceCommand` `test.each` blocks (7-25, 27-60), keep only the `Shell.Zsh` rows; delete bash/pwsh/powershell/fish/xonsh/nushell rows. Delete the "escapes shell-specific quote characters" pwsh assertion (line 64), keep the bash→now-zsh style check by converting it to zsh, or drop it. The zsh golden master from Task 2 must still pass unchanged (still `is -s zsh`).

- [ ] **Step 4: Verify (unit + e2e)**

Run: `npm run build && npm test`
Expected: PASS, **no snapshot changes** (behaviour for zsh is identical).
Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(shell): collapse config helpers to zsh"
```

---

## Task 9: Fix resource resolution for local / linked installs

Remove SEA-only branches from `node.ts` and resolve `shell/` + fig specs from the **package root** (`import.meta.url`) instead of `process.cwd()`, so a linked `smartzsh` finds its files from any directory.

**Files:**
- Modify: `src/utils/node.ts`

**Interfaces:**
- Produces: `unpackResources(resourcesPath?)` unchanged signature; `checkUnpackedVersion()` unchanged.

- [ ] **Step 1: Add a package-root helper and drop the SEA import**

Replace `import sea from "node:sea";` and add, near the top:

```ts
import url from "node:url";
// build output is build/utils/node.js → package root is two levels up
const packageRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..");
```

- [ ] **Step 2: Delete the SEA-only code**

Remove `getAssetKeys` (16-30), `getAssetFolder`'s callers stay, `copyAssets` (57-68), `unpackNativeModules` (70-74), `permissionNativeModules` (76-83), and their calls in `unpackResources` (133-134). Keep `copyFiles`, `getAssetFolder`.

- [ ] **Step 3: Make the two unpackers unconditional and root-relative**

```ts
const unpackSpecs = async (resources: ResourcePaths): Promise<void> => {
  const autocompleteSpecFolderPath = path.join(packageRoot, "node_modules", "@withfig", "autocomplete", "build");
  const entries = await fsAsync.readdir(autocompleteSpecFolderPath, { recursive: true });
  const files = entries
    .filter((f) => fs.statSync(path.join(autocompleteSpecFolderPath, f.toString())).isFile())
    .map((f) => f.toString());
  await copyFiles("spec", files, autocompleteSpecFolderPath, resources);

  const packageJsonPath = path.join(resources.spec, "package.json");
  await fsAsync.mkdir(resources.spec, { recursive: true });
  await fsAsync.writeFile(packageJsonPath, JSON.stringify({ type: "module" }));
};

const unpackShellFiles = async (resources: ResourcePaths): Promise<void> => {
  const shellFolderPath = path.join(packageRoot, "shell");
  const files = (await fsAsync.readdir(shellFolderPath)).map((f) => path.basename(f));
  await copyFiles("shell", files, shellFolderPath, resources);
};
```

Leave `AssetType`'s `"native"` member unused-but-typed, or narrow `AssetType` to `"shell" | "spec"` and update `getAssetFolder` accordingly (tsc will guide).

- [ ] **Step 4: Verify (unit + e2e)**

Run: `npm run build && npm test`
Expected: PASS.
Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 5: Manual checkpoint — link and run from elsewhere**

```bash
npm run build && npm link
cd ~ && smartzsh init zsh   # prints the source line; should reference smartzsh init.zsh path
cd ~ && smartzsh            # launches a session from a non-repo cwd; suggestions must work
```

(`smartzsh` bin name lands in Task 10; until then test with `is`. Note this in the commit if run before Task 10.) Expected: a session starts from `~` and shell files resolve (proves root-relative resolution).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix(resources): resolve shell and spec assets from package root, drop SEA unpack"
```

---

## Task 10: Rebrand identity to `smartzsh`

**Files:**
- Modify: `package.json`, `LICENSE`, `src/utils/constants.ts`, `src/utils/config.ts`, `src/utils/shell.ts`, `src/commands/init.ts` / `doctor.ts` / `reinit.ts` / `uninstall.ts` and their `src/ui/ui-*.ts` output strings, `src/tests/utils/__snapshots__/shell.test.ts.snap`

- [ ] **Step 1: `package.json` identity**

Set `name` → `"smartzsh"`, add `"private": true`, replace `bin` with `{ "smartzsh": "./build/index.js", "smz": "./build/index.js" }`, set `author` → `{ "name": "Jerome Portier" }`, repoint `repository.url` → `"git+https://github.com/jeportie/smartZsh.git"`, set `bugs`/`homepage` to the `jeportie/smartZsh` repo (or remove). Keep `"license": "MIT"`.

- [ ] **Step 2: `LICENSE` dual copyright**

Keep the existing `Copyright (c) Microsoft Corporation.` line; add on the next line `Copyright (c) 2026 Jerome Portier`.

- [ ] **Step 3: Rename the app folder + rc file**

- `src/utils/constants.ts:8`: `const inshellisenseFolderName = "smartzsh";`
- `src/utils/config.ts:101`: `const rcFile = ".smartzshrc";`

- [ ] **Step 4: Rebrand the re-exec snippet (`shell.ts` getShellConfig zsh branch)**

Change `is -s zsh --login` and `is -s zsh` to `smartzsh -s zsh --login` and `smartzsh -s zsh`.

- [ ] **Step 5: Rebrand user-facing command text**

Run: `rtk grep -rn "inshellisense" src` and update help strings, doctor/init/reinit/uninstall output, and any `is ` command references in printed text to `smartzsh`. (Do **not** touch the internal `ISTERM` env var or OSC constants.)

- [ ] **Step 6: Update the golden-master snapshot deliberately**

Run: `npm test -- src/tests/utils/shell.test.ts -u`
Review the snapshot diff: it must show **only** `is ` → `smartzsh ` in the zsh snippet. Then run `npm test` (no `-u`) to confirm green.

- [ ] **Step 7: Verify (unit + e2e)**

Run: `npm run build && npm test && npm run test:e2e`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: rebrand inshellisense to smartzsh"
```

---

## Task 11: Drop inshellisense legacy-resource handling

Remove the `~/.inshellisense` migration/detection cruft (meaningless for a fresh smartzsh) and the win32 XDG guards.

**Files:**
- Modify: `src/utils/constants.ts`, `src/utils/shell.ts`, `src/commands/reinit.ts` (+ `src/ui/ui-reinit.ts`), `src/commands/doctor.ts` (+ `src/ui/ui-doctor.ts`), `src/tests/utils/shell.test.ts`

- [ ] **Step 1: `constants.ts` — drop legacy + win32**

- `resolveXdgConfigHome` (10-12): drop the `platform !== "win32"` guard → `return value != null && path.isAbsolute(value) ? value : undefined;` (drop the `platform` param).
- `resolveXdgDataHome` (14-17): drop the win32 early-return → `return value != null && path.isAbsolute(value) ? value : path.join(homeDirectory, ".local", "share");`.
- `resolveResourcesPath` (19-23): drop `hasLegacyResources`; `return xdgDataDirectory == null ? path.join(homeDirectory, \`.${inshellisenseFolderName}\`) : path.join(xdgDataDirectory, inshellisenseFolderName);`.
- Delete `legacyResourcesPath` (40), `usesLegacyResources` (45). Update `allResourcesPath`/`preferredResourcesPath` (43-44) to call `resolveResourcesPath(homeDirectory, xdgDataHome)`. Update the `resolveXdgConfigHome`/`resolveXdgDataHome` calls (41-42) to the new signatures.

- [ ] **Step 2: `shell.ts` — drop legacy detection**

- `getShellInitPath` (289-293): drop the `usesLegacyResources ? ... :` branch → always `path.join(initResourcesPath, shell, configName)`. Remove the `usesLegacyResources` import (line 12).
- Delete `checkLegacyConfigs` (69-80), `shouldFlagLegacyResourcePlugin` (82), `hasLegacyShellConfig` (84-91).

- [ ] **Step 3: Update callers**

Run: `rtk grep -rn "checkLegacyConfigs\|hasLegacyShellConfig\|shouldFlagLegacyResourcePlugin\|usesLegacyResources" src`
In `reinit`/`ui-reinit` remove the legacy-migration step (reinit becomes: recreate configs + unpackResources). In `doctor`/`ui-doctor` remove the legacy-config warning. Simplify wording to match.

- [ ] **Step 4: Update `shell.test.ts`**

Delete the `describe("hasLegacyShellConfig")` (68-84) and `describe("shouldFlagLegacyResourcePlugin")` (86-94) blocks, and remove those names from the import (line 4). Keep the zsh golden master and the (now zsh-only) `getShellSourceCommand` tests.

- [ ] **Step 5: Verify (unit + e2e)**

Run: `npm run build && npm test && npm run test:e2e`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: drop inshellisense legacy-resource migration and win32 xdg guards"
```

---

## Task 12: Narrow the `Shell` enum to zsh

Final source collapse — do this only after Tasks 5-11, when nothing references a non-zsh member.

**Files:**
- Modify: `src/utils/shell.ts`

- [ ] **Step 1: Confirm no non-zsh references remain**

Run: `rtk grep -rn "Shell\.\(Bash\|Powershell\|Pwsh\|Fish\|Cmd\|Xonsh\|Nushell\)" src`
Expected: no results (if any, fix them first).

- [ ] **Step 2: Narrow the enum + collections**

```ts
export enum Shell {
  Zsh = "zsh",
}

export const supportedShells = [Shell.Zsh];
export const initSupportedShells = [Shell.Zsh];
export const aliasSupportedShells = [Shell.Zsh];
```

- [ ] **Step 3: Simplify `inferShell` (180-207)**

Replace the multi-shell detection body with `return Shell.Zsh;` (the tool only supports zsh; the re-exec snippet always passes `-s zsh` anyway). Remove now-unused imports (`find`, `findParentProcess`) if unused — tsc will flag.

- [ ] **Step 4: Verify (unit + e2e)**

Run: `npm run build && npm test && npm run test:e2e`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(shell): narrow Shell enum to zsh"
```

---

## Task 13: Rewrite the README for `smartzsh`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the README**

Write a smartzsh-focused README: one-line description; **Requirements** (macOS, zsh, WezTerm); **Install** (`git clone`, `npm ci`, `npm run build`, `npm link`); **Enable in zsh** (`smartzsh init zsh >> ~/.zshrc`); **Usage** + **Keybindings** table (tab/↑/↓/esc); **Configuration** (`~/.smartzshrc` or `$XDG_CONFIG_HOME/smartzsh/rc.toml`, the toml options: `bindings`, `useAliases`, `useNerdFont`, `maxSuggestions`, `activeSuggestionBackgroundColor`); a **Development** section documenting `npm run try`, `npm test`, `npm run test:e2e`; and an **Attribution** note (fork of microsoft/inshellisense, MIT). Remove all multi-shell/multi-OS, CLA, and trademark sections.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for smartzsh"
```

---

## Task 14: Final verification + acceptance checklist

**Files:** none (verification; commit only if snapshots/docs need a refresh)

- [ ] **Step 1: Full automated suite**

Run: `npm run build && npm test && npm run test:e2e`
Expected: all green.

- [ ] **Step 2: Residue grep**

Run: `rtk grep -rn "inshellisense\|win32\|gitBash\|Powershell\|Nushell\|Xonsh" src`
Expected: only intentional matches (e.g. `ISTERM`-internal names are fine; there should be no `inshellisense` user-facing strings, no win32/other-shell logic).

- [ ] **Step 3: Manual smoke test in WezTerm**

`npm run try` (or the linked `smartzsh`): confirm suggestions render, tab accepts, ↑/↓ navigate, esc dismisses, cwd updates on `cd`, `smartzsh init zsh` prints a clean snippet, and a fresh shell with that snippet re-execs into smartzsh.

- [ ] **Step 4: Walk the spec's acceptance criteria (§4)**

Tick each box in `docs/superpowers/specs/2026-08-12-strip-to-smartzsh-design.md`. If any fails, fix in a dedicated follow-up task.

- [ ] **Step 5: Commit any final snapshot/doc refresh (if needed)**

```bash
git add -A
git commit -m "test: refresh snapshots after strip-down"
```

---

## Self-review notes

- **Spec coverage:** deletions (§5.1) → Tasks 3-4; collapses (§5.2) → Tasks 5-9, 11-12; rebrand (§5.3) → Task 10, 13; dev-run command (§5.4) → Task 1; validation (§6) → Task 2 baseline + per-task gates + Task 14; risks (§7) mitigated by golden masters + per-step e2e. **Spec refinement:** §5.2 said `node.ts unpackResources` was "dead"; it is not — its local branch populates resources, so Task 9 keeps it (SEA branches removed) and fixes the base path. The spec's node.ts row will be updated to match.
- **Enum-narrowing ordering:** Task 12 is gated by a grep proving no non-zsh references remain, guaranteeing it compiles.
- **Snapshot discipline:** the only intended snapshot change is `is `→`smartzsh ` in Task 10 Step 6.
