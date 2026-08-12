// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import path from "node:path";
import os from "node:os";

const smartzshFolderName = "smartzsh";

export const resolveXdgConfigHome = (value: string | undefined): string | undefined => {
  return value != null && path.isAbsolute(value) ? value : undefined;
};

export const resolveXdgDataHome = (value: string | undefined, homeDirectory: string): string | undefined => {
  return value != null && path.isAbsolute(value) ? value : path.join(homeDirectory, ".local", "share");
};

export const resolveResourcesPath = (homeDirectory: string, xdgDataDirectory: string | undefined): string => {
  return xdgDataDirectory == null ? path.join(homeDirectory, `.${smartzshFolderName}`) : path.join(xdgDataDirectory, smartzshFolderName);
};

export const resolveConfigFilePath = (homeDirectory: string, xdgConfigDirectory: string | undefined): string => {
  const configDirectory = xdgConfigDirectory ?? path.join(homeDirectory, ".config");
  return path.join(configDirectory, smartzshFolderName, "rc.toml");
};

export const getResourcePaths = (resourcesPath: string) => ({
  logging: path.join(resourcesPath, "log"),
  native: path.join(resourcesPath, "native"),
  shell: path.join(resourcesPath, "shell"),
  spec: path.join(resourcesPath, "spec"),
  init: path.join(resourcesPath, "init"),
  version: path.join(resourcesPath, "version.txt"),
});

const homeDirectory = os.homedir();
export const xdgConfigHome = resolveXdgConfigHome(process.env.XDG_CONFIG_HOME);
export const xdgDataHome = resolveXdgDataHome(process.env.XDG_DATA_HOME, homeDirectory);
export const preferredResourcesPath = resolveResourcesPath(homeDirectory, xdgDataHome);
export const allResourcesPath = resolveResourcesPath(homeDirectory, xdgDataHome);
export const xdgConfigPath = resolveConfigFilePath(homeDirectory, xdgConfigHome);
const resourcePaths = getResourcePaths(allResourcesPath);
export const loggingResourcesPath = resourcePaths.logging;
export const nativeResourcesPath = resourcePaths.native;
export const shellResourcesPath = resourcePaths.shell;
export const specResourcesPath = resourcePaths.spec;
export const initResourcesPath = resourcePaths.init;
export const versionResourcePath = resourcePaths.version;
