// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { parseCommand } from "../../runtime/parser.js";
import { Shell } from "../../utils/shell.js";

const testData = [
  { command: `cmd --flag value` },
  { command: `cmd --flag=value` },
  { command: `cmd --flag='value' ` },
  { command: `cmd --flag="value" ` },
  { command: `cmd 'value' ` },
  { command: `cmd value ` },
  { command: `cmd -f` },
  { command: `cmd -f=value ` },
  { command: `cmd -f value ` },
  { command: `cmd -f 'value' ` },
  { command: `cmd -f="value" ` },
  { command: `cmd -f='val` },
  { command: `cmd -f` },
  { command: `cmd -f=` },
  { command: `cmd -f ` },
  { command: `cmd` },
  { command: `cmd ` },
  { command: `cmd "value' ` },
  { command: `cmd "value" ` },
  { command: `cmd "value'\\"\\"" ` },
  { command: `cmd1 | cmd2 ` },
  { command: `cmd1 -` },
  { command: `cmd dir\\ 1/dir\\ 2/item1` },
  { command: `cmd1 "item1"item2` },
  { command: `cmd1 "item1"item2 item3` },
  { command: `cmd1 "item1"item2 "item3"` },
  { command: "`cmd1`" },
  { command: "😁" },
  { command: `` },
  { command: `   ` },
  { command: `cmd   ` },
  { command: `cmd1 | cmd2 && cmd3 ; cmd4` },
  { command: `cmd1 || cmd2 | cmd3` },
  { command: "cmd\targ" },
  { command: `cmd '' ` },
  { command: `cmd "" ` },
  { command: `cmd 'incomplete` },
  { command: `cmd "incomplete` },
  { command: `cmd --flag=` },
  { command: `cmd --flag=''` },
  { command: `cmd --flag=""` },
  { command: `cmd -f=''` },
  { command: `cmd 'hello' "world" ` },
  { command: `cmd "it's" ` },
  { command: `cmd "a"b "c"d` },
];

describe(`parseCommand`, () => {
  testData.forEach(({ command }) => {
    test(`[zsh] ${command}`, () => {
      expect(parseCommand(command, Shell.Zsh)).toMatchSnapshot();
    });
  });
});

describe(`multi-shell whitespace escaping`, () => {
  const shellEscapeData: { shell: Shell; command: string }[] = [
    { shell: Shell.Zsh, command: `cmd dir\\ name` },
  ];

  shellEscapeData.forEach(({ shell, command }) => {
    test(`[${shell}] escaped space: ${command}`, () => {
      const tokens = parseCommand(command, shell);
      expect(tokens).toMatchSnapshot();
      expect(tokens.at(-1)?.token).toContain(" ");
    });
  });
});
