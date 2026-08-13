import os from "node:os";
import path from "node:path";

import { parseHistory, resolveHistfile } from "../../runtime/history.js";

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
