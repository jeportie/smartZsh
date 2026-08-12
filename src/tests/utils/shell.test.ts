import { getShellConfig, getShellSourceCommand, Shell } from "../../utils/shell.js";

describe("getShellConfig (golden master)", () => {
  test("zsh re-exec snippet", () => {
    expect(getShellConfig(Shell.Zsh)).toMatchSnapshot();
  });
});

describe("getShellSourceCommand", () => {
  test("sources a home-relative init path", () => {
    expect(getShellSourceCommand(Shell.Zsh, "~/.local/share/smartzsh/init/zsh/init.zsh")).toBe(
      "[[ -f ~/.local/share/smartzsh/init/zsh/init.zsh ]] && source ~/.local/share/smartzsh/init/zsh/init.zsh",
    );
  });

  test("quotes an absolute path that contains spaces", () => {
    expect(getShellSourceCommand(Shell.Zsh, "/tmp/xdg home/smartzsh/init/zsh/init.zsh")).toBe(
      "[[ -f '/tmp/xdg home/smartzsh/init/zsh/init.zsh' ]] && source '/tmp/xdg home/smartzsh/init/zsh/init.zsh'",
    );
  });
});
