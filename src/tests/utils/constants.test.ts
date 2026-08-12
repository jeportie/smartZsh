import path from "node:path";
import { resolveConfigFilePath, resolveResourcesPath, resolveXdgConfigHome, resolveXdgDataHome } from "../../utils/constants.js";

const homeDirectory = path.join(path.sep, "home", "tester");
const xdgConfigDirectory = path.join(path.sep, "tmp", "xdg");
const xdgDataDirectory = path.join(path.sep, "tmp", "xdg-data");

describe("resolveXdgConfigHome", () => {
  test("uses an absolute XDG config directory", () => {
    expect(resolveXdgConfigHome(xdgConfigDirectory)).toBe(xdgConfigDirectory);
  });

  test.each([undefined, "", "relative/xdg", "~/.config"])("ignores an unset, empty, or non-absolute XDG config directory", (value) => {
    expect(resolveXdgConfigHome(value)).toBeUndefined();
  });
});

describe("resolveXdgDataHome", () => {
  test("uses an absolute XDG data directory", () => {
    expect(resolveXdgDataHome(xdgDataDirectory, homeDirectory)).toBe(xdgDataDirectory);
  });

  test.each([undefined, "", "relative/xdg", "~/.local/share"])("uses the XDG default for an unset, empty, or non-absolute data directory", (value) => {
    expect(resolveXdgDataHome(value, homeDirectory)).toBe(path.join(homeDirectory, ".local", "share"));
  });
});

describe("resolveResourcesPath", () => {
  test("uses the hidden home directory without XDG_DATA_HOME", () => {
    expect(resolveResourcesPath(homeDirectory, undefined)).toBe(path.join(homeDirectory, ".smartzsh"));
  });

  test("uses an unhidden directory below XDG_DATA_HOME", () => {
    expect(resolveResourcesPath(homeDirectory, xdgDataDirectory)).toBe(path.join(xdgDataDirectory, "smartzsh"));
  });
});

describe("resolveConfigFilePath", () => {
  test("uses the XDG default below the home directory", () => {
    expect(resolveConfigFilePath(homeDirectory, undefined)).toBe(path.join(homeDirectory, ".config", "smartzsh", "rc.toml"));
  });

  test("uses XDG_CONFIG_HOME when configured", () => {
    expect(resolveConfigFilePath(homeDirectory, xdgConfigDirectory)).toBe(path.join(xdgConfigDirectory, "smartzsh", "rc.toml"));
  });
});
