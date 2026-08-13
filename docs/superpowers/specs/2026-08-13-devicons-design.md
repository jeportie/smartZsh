# Devicons in Autocomplete — Design

**Date:** 2026-08-13
**Status:** Design (pending user review)
**Phase:** E (feature work) — feature 1. Tracked as **CF-001**.

## Goal

Show Nerd-Font "devicons" next to autocomplete suggestions, matched to the command — e.g. a `git` subcommand shows the git glyph — by **activating and completing smartzsh's existing (but under-wired) icon system**, not building a new one.

## Context — the system already ~80% exists

- `Suggestion.icon` (`src/runtime/model.ts:3-18`) is a **required, already-resolved** display string.
- `src/runtime/suggestion.ts` has `SuggestionIcons` (emoji per type, `:13-23`), a partial `NerdFontIcons` devicon table keyed by fig icon-type (`:24-58`), and the `getIcon()` resolver (`:60-92`): spec-emoji wins → else `fig://icon?type=…` + `useNerdFont` maps into `NerdFontIcons` → else type-emoji fallback.
- `useNerdFont` config flag already exists (`src/utils/config.ts:30`, default `false`).
- **The gap:** the root command identity (`git`) is known at `getSuggestions` (`src/runtime/runtime.ts:107`, `rootToken`) but never threaded to the subcommand suggestions, so generic `git` subcommands render `📦`, never the git glyph.

## Decisions (locked with user)

- **Scope:** the command glyph reaches **subcommands** (curated command→glyph map; type-glyph fallback for unmapped commands).
- **Default:** **on** — flip `useNerdFont` default → `true`; the emoji table stays the automatic fallback.
- **Precedence:** spec-tagged specific icon → command glyph (subcommands only) → type-emoji/glyph. **Options, args, files, folders keep their own glyphs** (scannability).
- **Deferred (YAGNI):** per-filetype extension icons; a user-custom `[icons]` override map.

## Design

### 1. Command→glyph map

New `CommandIcons: Record<string, string>` in `suggestion.ts`, keyed by command **binary name** (distinct from `NerdFontIcons`, keyed by fig icon-_type_). Seed (~40 common tools): `git docker docker-compose kubectl helm terraform npm npx yarn pnpm bun deno node cargo rustc go python python3 pip ruby gem bundle java mvn gradle make cmake brew apt vim nvim ssh curl wget tar systemctl code aws gcloud az` — each → a Nerd glyph (reuse `NerdFontIcons` values where they overlap).

### 2. Thread command identity (the core gap)

- **Bare-command completion** (`runtime.ts` `runCommand`, ~`:434-462`): the suggestion `name` **is** the command → if `useNerdFont && CommandIcons[name]`, set `icon = CommandIcons[name]`.
- **Subcommands** (`getSuggestions`, ~`:130-135`, where `rootToken` + `result.suggestions` are both in scope): decorate the blob — for suggestions of `type` subcommand under a mapped root command that still carry the **generic** subcommand glyph (i.e. the spec didn't tag a specific icon), set `icon = CommandIcons[rootToken.token]`.
- Implement the decoration as a **small pure helper** `applyCommandIcon(suggestions, rootCommand, useNerdFont)` for direct unit testing.

### 3. Precedence / fallback

1. Fig spec tagged a specific icon (emoji or resolved `fig://icon?type=`) → keep it (already wins in `getIcon`).
2. Else subcommand under a mapped command → **command glyph**.
3. Else → existing type-emoji/glyph.
4. `useNerdFont=false` → unchanged (emoji everywhere).

### 4. Config

Flip the default to `true` in `config.ts` defaults (`:103-116`) and the merge (`:144`); type + Ajv schema unchanged. Emoji fallback preserved for the `false` path.

### 5. Width

The `autocomplete` e2e PTY snapshot is the oracle. Regenerate it; **only if** the PUA Nerd glyphs (`wcwidth`→1) cause column drift versus WezTerm's rendering, add a targeted width override in `src/utils/unicode.ts` for the relevant PUA ranges. CI stays deterministic — snapshots capture codepoints + table-based `wcwidth`, not pixels.

## Files Touched

- `src/runtime/suggestion.ts` — add `CommandIcons` + `applyCommandIcon` helper.
- `src/runtime/runtime.ts` — thread command identity (bare-command + subcommand decoration).
- `src/utils/config.ts` — flip `useNerdFont` default to `true`.
- `src/utils/unicode.ts` — PUA width override (**only if** the snapshot drifts).
- Tests: `src/tests/runtime/runtime.test.ts` (icon assertions incl. git-subcommand→git glyph) + `src/tests/ui/__snapshots__/autocomplete.test.ts.snap` (regenerate).

## Acceptance Criteria

- With `useNerdFont` true (new default): completing `git ␣` shows the git glyph on git subcommands; a bare-command completion of `doc` shows the docker glyph on `docker`.
- Unmapped command → suggestions keep the type-emoji/glyph (no regression).
- `useNerdFont=false` → emoji everywhere (unchanged).
- Options, args, files, folders keep their own glyphs.
- `npm run check` + `npm run e2e` green (snapshot regenerated); columns aligned (no drift).

## Verification

- **Unit** (`runtime.test.ts`): `applyCommandIcon` maps git subcommands → git glyph; leaves options/files alone; unmapped command untouched; `useNerdFont=false` path unchanged.
- **E2E:** regenerate the `autocomplete` snapshot; confirm alignment in a `smz` try-session.

## Out of Scope

- Filetype extension icons; user-custom override map; commands beyond the seed set (all easy follow-ups).
