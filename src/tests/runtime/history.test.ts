import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { clearHistoryCache, getHistorySuggestions, loadHistory, parseHistory, resolveHistfile } from "../../runtime/history.js";
import { NerdFontIcons } from "../../runtime/suggestion.js";

describe("parseHistory", () => {
  test("returns plain lines newest-first, dropping blanks", () => {
    expect(parseHistory("echo a\n\nls\n")).toEqual(["ls", "echo a"]);
  });

  test("strips the extended-history timestamp prefix", () => {
    expect(parseHistory(": 1700000000:0;echo a\n: 1700000001:5;ls\n")).toEqual(["ls", "echo a"]);
  });

  test("dedupes commands keeping the most recent occurrence", () => {
    expect(parseHistory("ls\necho a\nls\n")).toEqual(["ls", "echo a"]);
  });

  test("joins backslash-continued lines into one entry", () => {
    expect(parseHistory("echo one\\\ntwo\n")).toEqual(["echo one\ntwo"]);
  });
});

describe("resolveHistfile", () => {
  const originalHistfile = process.env.HISTFILE;
  afterEach(() => {
    if (originalHistfile === undefined) delete process.env.HISTFILE;
    else process.env.HISTFILE = originalHistfile;
  });

  test("prefers the configured history path over the environment", () => {
    process.env.HISTFILE = "/env/histfile";
    expect(resolveHistfile({ history: { path: "/config/histfile" } })).toBe("/config/histfile");
  });

  test("falls back to the HISTFILE environment variable", () => {
    process.env.HISTFILE = "/env/histfile";
    expect(resolveHistfile({})).toBe("/env/histfile");
  });

  test("falls back to ~/.zsh_history when nothing is configured", () => {
    delete process.env.HISTFILE;
    expect(resolveHistfile({})).toBe(path.join(os.homedir(), ".zsh_history"));
  });
});

describe("loadHistory", () => {
  let tmpDir: string;
  beforeEach(() => {
    clearHistoryCache();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "smz-hist-"));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("reads and parses the history file", async () => {
    const histfile = path.join(tmpDir, "history");
    fs.writeFileSync(histfile, "echo a\nls\n");
    expect(await loadHistory({ history: { path: histfile } })).toEqual(["ls", "echo a"]);
  });

  test("returns an empty list when the file is missing", async () => {
    const histfile = path.join(tmpDir, "does-not-exist");
    expect(await loadHistory({ history: { path: histfile } })).toEqual([]);
  });

  test("caches results, returning the same list after the file is deleted", async () => {
    const histfile = path.join(tmpDir, "history");
    fs.writeFileSync(histfile, "echo a\nls\n");
    const first = await loadHistory({ history: { path: histfile } });
    fs.rmSync(histfile);
    const second = await loadHistory({ history: { path: histfile } });
    expect(second).toBe(first);
  });
});

describe("getHistorySuggestions", () => {
  let tmpDir: string;
  beforeEach(async () => {
    clearHistoryCache();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "smz-hist-"));
    const histfile = path.join(tmpDir, "history");
    fs.writeFileSync(histfile, 'ls\ngit status\ngit commit -m "x"\n');
    await loadHistory({ history: { path: histfile } });
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns matching entries newest-first", () => {
    expect(getHistorySuggestions("git", 10).map((s) => s.name)).toEqual(['git commit -m "x"', "git status"]);
  });

  test("excludes an entry exactly equal to the input", () => {
    expect(getHistorySuggestions("git status", 10)).toEqual([]);
  });

  test("caps the number of suggestions at max", () => {
    expect(getHistorySuggestions("git", 1)).toHaveLength(1);
  });

  test("builds the insertion shape with the history glyph", () => {
    expect(getHistorySuggestions("git", 10)[0]).toMatchObject({
      name: 'git commit -m "x"',
      allNames: ['git commit -m "x"'],
      insertValue: 'git commit -m "x" ',
      priority: 70,
      icon: NerdFontIcons.history,
    });
  });
});
