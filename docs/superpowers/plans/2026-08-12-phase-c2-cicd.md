# Phase C2 — CI/CD & Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]` checkboxes.

**Goal:** GitHub Actions CI (check on ubuntu, e2e on macOS) + semantic-release on `main` (no npm publish) + branch protection, completing Phase C.

**Tech Stack:** GitHub Actions, semantic-release 24 (conventionalcommits), the C1 `check`/`e2e` scripts.

## Global Constraints

- Branch `feat/phase-c2-cicd` off `dev` (C1 merged). No `src/**` changes.
- Commits: Conventional Commits, cspell-clean (husky commit-msg is active); commit/push need sandbox off.
- CI is validated by the PR's own run (can't run Actions locally) — watch via `gh run watch`.

---

## Task 1: `.nvmrc` + semantic-release deps

- [ ] **Step 1:** Create `.nvmrc` containing `22`.
- [ ] **Step 2:** `npm install -D semantic-release@^24 @semantic-release/commit-analyzer @semantic-release/release-notes-generator @semantic-release/npm @semantic-release/github conventional-changelog-conventionalcommits` (sandbox off).
- [ ] **Step 3:** Commit `build: add semantic-release deps and .nvmrc`.

## Task 2: `release.config.mjs`

- [ ] **Step 1:** Create (no `@semantic-release/git`, no publish):

```js
export default {
  branches: ["main"],
  tagFormat: "v${version}",
  preset: "conventionalcommits",
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/npm", { npmPublish: false }],
    "@semantic-release/github",
  ],
};
```

(the `${version}` is a semantic-release template literal — keep it literal.)

- [ ] **Step 2:** Commit `build: add semantic-release config`.

## Task 3: `pull-request-checks.yml` (replace `ci.yml`)

- [ ] **Step 1:** `git rm .github/workflows/ci.yml`.
- [ ] **Step 2:** Create `.github/workflows/pull-request-checks.yml`:

```yaml
name: Pull Request Checks
on:
  pull_request:
    branches: [dev, main]
    types: [opened, synchronize]
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
permissions:
  contents: read
  pull-requests: write
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          cache: npm
          node-version-file: .nvmrc
      - run: npm ci
      - run: npm run check
      - if: always()
        uses: davelosert/vitest-coverage-report-action@v2
  e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          cache: npm
          node-version-file: .nvmrc
      - run: npm ci
      - run: npm run build
      - run: npm link
      - run: node build/index.js init zsh
      - run: npm run e2e
```

- [ ] **Step 3:** Commit `ci: add pull-request-checks workflow, remove old ci.yml`.

## Task 4: `release.yml`

- [ ] **Step 1:** Create `.github/workflows/release.yml`:

```yaml
name: Release
on:
  push:
    branches: [main]
permissions:
  contents: write
  issues: write
  pull-requests: write
jobs:
  gate:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          cache: npm
          node-version-file: .nvmrc
      - run: npm ci
      - run: npm run build
      - run: npm link
      - run: node build/index.js init zsh
      - run: npm run check
      - run: npm run e2e
  release:
    needs: [gate]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          cache: npm
          node-version-file: .nvmrc
      - run: npm ci
      - run: npx --no semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2:** Commit `ci: add semantic-release workflow`.

## Task 5: `CURRFIX.md`

- [ ] **Step 1:** Create a short intake-ledger template:

```markdown
# CURRFIX — current fix/feature intake ledger

Tracked items for the agent crew (Phase D). One row per CF item.

| ID  | Title | Status | Branch / PR |
| --- | ----- | ------ | ----------- |
```

- [ ] **Step 2:** Commit `docs: add CURRFIX intake ledger`.

## Task 6: Local verification

- [ ] **Step 1:** `npm run check` (sandbox off) — new files must not redden lint/spellcheck. Add any yml/config words (e.g. `davelosert`, `nvmrc`, `conventionalcommits`) to `cspell.json` if flagged; re-run.
- [ ] **Step 2:** `npm run e2e` still green (no source changes, sanity).
- [ ] **Step 3:** `actionlint` if available, else eyeball the YAML. Commit any cspell fix.

## Task 7: PR + branch protection + watch CI

- [ ] **Step 1:** Push; open a **draft** PR to `dev` via the ledger `create-pr` skill (title `ci: add CI checks, semantic-release, and branch protection (Phase C2)`).
- [ ] **Step 2:** Set branch protection via `gh api` on `dev` + `main` (require `checks` + `e2e` status checks, ≥1 review, no force-push). Example:
      `gh api -X PUT repos/jeportie/smartZsh/branches/dev/protection -f 'required_status_checks[strict]=true' -f 'required_status_checks[contexts][]=checks' -f 'required_status_checks[contexts][]=e2e' -F 'enforce_admins=false' -f 'required_pull_request_reviews[required_approving_review_count]=1' -f 'restrictions=' ...` (adjust to the gh-api schema; use a JSON input if needed).
- [ ] **Step 3:** `gh run watch` the PR's `pull-request-checks` run; if a job fails, fix (most likely the macOS e2e PATH / data-dir step) and push.

## Self-Review Notes

- Spec §4.1 → Task 3; §4.2 → Task 4; §4.3 → Task 2; §4.4 → Tasks 1,5; §4.5 → Task 7. Validation §5 → Tasks 6-7.
- Biggest unknown: the macOS e2e job (PATH + data-dir + node-pty). Task 7 Step 3 iterates on the real CI run.
- semantic-release can't be fully dry-run without a `main` push; the config is validated by the release job on the first `dev→main` merge (out of C2 scope to trigger).
