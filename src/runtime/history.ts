import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { getConfig } from "../utils/config.js";
import { Suggestion } from "./model.js";
import { NerdFontIcons, SuggestionIcons } from "./suggestion.js";

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

export const getHistorySuggestions = (input: string, max: number): Suggestion[] => {
  if (!input) return [];
  const icon = getConfig().useNerdFont ? NerdFontIcons.history : SuggestionIcons.History;
  const suggestions: Suggestion[] = [];
  for (const line of historyCache ?? []) {
    if (suggestions.length >= max) break;
    if (line === input || !line.startsWith(input)) continue;
    const name = line.replace(/\n/g, " ");
    suggestions.push({ name, allNames: [name], insertValue: `${name} `, icon, priority: 70 });
  }
  return suggestions;
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
