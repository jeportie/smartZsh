// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import path from "node:path";
import url from "node:url";
import fsAsync from "node:fs/promises";
import fs from "node:fs";
import { allResourcesPath, getResourcePaths, versionResourcePath } from "./constants.js";
import { getVersion } from "./version.js";

// build output is build/utils/node.js → package root is two levels up (works for npm link too)
const packageRoot = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..", "..");

type AssetType = "shell" | "spec";
type ResourcePaths = ReturnType<typeof getResourcePaths>;

const getAssetFolder = (assetType: AssetType, resources: ResourcePaths) => {
  switch (assetType) {
    case "shell":
      return resources.shell;
    case "spec":
      return resources.spec;
    default:
      return "";
  }
};

const copyFiles = async (assetType: AssetType, files: string[], sourceFolder: string, resources: ResourcePaths) => {
  await Promise.all(
    files.map(async (file) => {
      const sourcePath = path.join(sourceFolder, file);
      const destPath = path.join(getAssetFolder(assetType, resources), file);
      if (fs.existsSync(destPath)) return;
      await fsAsync.mkdir(path.dirname(destPath), { recursive: true });
      await fsAsync.copyFile(sourcePath, destPath);
    }),
  );
};

const unpackSpecs = async (resources: ResourcePaths): Promise<void> => {
  const autocompleteSpecFolderPath = path.join(packageRoot, "node_modules", "@withfig", "autocomplete", "build");
  const entries = await fsAsync.readdir(autocompleteSpecFolderPath, { recursive: true });
  const files = entries.filter((f) => fs.statSync(path.join(autocompleteSpecFolderPath, f.toString())).isFile()).map((f) => f.toString());

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

const setUnpackedVersion = async (resources: ResourcePaths): Promise<void> => {
  const version = getVersion();
  await fsAsync.writeFile(resources.version, version, "utf-8");
};

export const checkUnpackedVersion = async (): Promise<boolean> => {
  if (!fs.existsSync(versionResourcePath)) {
    return false;
  }
  const unpackedVersion = await fsAsync.readFile(versionResourcePath, "utf-8");
  const currentVersion = getVersion();
  return unpackedVersion === currentVersion;
};

export const unpackResources = async (resourcesPath = allResourcesPath): Promise<void> => {
  const resources = getResourcePaths(resourcesPath);
  await unpackShellFiles(resources);
  await unpackSpecs(resources);
  await setUnpackedVersion(resources);
};
