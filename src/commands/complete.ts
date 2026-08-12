// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Command } from "commander";
import { Shell } from "../utils/shell.js";
import { initializeRuntime } from "../runtime/initialize.js";

const action = async (input: string) => {
  const shell = Shell.Zsh;
  const { getSuggestions } = await initializeRuntime(shell);
  const suggestions = await getSuggestions(input, process.cwd(), shell);
  process.stdout.write(JSON.stringify(suggestions));
  process.exit(0);
};

const cmd = new Command("complete");
cmd.description(`generates a completion for the provided input`);
cmd.argument("<input>");
cmd.action(action);

export default cmd;
