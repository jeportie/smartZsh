import path from "node:path";
import url from "node:url";
import { ShellUse } from "@microsoft/shell-use";
import { trackTerminal, untrackTerminal } from "@microsoft/shell-use/test";
import type { Shell } from "@microsoft/shell-use";

export type ShellConfig = {
  label: string;
  shell: string;
  env?: Record<string, string>;
};

export const configs: ShellConfig[] = [{ label: "zsh", shell: "zsh" }];
export const returnChar = (shell: string) => (shell == "xonsh" ? "\n" : "\r");

const cleanZshFixtureDir = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "fixtures", "cleanzsh");
const buildEntry = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..", "..", "build", "index.js");

const expectTextTimeout = 30_000;
const idleTimeout = 15_000;
const promptTimeout = 20_000;
const timeouts = { text: expectTextTimeout, idle: idleTimeout };

export const expectPrompt = async (terminal: ShellUse, timeout = promptTimeout): Promise<void> => {
  await terminal.expectText(">  ", { timeout });
  await terminal.waitIdle();
};

export const closeSession = async (terminal: ShellUse | undefined): Promise<void> => {
  if (terminal) {
    await terminal.closeQuiet();
    untrackTerminal(terminal);
  }
};

// npm link installs the `smartzsh` bin alongside the node running these tests, so make it resolvable
const nodeBinDir = path.dirname(process.execPath);
const baseEnv = { ISTERM: "0", ISTERM_TESTING: "0", ZDOTDIR: cleanZshFixtureDir, PATH: `${nodeBinDir}:${process.env.PATH ?? ""}` };
const ephemeralTerminal = (): ShellUse => {
  const terminal = ShellUse.ephemeral(undefined, { timeouts });
  trackTerminal(terminal);
  return terminal;
};

export const startSession = async (config: ShellConfig, args: string[], cols = 80, rows = 30): Promise<ShellUse> => {
  const terminal = ephemeralTerminal();
  try {
    await terminal.run("node", [buildEntry, ...args], {
      cols,
      rows,
      env: { ...baseEnv, ...config.env },
      retries: 2,
    });
    await expectPrompt(terminal);
    return terminal;
  } catch (error) {
    await closeSession(terminal);
    throw error;
  }
};

export const startShell = async (shell: Shell): Promise<ShellUse> => {
  const terminal = ephemeralTerminal();
  try {
    await terminal.open({ shell, env: baseEnv, retries: 2 });
    return terminal;
  } catch (error) {
    await closeSession(terminal);
    throw error;
  }
};
