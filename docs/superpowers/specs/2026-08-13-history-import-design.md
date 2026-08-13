# History Import — Design

**Date:** 2026-08-13
**Status:** Design (user-approved defaults)
**Phase:** E — feature. Tracked as **CF-004**.

## Goal

Import the user's existing `~/.zsh_history` into smz's autocomplete: typing the start of a command recalls **whole past command lines** as suggestions (recency-ranked), instead of the dropdown only ever knowing fig specs. Today smz has **no** history feature at all.

## Context (from investigation)

- smz has zero history suggestions; `historyTemplate` (`src/runtime/template.ts:23-26`) is a TODO stub returning `[]`. The dropdown is 100% spec/alias/generator-driven.
- Entry point `getSuggestions` (`src/runtime/runtime.ts:103`) has two paths: the **command-name path** `runCommand` (`:435-463`, first token still being typed) and the spec-driven path. `runCommand` is the natural home for whole-line recall.
- The sort/dedup choke points are the `Suggestion[]` builders (`suggestion.ts`), keyed on `priority` (desc) then `removeDuplicateSuggestion` by `name`. Anything pushed in participates automatically.
- One-time load site: `initializeRuntime` (`src/runtime/initialize.ts:7-15`) — mirror `loadAliases`.
- Config lives in `src/utils/config.ts` (type `:19-33`, Ajv schema `:52-96` with **`additionalProperties:false`**, defaults `:103-116`, merge `:133-147`).
- The wrapped child zsh re-sources the user's real config (`shell/shellIntegration-*.zsh`), so `$HISTFILE` is usually present in-session, but smz's Node process never reads it.
- A latent skipped e2e exists: `src/tests/ui/autocomplete.test.ts` `test.skip("access history when no suggestions exist")`.

## Decisions (locked with user)

- **Dropdown provider** (not just an up-arrow fix). Whole-line recall.
- **Prefix match** against the typed input; **recency-ranked**; deduped (keep most recent).
- **Priority ~70** — above fig specs (40), below aliases (100).
- **Own icon** — a history/clock glyph.
- **`max` defaulted high** (load the whole history; cached so no per-keystroke cost).
- **Up-arrow inheritance (b)** — secondary: verify the wrapper isn't truncating history; fix only if broken.

## Design

### 1. `src/runtime/history.ts` (new)

- `resolveHistfile(config)`: config `path` → `process.env.HISTFILE` → `~/.zsh_history`.
- `parseHistory(raw)`: split lines; strip the `EXTENDED_HISTORY` prefix `^: \d+:\d+;` when present; join `\`-continued multi-line entries; drop blanks. Return most-recent-first, **deduped** (first occurrence from the recent end wins).
- `loadHistory(config)`: read + parse once, **cache** (mirror `generatorCache.ts`); tolerate a missing/unreadable file (return `[]`, never throw).
- `getHistorySuggestions(input, max)`: history lines that **start with** `input` (and aren't equal to it), newest-first, capped at `max`, as `Suggestion`s (`name` = full line, history icon, priority 70).

### 2. Integration (`runtime.ts`)

- In the command-name path (`runCommand`, and/or the `getSuggestions` return) merge `getHistorySuggestions(fullInput, config.history.max)` into the suggestions so past whole lines matching the typed prefix appear, deduped/sorted by the existing pipeline.
- **Key implementation risk (flag for the implementer):** a history suggestion's `name` contains spaces; selecting it must place the _entire_ line at the prompt. Verify how `SuggestionManager` applies a chosen suggestion to a multi-word `name` — use `insertValue`/`allNames` as needed so acceptance yields the full command line, not a truncated token.
- Load `history.loadHistory(getConfig())` in `initialize.ts` alongside `loadAliases`.

### 3. Config (`config.ts`, all four spots)

```
history?: { import: boolean; path?: string; max?: number }
```

Defaults: `{ import: true, max: 10000 }` (high). Declare in the Ajv schema (required because `additionalProperties:false`). Merge field-by-field.

### 4. Icon

Add a history/clock glyph to `NerdFontIcons` (verified codepoint, e.g. `nf-fa-history`/`nf-cod-history`) + a `SuggestionIcons.History` emoji fallback (🕘) for `useNerdFont=false`.

### 5. Up-arrow inheritance (secondary)

Verify inside a wrapped session whether native ↑ sees pre-smz history. If the temp `ZDOTDIR` startup loses it, ensure `HISTFILE`/`HISTSIZE`/`SAVEHIST` are set large and `fc -R` reads the real file in the shell integration. Only touch `shell/` if actually broken (remember the data-dir staleness trap → `trash ~/.local/share/smartzsh`).

## Files Touched

- Create: `src/runtime/history.ts`, `src/tests/runtime/history.test.ts`.
- Modify: `src/runtime/runtime.ts` (merge history provider), `src/runtime/initialize.ts` (load), `src/utils/config.ts` (4 spots), `src/runtime/suggestion.ts` (History icon), possibly `src/runtime/model.ts` (a `history` suggestion type).
- Tests: new history unit tests; adapt the skipped e2e; `config.test.ts` default assertion.

## Acceptance Criteria

- With a `~/.zsh_history` containing `git commit -m "x"`, typing `git c` (or `git`) surfaces that full line as a suggestion; accepting it puts the whole line at the prompt.
- Recency-ranked, deduped, capped at `max`.
- Missing/unreadable histfile → no history suggestions, no crash.
- `history.import=false` → no history suggestions (behaviour unchanged).
- `npm run check` + `npm run e2e` green.

## Verification

- **Unit** (`history.test.ts`): EXTENDED_HISTORY parse; plain-line parse; dedup keeps most recent; multi-line `\`-continued entry; prefix filter + `max` cap; missing file → `[]`.
- **E2E**: adapt `autocomplete.test.ts`'s skipped history case against a fixture histfile.

## Out of Scope

- Mid-line/argument-scoped history (the fig `template:"history"` path) beyond the command-name recall — a later enhancement of the `historyTemplate` stub.
- Fuzzy/substring history search (prefix only for v1).
- Frecency weighting (recency only for v1).
