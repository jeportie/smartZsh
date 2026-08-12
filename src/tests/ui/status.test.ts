// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { jest } from "@jest/globals";
import type { ShellUse } from "@microsoft/shell-use/test";
import type { Shell } from "@microsoft/shell-use";
import { closeSession, startSession, startShell } from "./helpers";

const shell: Shell = "zsh";

jest.retryTimes(2, { logErrorsBeforeRetry: true });

describe("status checks", () => {
  describe("inside smartzsh session", () => {
    let terminal: ShellUse;
    beforeEach(async () => {
      terminal = await startSession({ label: "status", shell }, ["-T", "-s", shell]);
    });
    afterEach(async () => {
      await closeSession(terminal);
    });

    test("current status", async () => {
      await terminal.write("smartzsh -c\r");
      await terminal.expectText("live", { fg: "2" });
    });
  });

  describe("outside smartzsh session", () => {
    let terminal: ShellUse;
    beforeEach(async () => {
      terminal = await startShell(shell);
    });
    afterEach(async () => {
      await closeSession(terminal);
    });

    test("current status", async () => {
      await terminal.write("smartzsh -c\r");
      await terminal.expectText("not found", { fg: "1" });
    });
  });
});
