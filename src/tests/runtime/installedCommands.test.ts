import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadInstalledCommands, isInstalledCommand, resetInstalledCommands } from "../../runtime/installedCommands.js";

describe("installedCommands", () => {
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "smz-installed-"));
    fs.writeFileSync(path.join(dir, "git"), "");
    fs.writeFileSync(path.join(dir, "btop"), "");
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    resetInstalledCommands();
  });

  test("scans PATH dirs for executable names", () => {
    const set = loadInstalledCommands(dir);
    expect(set.has("git")).toBe(true);
    expect(set.has("btop")).toBe(true);
    expect(set.has("git-profile")).toBe(false); // never installed → must not appear
  });

  test("includes shell builtins even though they are not on PATH", () => {
    loadInstalledCommands(dir);
    expect(isInstalledCommand("cd")).toBe(true);
    expect(isInstalledCommand("echo")).toBe(true);
  });

  test("unreadable PATH entries are skipped, not thrown", () => {
    expect(() => loadInstalledCommands(`${dir}${path.delimiter}/no/such/dir/xyz`)).not.toThrow();
    expect(isInstalledCommand("git")).toBe(true);
  });

  test("empty PATH yields just builtins", () => {
    const set = loadInstalledCommands("");
    expect(set.has("cd")).toBe(true);
    expect(set.has("git")).toBe(false);
  });
});
