import { getConfig } from "../utils/config.js";
import { setupZshDotfiles, Shell } from "../utils/shell.js";

type RuntimeModule = typeof import("./runtime.js");

let runtimeInitialization: Promise<RuntimeModule> | undefined;

export const initializeRuntime = (shell: Shell, underTest = false): Promise<RuntimeModule> => {
  runtimeInitialization ??= (async () => {
    const zshSetup = shell == Shell.Zsh ? setupZshDotfiles(underTest) : Promise.resolve();
    const [runtime, alias, history] = await Promise.all([import("./runtime.js"), import("./alias.js"), import("./history.js")]);
    await Promise.all([runtime.loadLocalSpecsSet(), alias.loadAliases(shell), history.loadHistory(getConfig()), zshSetup]);
    return runtime;
  })();
  return runtimeInitialization;
};
