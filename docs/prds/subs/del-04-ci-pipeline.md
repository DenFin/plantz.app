---
id: DEL-04
epic: EPIC-PLANTZ-DELIVERY
title: "CI Pipeline: Lint, Test, Build, Push"
status: done
priority: P0
depends_on: [DEL-02, DEL-03]
repo: plantz
loopable: true
---

# [DEL-04] CI Pipeline: Lint, Test, Build, Push

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-DELIVERY](../epics/epic-delivery.md)

## 1. Goal

A push to `main` in Gitea runs lint and tests, builds the Docker image, and pushes it to
the Gitea container registry tagged with the commit SHA and `latest`. No deploy yet, that
is DEL-05.

## 2. Current State (verified 2026-08-07)

- No CI configuration exists in the repo. There is no `.gitea/` and no `.github/`
  directory.
- `gitea-runner-1` (`gitea/act_runner:nightly`) runs on the gitea host and is registered
  against `http://gitea:3000`. Its log shows tasks up to number 85 for `invoi/frontend`,
  `invoi/backend` and `invoi/pdf-generator`, most recently on 2026-08-01. The runner works.
- The runner has an artifact cache in use, with pnpm cache keys visible in its log
  (`node-cache-linux-x64-pnpm-...`). Caching is available.
- The gitea host has `/etc/docker/daemon.json` containing
  `{ "insecure-registries": ["192.168.178.43:3000"] }`, so the runner can push to the
  registry over HTTP.
- `dennis/plantz.app` has `has_packages: true`.
- The `Dockerfile` builds in two stages with `NODE_VERSION=23` and runs
  `node .output/server/index.mjs`.

## 3. Scope

### 3.1 In Scope

- `.gitea/workflows/ci.yml` triggering on push to **any** branch.
- Job steps: checkout, pnpm setup with cache, `pnpm install --frozen-lockfile`,
  `pnpm lint`, `pnpm test`, `pnpm build`. These run on every branch.
- Docker build and push to `192.168.178.43:3000/dennis/plantz.app`, tagged with the commit
  SHA and `latest`. **This step runs on `main` only.**
- Registry authentication using the built-in `GITEA_TOKEN` or a dedicated packages token
  stored as a repository secret.

**Why every branch.** The whole program runs on `feat/plantz-program` (see
[backlog.md](../backlog.md), section "Branching and commits"). A workflow that only
triggers on `main` would stay silent for the entire program and would first run at the
merge, which is the worst possible moment to discover that it does not work.

**Why the image only on `main`.** An image per work-in-progress commit fills the registry
with builds nobody will ever deploy, and DEL-05 deploys whatever `main` produced. Keeping
the push gated on `main` means "an image exists" and "it is meant to run" stay the same
statement.

### 3.2 Out of Scope

- Deployment to terry. That is DEL-05, in a separate workflow file or a separate job
  gated on this one.
- Multi-architecture builds. terry is amd64 and so is the runner.
- Any release, changelog or versioning automation.
- Changing the `Dockerfile` beyond what is needed to accept a build argument for the
  version label.
- Branch protection rules.

## 4. Implementation Notes

**Gitea Actions reads `.gitea/workflows/` first, `.github/workflows/` as a fallback.**
Use `.gitea/workflows/` so the GitHub mirror does not start running the same workflow on
GitHub Actions.

**Runner labels.** Check what labels `gitea-runner-1` registered with before writing
`runs-on`. The invoi workflows on the same runner are the reference: read one of them
rather than guessing.

```bash
tea repos --login invoi   # find the invoi frontend repo
# then read its .gitea/workflows/ from the Gitea web UI or API with the login token
```

**Registry naming.** The Gitea container registry addresses images as
`<host>/<owner>/<image>`. Here: `192.168.178.43:3000/dennis/plantz.app`. The image name
does not have to match the repository name, but keeping them identical removes a question
later.

**Node version.** The `Dockerfile` pins `NODE_VERSION=23`. Use the same major version in
the CI job so a build that passes in CI cannot fail in the image.

**Build arg.** `deploy.sh` passed `BUILD_TAG` as a build argument. Keep that idea: pass
the commit SHA so `plantz_build_info` in INS-01 has a version to report.

**Frozen lockfile.** `pnpm install --frozen-lockfile` in CI. A CI run that silently
updates the lockfile makes the built image differ from what a developer tested.

## 5. Definition of Done

- [ ] `.gitea/workflows/ci.yml` exists and Gitea shows a run for it.
- [ ] A push to `feat/plantz-program` produces a green run with lint, test and build all
      executed, and pushes no image.
- [ ] A push to `main` produces a green run and pushes an image tagged with the full commit
      SHA plus `latest`.
- [ ] A commit that fails lint produces a red run and pushes no image.
- [ ] A commit that fails a test produces a red run and pushes no image.
- [ ] The image is visible in the Packages tab of `dennis/plantz.app`.

## 6. Verification

```bash
# After pushing the workflow, on the program branch
git push origin feat/plantz-program
# expect: green run, lint + test + build, no image pushed

# Watch the run
tea --login invoi  # or open http://192.168.178.43:3000/dennis/plantz.app/actions

# Image present
curl -s "http://192.168.178.43:3000/api/v1/packages/dennis?type=container" | head -c 500
# expect: an entry for plantz.app

# Pull it from a machine that trusts the registry
ssh gitea "docker pull 192.168.178.43:3000/dennis/plantz.app:latest && docker image ls | grep plantz"
# expect: the image is pulled

# Red path
# push a commit with a deliberate lint error to a throwaway branch
# expect: red run, no new package version, then delete the branch
```

## 7. Risks

| Risk | Mitigation |
|------|------------|
| `runs-on` label does not match what the runner registered | Read an existing invoi workflow first rather than guessing. A mismatched label leaves the job queued forever with no error |
| `act_runner:nightly` changes behaviour between runs | Noted in the parent epic risk table. If CI breaks without a code change, this is the first suspect |
| `pnpm install --frozen-lockfile` fails because DEL-02 changed the lockfile without committing it | DEL-02's DoD includes committing the lockfile |
| The registry rejects the push for lack of package write scope | Use `GITEA_TOKEN` from the workflow context first; fall back to a dedicated token as a repository secret |
| The build runs out of memory in the runner container | `sharp` and the Nuxt build are the heavy parts. If it fails, the runner container's memory limit is the thing to check, not the workflow |

## 8. Open Questions

- [ ] **Q-D2** (parent epic) settled: tag with both the commit SHA and `latest`.
- [ ] **Q-DEL4-1** Should pull requests also build the Docker image, or only run lint,
      test and `pnpm build`? Recommendation: skip the Docker build on PRs. It is the
      slowest step and `pnpm build` already proves the app compiles.

## 9. Implementation Notes Added During the Work

- **D-D21 The runner labels are `ubuntu-latest`, `ubuntu-22.04`, `ubuntu-20.04`**, read
  from `/data/.runner` inside `gitea-runner-1` rather than guessed. `runs-on: ubuntu-latest`.
- **D-D22 `.pnpm-store` had to be gitignored.** `pnpm/action-setup` places the store inside
  the workspace, and the eslint config honours `.gitignore`, so the first run reported
  806861 errors from the store's JSON index files. One line in `.gitignore` fixes it, and
  the store should never be committed anyway.
- **D-D23 The build needs a raised heap ceiling.** The gitea VM has 2.8 GB of RAM, so node
  caps old space near 1.4 GB and the nitro build aborts with a fatal OOM. Both the CI build
  step and the Dockerfile build stage set `--max-old-space-size=2048`. This is the risk the
  section 7 table anticipated; it fired on the second run.
- **D-D24 Registry auth uses a repository secret**, see D-D20 in DEL-05.
- **Q-DEL4-1** settled: the docker build stays off non-`main` branches, as the
  recommendation proposed. `pnpm build` already proves the app compiles.

Verified on 2026-08-07: green run on `feat/plantz-program` with no image (run 91, `image`
skipped, packages empty), green run on `main` with the image tagged `0cb1bb69d5e1` and
`latest` (run 98), red run on a deliberate lint error (run 92) and on a deliberate test
failure (run 93), neither of which pushed an image.
