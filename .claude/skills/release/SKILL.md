---
name: release
description: Publish a new ScreenPing GitHub Release. Use when the user asks to "release", "cut a release", "publish a release", "ship a version", or similar. CI builds the macOS/Linux/Windows installers on every merge to main but never publishes — this skill is the only path to a release. It bumps the version, waits for CI to build the installers, downloads them, and creates the GitHub Release with the dmg/AppImage/exe attached.
---

# Release ScreenPing

CI (`.github/workflows/build.yml`) builds the three platform installers on every push to `main` and uploads them as workflow artifacts. It does **not** publish releases. This skill does, from those CI-built artifacts. Run it from the repo root.

## Prerequisites
- `gh auth status` succeeds and the working tree is clean.
- Builds are unsigned — that's expected (users see Gatekeeper/SmartScreen warnings).
- mac is **x64-only** by design (runs on Apple Silicon via Rosetta); see memory `mac-build-x64-only`. Do not "fix" this back to arm64.

## The skill is safe to re-run from any point. Always check current state before acting.

### 1. Decide the version
- If the user named a version (e.g. "release 1.2.0"), use it. Otherwise read `version` from `package.json` and bump the patch.
- Call it `X.Y.Z`; the tag is `vX.Y.Z`.
- Abort if the release already exists: `gh release view vX.Y.Z` returning success means it's already published — stop and tell the user.

### 2. Bump the version (only if needed)
Direct pushes to `main` are blocked, so the bump goes through a PR. **Skip this whole step if `main` already reports `X.Y.Z`** (i.e. a previous run merged the bump but failed later):

```bash
git checkout main && git pull --ff-only
# If package.json on main is already X.Y.Z, skip to step 3.
git checkout -b release/vX.Y.Z
npm version X.Y.Z --no-git-tag-version   # updates package.json + package-lock.json, no tag
git commit -am "Release vX.Y.Z"
git push origin release/vX.Y.Z
gh pr create --title "Release vX.Y.Z" --body "Version bump for release vX.Y.Z."
gh pr merge --squash --delete-branch
git checkout main && git fetch origin main && git reset --hard origin/main
```

### 3. Find the build run for the current main HEAD
The merge (or the existing HEAD if you skipped step 2) is the commit to release.

```bash
SHA=$(git rev-parse HEAD)
# gh run list has no --commit flag; filter on headSha. Retry a few times — the run
# takes a few seconds to register after the push.
RID=$(gh run list --workflow build.yml --branch main --json databaseId,headSha,status \
  -q "map(select(.headSha==\"$SHA\"))[0].databaseId")
```

If `RID` is empty, the build hasn't registered yet (wait and retry) — or this commit predates CI / its artifacts expired (30-day retention). In the latter case, push an empty commit or a new bump to get a fresh build.

### 4. Wait for the build, then download installers
```bash
gh run watch "$RID" --exit-status      # FAILS -> stop, do NOT publish a partial release
rm -rf /tmp/screenping-release
gh run download "$RID" -D /tmp/screenping-release
```
This yields `screenping-mac/*.dmg`, `screenping-linux/*.AppImage`, `screenping-win/*.exe`.

### 5. Verify all three installers exist before publishing
A missing file would pass an unexpanded glob to `gh` and fail confusingly. Confirm first:

```bash
ls /tmp/screenping-release/screenping-mac/*.dmg \
   /tmp/screenping-release/screenping-linux/*.AppImage \
   /tmp/screenping-release/screenping-win/*.exe
```
If any is missing, stop and report which platform's build/upload failed.

### 6. Create the release
Pin the tag to the exact commit you built with `--target`:

```bash
gh release create vX.Y.Z \
  /tmp/screenping-release/screenping-mac/*.dmg \
  /tmp/screenping-release/screenping-linux/*.AppImage \
  /tmp/screenping-release/screenping-win/*.exe \
  --target "$SHA" --title "vX.Y.Z" --generate-notes
```

### 7. Verify and report
```bash
gh release view vX.Y.Z --json isDraft,assets -q '"draft=\(.isDraft) assets=\([.assets[].name])"'
```
Confirm `draft=false` and the three installers are listed, then give the user the release URL.
