# smartzsh — feature backlog (Phase E)

Ideas to design & build **after** Phase A (strip + rebrand) — and the Phase C/D tooling + agents.
Each gets its own brainstorm → spec → plan when picked up.

## History (requested 2026-08-12)

1. **Keep the user's existing shell history in the session.** Today the wrapped zsh only surfaces the
   _current_ session's history — ↑ doesn't show the pre-existing `~/.zsh_history`. Most likely a
   `ZDOTDIR`/`HISTFILE`-timing interaction in the shell integration (`shell/shellIntegration-*.zsh` +
   `convertToPtyEnv`): the wrapped shell isn't loading the real HISTFILE. Needs systematic-debugging.
2. **History-based autocomplete suggestions.** Never implemented upstream: `historyTemplate()` in
   `src/runtime/template.ts` returns `[]` (stub), and `src/tests/ui/autocomplete.test.ts` has a
   `test.skip("access history when no suggestions exist")`. Design: surface recent matching commands as
   suggestions; pass ↑/↓ through to zsh history when no suggestions are showing.

## Other ideas

- Manual hover (on-demand detail for the highlighted suggestion).
- More dynamic / on-the-fly intellisense triggering.
- _(add more here as they come)_
