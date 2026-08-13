import { parseHistory } from "../../runtime/history.js";

describe("parseHistory", () => {
  test("returns plain lines newest-first, dropping blanks", () => {
    expect(parseHistory("echo a\n\nls\n")).toEqual(["ls", "echo a"]);
  });

  test("strips the extended-history timestamp prefix", () => {
    expect(parseHistory(": 1700000000:0;echo a\n: 1700000001:5;ls\n")).toEqual(["ls", "echo a"]);
  });
});
