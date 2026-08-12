import { vi } from "vitest";
import { Shell } from "../../utils/shell";

const { mockExecuteShellCommand, mockGetConfig } = vi.hoisted(() => ({
  mockExecuteShellCommand: vi.fn(),
  mockGetConfig: vi.fn(),
}));

vi.mock("../../runtime/utils.js", () => ({
  buildExecuteShellCommand: () => mockExecuteShellCommand,
  getShellWhitespaceEscapeChar: () => "\\",
}));

vi.mock("../../utils/config.js", () => ({
  getConfig: mockGetConfig,
}));

import { aliasExpand, loadAliases } from "../../runtime/alias.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("aliasExpand", () => {
  test("don't expand when aliases are disabled", async () => {
    mockGetConfig.mockReturnValue({ useAliases: false });
    mockExecuteShellCommand.mockReturnValue({
      stdout: `alias glo='git log --oneline'`,
      status: 0,
    });

    const { aliasExpand: aliasExpandDisabled, loadAliases: loadAliasesDisabled } = await import("../../runtime/alias.js");

    await loadAliasesDisabled(Shell.Zsh);
    // Should return the original token unchanged since aliases are disabled
    expect(aliasExpandDisabled([{ token: "glo", complete: true, isOption: false, tokenLength: 3 }])).toMatchSnapshot();
  });

  test("expand on zsh aliases", async () => {
    mockGetConfig.mockReturnValue({ useAliases: true });
    mockExecuteShellCommand.mockReturnValue({
      stdout: `glo='git log --oneline'
la='echo '\\''lo'\\'' '\\''la'\\'''
ls='ls --color=auto'`,
      status: 0,
    });

    await loadAliases(Shell.Zsh);
    expect(aliasExpand([{ token: "glo", complete: false, isOption: false, tokenLength: 3 }])).toMatchSnapshot();
    expect(aliasExpand([{ token: "la", complete: true, isOption: false, tokenLength: 2 }])).toMatchSnapshot();
    expect(aliasExpand([{ token: "git", complete: true, isOption: false, tokenLength: 3 }])).toMatchSnapshot();
    expect(aliasExpand([{ token: "ls", complete: true, isOption: false, tokenLength: 2 }])).toMatchSnapshot();
  });
});
