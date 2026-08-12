# INTEL — smartzsh crew lessons

Every agent reads this at startup and applies these lessons. Format: `- **[Category]**: mistake → what to do instead`. Append durable lessons here (never AI-attribution in commits).

- **[Sandbox]**: git commits, `npm ci`, `npm link`, `npm test`, `npm run e2e` fail under the tool sandbox (GPG `~/.gnupg`, resource data-dir writes, network) → run them with sandbox disabled.
- **[Data-dir staleness]**: `unpackResources` + `copyFiles` (src/utils/node.ts) SKIP files that already exist in `~/.local/share/smartzsh/` → after changing anything under `shell/` or the fig specs, `trash ~/.local/share/smartzsh` then repopulate (`npm test` runs `unpackResources`, or `smartzsh init zsh`). `rm -rf` is blocked → use `trash`.
- **[E2E fixture]**: the PTY e2e suite uses a clean-zsh fixture via `ZDOTDIR` (`src/tests/fixtures/cleanzsh`) so it does NOT source the user's oh-my-zsh/p10k `~/.zshrc` → deterministic + ~8x faster. Run Vitest sequentially (`fileParallelism:false`) — coverage/PTY share temp state.
- **[E2E / git specs]**: git-spec generators list files from the committed HEAD tree, so an uncommitted `git rm` still shows up as a suggestion and breaks tab-completion e2e → commit deletions before trusting e2e.
- **[CI Gate]**: the `davelosert/vitest-coverage-report-action` needs `coverage/coverage-summary.json`, which plain `vitest --run` does NOT emit → the `checks` job runs the stages separately ending in `npm run test:coverage`, not `npm run check`.
- **[Merge Gate]**: agents open **draft** PRs to `dev` and STOP at the human gate. Never `gh pr merge`; never `git merge` into `dev`/`main`.
- **[TDD]**: one failing test first (watch it fail for the RIGHT reason), minimal green, then refactor — never write implementation before a red test.
- **[Requirements Fidelity]**: build exactly what the CF/acceptance criteria state — no unrequested features, no scope drift; when in doubt, ask.
- **[Scope Control]**: one branch = one concern; if a fix reveals adjacent work, file a new CF rather than widening the branch.
