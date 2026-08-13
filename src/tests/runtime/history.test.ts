import { parseHistory } from "../../runtime/history.js";

describe("parseHistory", () => {
  test("returns plain lines newest-first, dropping blanks", () => {
    expect(parseHistory("echo a\n\nls\n")).toEqual(["ls", "echo a"]);
  });
});
