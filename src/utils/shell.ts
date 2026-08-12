// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import process from "node:process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import fsAsync from "node:fs/promises";
import { shellResourcesPath, initResourcesPath, xdgConfigPath } from "./constants.js";
import { KeyPressEvent } from "../ui/suggestionManager.js";
import log from "./log.js";

export enum Shell {
  Zsh = "zsh",
}

export const supportedShells = [Shell.Zsh];
export const initSupportedShells = [Shell.Zsh];
export const aliasSupportedShells = [Shell.Zsh];

export const userZdotdir = process.env?.ZDOTDIR ?? os.homedir() ?? `~`;
export const zdotdir = (underTest: boolean) => path.join(os.tmpdir(), underTest ? `is-zsh-${process.pid}` : `is-zsh`);

export const checkShellConfigs = (): Shell[] => {
  const shellsWithoutConfigs: Shell[] = [];
  for (const shell of supportedShells) {
    const shellConfigName = getShellConfigName(shell);
    if (shellConfigName == null) continue;
    if (!fs.existsSync(path.join(initResourcesPath, shell, shellConfigName))) {
      shellsWithoutConfigs.push(shell);
    }
  }
  return shellsWithoutConfigs;
};


export const checkShellConfigPlugin = async () => {
  const shellsWithoutPlugin: Shell[] = [];
  const shellsWithBadPlugin: Shell[] = [];
  for (const shell of supportedShells) {
    const profilePath = await getProfilePath(shell);
    if (profilePath != null && fs.existsSync(profilePath)) {
      const profile = await fsAsync.readFile(profilePath, "utf8");

      const shellSourceCommand = getShellSourceCommand(shell).trim();
      const profileContainsSource = profile.includes(shellSourceCommand);
      const profileEndsWithSource = profile.trimEnd().endsWith(shellSourceCommand);

      if (!profileContainsSource) {
        shellsWithoutPlugin.push(shell);
      } else if (!profileEndsWithSource) {
        shellsWithBadPlugin.push(shell);
      }
    }
  }
  return { shellsWithoutPlugin, shellsWithBadPlugin };
};

const getProfilePath = async (shell: Shell): Promise<string | undefined> => {
  return shell === Shell.Zsh ? path.join(os.homedir(), ".zshrc") : undefined;
};

export const createShellConfigs = async (initResourcesDirectory = initResourcesPath) => {
  for (const shell of supportedShells) {
    const shellConfigName = getShellConfigName(shell);
    if (shellConfigName == null) continue;
    await fsAsync.mkdir(path.join(initResourcesDirectory, shell), { recursive: true });
    await fsAsync.writeFile(path.join(initResourcesDirectory, shell, shellConfigName), getShellConfig(shell));
  }
};

const getShellConfigName = (shell: Shell) => (shell === Shell.Zsh ? "init.zsh" : undefined);

export const setupZshDotfiles = async (underTest: boolean) => {
  const dir = zdotdir(underTest);
  await fsAsync.mkdir(dir, { recursive: true });
  await fsAsync.cp(path.join(shellResourcesPath, "shellIntegration-rc.zsh"), path.join(dir, ".zshrc"), { force: true });
  await fsAsync.cp(path.join(shellResourcesPath, "shellIntegration-profile.zsh"), path.join(dir, ".zprofile"), { force: true });
  await fsAsync.cp(path.join(shellResourcesPath, "shellIntegration-env.zsh"), path.join(dir, ".zshenv"), { force: true });
  await fsAsync.cp(path.join(shellResourcesPath, "shellIntegration-login.zsh"), path.join(dir, ".zlogin"), { force: true });
};

export const inferShell = async (): Promise<Shell | undefined> => Shell.Zsh;

export const getBackspaceSequence = (press: KeyPressEvent) => press[1].sequence;

export const getPathSeparator = (_shell: Shell) => path.sep;

export const removePathSeparator = (dir: string) => {
  return dir.endsWith("/") || dir.endsWith("\\") ? dir.slice(0, -1) : dir;
};

export const addPathSeparator = (dir: string, shell: Shell) => {
  const pathSep = getPathSeparator(shell);
  return dir.endsWith(pathSep) ? dir : dir + pathSep;
};

export const getPathDirname = (dir: string, shell: Shell) => {
  const pathSep = getPathSeparator(shell);
  return dir.endsWith(pathSep) || path.dirname(dir) == "." ? dir : addPathSeparator(path.dirname(dir), shell);
};

export const endsWithPathSeparator = (dir: string, shell: Shell) => {
  const pathSep = getPathSeparator(shell);
  return dir.endsWith(pathSep);
};

export const getShellPromptRewrites = (_shell: Shell) => false;

const quotePosixPath = (filePath: string) => `'${filePath.replaceAll("'", "'\\''")}'`;

const getShellInitPath = (shell: Shell): string | undefined => {
  const configName = getShellConfigName(shell);
  if (configName == null) return;
  return path.join(initResourcesPath, shell, configName);
};

export const getShellSourceCommand = (shell: Shell, initFilePath?: string): string => {
  const resolvedInitFilePath = initFilePath ?? getShellInitPath(shell);
  if (resolvedInitFilePath == null) return "";
  const posixPath = resolvedInitFilePath.startsWith("~/") ? resolvedInitFilePath : quotePosixPath(resolvedInitFilePath);

  return shell === Shell.Zsh ? `[[ -f ${posixPath} ]] && source ${posixPath}` : "";
};

export const getShellConfig = (shell: Shell): string => {
  switch (shell) {
    case Shell.Zsh:
      return `if [[ -z "\${ISTERM}" && $- = *i* && $- != *c* && -z "\${VSCODE_RESOLVING_ENVIRONMENT}" ]]; then
  if [[ -o login ]]; then
    smartzsh -s zsh --login ; exit
  else
    smartzsh -s zsh ; exit
  fi
fi`;
  }
  return "";
};
