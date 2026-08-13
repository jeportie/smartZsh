import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let historyCache: string[] | undefined;

export const resolveHistfile = (config: { history?: { path?: string } }): string => {
  return config.history?.path ?? process.env.HISTFILE ?? path.join(os.homedir(), ".zsh_history");
};

export const clearHistoryCache = (): void => {
  historyCache = undefined;
};

export const loadHistory = async (config: { history?: { path?: string } }): Promise<string[]> => {
  if (historyCache !== undefined) return historyCache;
  try {
    historyCache = parseHistory(await fs.promises.readFile(resolveHistfile(config), "utf8"));
  } catch {
    historyCache = [];
  }
  return historyCache;
};

const joinContinuations = (raw: string): string[] => {
  const logical: string[] = [];
  let buffer: string | undefined;
  for (const line of raw.split("\n")) {
    const current = buffer === undefined ? line : `${buffer}\n${line}`;
    if (current.endsWith("\\")) {
      buffer = current.slice(0, -1);
    } else {
      logical.push(current);
      buffer = undefined;
    }
  }
  if (buffer !== undefined) logical.push(buffer);
  return logical;
};

export const parseHistory = (raw: string): string[] => {
  const lines = joinContinuations(raw)
    .map((line) => line.replace(/^: \d+:\d+;/, ""))
    .filter((line) => line.length > 0)
    .reverse();
  const seen = new Set<string>();
  return lines.filter((line) => {
    if (seen.has(line)) return false;
    seen.add(line);
    return true;
  });
};
