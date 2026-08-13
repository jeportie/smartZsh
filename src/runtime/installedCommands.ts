import fs from "node:fs";
import path from "node:path";

// zsh/bash builtins + keywords that are valid commands the user can complete, but
// never appear on $PATH — so a $PATH scan alone would wrongly drop their fig specs
// (e.g. `cd`, `echo`, `export`). Union these in so builtins survive the filter.
/* cspell:disable */
const SHELL_BUILTINS = new Set<string>([
  "cd",
  "echo",
  "printf",
  "pwd",
  "export",
  "unset",
  "alias",
  "unalias",
  "source",
  ".",
  "eval",
  "exec",
  "set",
  "shift",
  "read",
  "test",
  "type",
  "hash",
  "help",
  "pushd",
  "popd",
  "dirs",
  "jobs",
  "fg",
  "bg",
  "kill",
  "wait",
  "trap",
  "umask",
  "history",
  "fc",
  "bindkey",
  "setopt",
  "unsetopt",
  "zstyle",
  "autoload",
  "zmodload",
  "typeset",
  "declare",
  "local",
  "return",
  "true",
  "false",
  "let",
  "print",
  "printf",
  "whence",
  "command",
  "builtin",
  "enable",
  "disable",
  "getopts",
  "times",
  "ulimit",
]);
/* cspell:enable */

let installed: Set<string> | null = null;

const scanPath = (pathEnv: string | undefined): Set<string> => {
  const found = new Set<string>(SHELL_BUILTINS);
  for (const dir of (pathEnv ?? "").split(path.delimiter)) {
    if (dir === "") continue;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // PATH entries that don't exist or aren't readable are simply skipped
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) found.add(entry.name);
    }
  }
  return found;
};

// Builds (and caches) the set of command names the user can actually run: every
// executable basename on $PATH plus the shell builtins. Pass an explicit PATH for tests.
export const loadInstalledCommands = (pathEnv: string | undefined = process.env.PATH): Set<string> => {
  installed = scanPath(pathEnv);
  return installed;
};

export const getInstalledCommands = (): Set<string> => installed ?? loadInstalledCommands();

export const isInstalledCommand = (cmd: string): boolean => getInstalledCommands().has(cmd);

// test hook — forces the next lookup to re-scan
export const resetInstalledCommands = (): void => {
  installed = null;
};
