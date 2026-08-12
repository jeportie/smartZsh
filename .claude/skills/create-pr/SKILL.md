---
name: create-pr
description: Open a pull request for the smartzsh repo using the standard description template and process — Conventional Commits, semantic-release (no changesets), the PTY e2e suite, and GitHub issues. Use when the user asks to create or open a PR.
---

# Create PR (smartzsh)

Adapted from the Ledger `create-pr` process for this repo. Differences from Ledger:
**no JIRA, no changesets, no Slack** — smartzsh uses **GitHub issues**,
**Conventional Commits**, and **semantic-release** (commit types drive the version, so
there is no changeset step).

## Gather (ask once, only for what's missing)

1. **Issue** — GitHub issue number/URL, or `N/A`.
2. **Change type** — feat | fix | docs | refactor | test | chore | ci | perf.
3. **Scope** — pty | shell | render | specs | cli | ui | e2e | ci | docs | build | agents.
4. **Description** — the problem and the solution (before/after for fixes).
5. **Test coverage** — yes | partial | no (+ why, if not full).
6. **Impact / QA focus** — which surfaces (PTY bridge, spec engine, renderer, CLI) to exercise.

## Steps

1. **Verify the branch is green** first:
   - `npm run check` (lint, secretlint, spellcheck, typecheck, test)
   - `npm run e2e` — the PTY suite (real zsh, macOS)
2. **Commits** use Conventional Commits (`<type>(<scope>): <desc>`) — they drive
   semantic-release. Do **not** add a changeset (this repo has none).
3. **Title:** `<type>(<scope>): <short description>`
   (e.g. `fix(render): clamp suggestion width to the viewport`).
4. **Body:** fill the template below.
5. **Push + open as draft** — feature work targets `dev` (`main` is release-only):
   ```bash
   git push -u origin HEAD
   gh pr create --draft --base dev --title "<title>" --body-file <body.md>
   ```

## PR body template

```markdown
<!-- Open PRs as Draft. All automated checks must pass before "Ready for review". -->

### 📝 Description

<!-- What & why. Bug fixes: previous behaviour → fix → the check that prevents regression.
     Features: problem + approach. Which surfaces (PTY / spec engine / renderer / CLI) are affected. -->

### ✅ Checklist

- [ ] `npm run check` passes (lint, secretlint, spellcheck, typecheck, test)
- [ ] `npm run e2e` passes (PTY suite, real zsh)
- [ ] **Covered by tests** <!-- explain if partial / none -->
- [ ] Docs updated if behaviour changed
- [ ] Conventional-commit types are correct (they drive the release)

### 🎯 Impact / QA focus

<!-- Which surfaces (PTY bridge, spec engine, renderer, CLI) are affected and what to exercise. -->

### 🔗 Context

- **Issue**: <!-- #123 or N/A -->

---

### 👀 For reviewers

- Code matches the linked issue / stated intent.
- Changes keep the PTY / spec engine intact — check the e2e suite in `src/tests/`.
- New behavior lives under `src/` with matching tests under `src/tests/`; the ZDOTDIR/OSC
  shell integration stays consistent.
- No undocumented trade-offs; new dependencies are justified.
```

## Notes

- Base branch is `dev` for feature work; `dev → main` is the release PR (semantic-release).
- The Ledger version's `create-changeset` and `slack-pr-message` steps are intentionally
  dropped for this repo.
