---
name: release
description: Publish a new ScreenPing GitHub Release. Use when the user asks to "release", "cut a release", "publish a release", "ship a version", or similar. Releases are NOT automatic — this skill is the only path. It bumps the version, then triggers the manual Release workflow, which builds the macOS/Linux/Windows installers on the runners and publishes the GitHub Release directly (no local downloads).
---

# Release ScreenPing

Two workflows exist:
- `build.yml` — runs on every push to `main` / PR. Builds installers as artifacts. **Never publishes.**
- `release.yml` — `workflow_dispatch` only. Builds installers on the runners and publishes the GitHub Release from the runner (`electron-builder --publish always`). This is what creates releases.

This skill bumps the version, then dispatches `release.yml`. Publishing happens entirely on the runners — do **not** try to download artifacts and `gh release create` locally (artifact download is unreliable in this environment). Run from the repo root.

## Prerequisites
- `gh auth status` succeeds; working tree clean.
- Builds are unsigned (Gatekeeper/SmartScreen warnings expected).
- mac is **x64-only** by design (runs on Apple Silicon via Rosetta); see memory `mac-build-x64-only`. Don't change it to arm64 — ad-hoc signing breaks on newer macOS.

## Safe to re-run from any point — always check current state first.

### 1. Decide the version
- If the user named one (e.g. "release 1.2.0"), use it; else bump the patch of `package.json`'s `version`.
- Call it `X.Y.Z`, tag `vX.Y.Z`.
- If `gh release view vX.Y.Z` succeeds, it's already published — stop and tell the user.

### 2. Bump the version on main (skip if already there)
Direct pushes to `main` are blocked, so go through a PR. **If `package.json` on `main` already reports `X.Y.Z`, skip this entire step** (a previous run merged it):

```bash
git checkout main && git pull --ff-only
git checkout -b release/vX.Y.Z
npm version X.Y.Z --no-git-tag-version
git commit -am "Release vX.Y.Z"
git push origin release/vX.Y.Z
gh pr create --title "Release vX.Y.Z" --body "Version bump for release vX.Y.Z."
gh pr merge --squash --delete-branch
git checkout main && git fetch origin main && git reset --hard origin/main
```

### 3. Dispatch the Release workflow
It builds + publishes from the runners. `--ref main` so it uses the just-merged version:

```bash
gh workflow run release.yml --ref main -f version=X.Y.Z
```

### 4. Watch it to completion
The run takes a few seconds to register:

```bash
sleep 5
RID=$(gh run list --workflow release.yml --json databaseId -q '.[0].databaseId')
gh run watch "$RID" --exit-status
```
The three matrix jobs publish to the same release (this is fine — proven). If a job fails, stop and report; the release may be partial.

### 5. Verify and report
```bash
gh release view vX.Y.Z --json isDraft,assets -q '"draft=\(.isDraft) assets=\([.assets[].name])"'
```
Confirm `draft=false` and that the `.dmg`, `.AppImage`, and `.exe` are listed, then give the user the release URL.
