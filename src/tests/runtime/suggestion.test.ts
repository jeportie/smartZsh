import { applyCommandIcon, CommandIcons, NerdFontIcons, SuggestionIcons } from "../../runtime/suggestion.js";
import { Suggestion } from "../../runtime/model.js";

const sub = (o: Partial<Suggestion> = {}): Suggestion => ({
  name: "status",
  allNames: ["status"],
  icon: SuggestionIcons.Subcommand,
  priority: 50,
  type: undefined,
  ...o,
});

describe("applyCommandIcon", () => {
  test("generic subcommand under mapped command → command glyph", () => expect(applyCommandIcon([sub()], "git", true)[0].icon).toBe(NerdFontIcons.git));

  test("options/args/files/folders keep their glyph", () => {
    const inp = [
      sub({ icon: SuggestionIcons.Option }),
      sub({ icon: SuggestionIcons.Argument }),
      sub({ icon: SuggestionIcons.File, type: "file" }),
      sub({ icon: SuggestionIcons.Folder, type: "folder" }),
    ];
    expect(applyCommandIcon(inp, "git", true).map((s) => s.icon)).toEqual([
      SuggestionIcons.Option,
      SuggestionIcons.Argument,
      SuggestionIcons.File,
      SuggestionIcons.Folder,
    ]);
  });

  test("unmapped command → untouched", () => expect(applyCommandIcon([sub()], "totallyunknown", true)[0].icon).toBe(SuggestionIcons.Subcommand));

  test("useNerdFont=false → untouched", () => expect(applyCommandIcon([sub()], "git", false)[0].icon).toBe(SuggestionIcons.Subcommand));

  test("spec-tagged specific icon preserved", () => expect(applyCommandIcon([sub({ icon: "🍺" })], "git", true)[0].icon).toBe("🍺"));

  test("map seeds git & docker from the nerd-font table", () => {
    expect(CommandIcons.git).toBe(NerdFontIcons.git);
    expect(CommandIcons.docker).toBe(NerdFontIcons.docker);
  });
});
