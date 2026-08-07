---
id: EPIC-PLANTZ-DELIVERY
type: main
status: open
priority: P0
owner: Dennis Fink
created: 2026-08-07
subs: [DEL-01, DEL-02, DEL-03, DEL-04, DEL-05]
---

# [EPIC-PLANTZ-DELIVERY] Delivery Pipeline & Data Foundation

> **PRD type:** Main / Epic. Describes the **WHAT**, not the HOW.
> Implementation detail belongs in the linked sub-PRDs.

## 1. Summary

Today a plantz release works like this: SSH to terry, `cd /root/plantz`, run `deploy.sh`,
which pulls from GitHub and builds the image on the server. Schema changes are separate:
copy a `psql -f` line out of the README and run it by hand, with no record of which
migration ran on which host. Nothing runs the one test file in the repo, because no test
runner is installed.

This epic replaces that with a pipeline. A push to `main` in Gitea triggers a workflow that
lints, tests, builds an image, pushes it to the Gitea container registry and starts it on
terry. Migrations run when the container starts and stop the container if one fails.

Exit state: a change to plantz reaches terry without a shell session, and the schema on
terry is always the schema in the repo.

## 2. Motivation & Context

Verified against `main` (4d935f8) and the live hosts on 2026-08-07.

**The migration process has no memory.** `server/db/migrations/` holds `initial.sql` plus
001 to 004. Nothing records which of them ran on terry. Dev and prod schemas can already
differ and nobody would notice until a query fails. Every schema change in EPIC-PLANTZ-CARE
depends on fixing this first.

**Every query opens its own Postgres connection.** `server/utils/db.ts` creates a
`pg.Client`, connects, queries and closes. Beyond the wasted handshake, this makes any
later latency measurement in EPIC-PLANTZ-INSIGHT measure connection setup rather than query
time.

**The infrastructure for CI already exists and is unused.** Gitea 1.25.1 runs on
192.168.178.43. `gitea-runner-1` (`gitea/act_runner:nightly`) is registered and last built
for the invoi repos on 2026-08-01. The repository `dennis/plantz.app` exists with Actions
and Packages enabled, and is empty. The gitea host already has
`insecure-registries: ["192.168.178.43:3000"]` in `/etc/docker/daemon.json`. terry does
not, which is the one real gap on the deploy side.

**The one test in the repo has never run.** `app/components/BaseHeadline/BaseHeadline.test.ts`
exists. `package.json` has no `test` script and no runner in `devDependencies`.

## 3. Goals & Non-Goals

### 3.1 Goals (WHAT)

- **A push deploys.** Merging to `main` produces a running container on terry with no
  manual step.
- **The schema follows the code.** Pending migrations apply on container start and a failed
  migration stops the container rather than serving a half-migrated app.
- **Broken code does not ship.** Lint and tests run before an image is built.
- **The repo lives at home.** Gitea is `origin`, GitHub is a mirror, and the mirror doubles
  as off-site backup for the repository.

### 3.2 Non-Goals (explicitly excluded)

- **No authentication.** Out of scope for the whole program, see D-A1 in the backlog.
- **No Ansible role for plantz.** terry keeps its hand-rolled compose file. Pulling plantz
  into the homelab role set is tracked in `homelab-root/TODOS.md`.
- **No ORM.** Raw SQL against `pg` stays. Only the connection handling and the migration
  application change.
- **No staging environment.** One environment, terry, is the target.
- **No rollback automation.** Tagged images make a manual rollback possible; automating it
  is not part of this epic.

## 4. Definition of Done (epic exit criteria)

- [ ] `git push origin main` produces a green Actions run and a container on terry built
      from that commit, with no human step in between.
- [ ] The running container's image tag matches the commit SHA that triggered the run.
- [ ] A migration file added to `server/db/migrations/` is applied on the next deploy and
      recorded in a `schema_migrations` table.
- [ ] A deliberately broken migration stops the container instead of leaving the app up on
      a partial schema.
- [ ] `pnpm test` runs `BaseHeadline.test.ts` and it passes, locally and in CI.
- [ ] `git remote -v` shows Gitea as `origin`, and a push to `main` appears on GitHub
      within the mirror interval.
- [ ] `psql -f` no longer appears in the README as a deploy step.

## 5. Scope (sub-PRDs)

| ID | Title | Prio | Depends on | Loopable |
|----|-------|------|------------|----------|
| [DEL-01](../subs/del-01-data-access-and-migration-runner.md) | Data Access & Migration Runner | P0 | none | yes |
| [DEL-02](../subs/del-02-test-runner-and-lint-gate.md) | Test Runner & Lint Gate | P0 | none | yes |
| [DEL-03](../subs/del-03-gitea-origin-github-mirror.md) | Gitea as Origin, GitHub as Mirror | P0 | none | yes |
| [DEL-04](../subs/del-04-ci-pipeline.md) | CI Pipeline: Lint, Test, Build, Push | P0 | DEL-02, DEL-03 | yes |
| [DEL-05](../subs/del-05-automated-deploy-to-terry.md) | Automated Deploy to terry | P0 | DEL-01, DEL-04 | yes |

DEL-01, DEL-02 and DEL-03 are independent and can be worked in any order. DEL-04 needs the
repo in Gitea and a test command to call. DEL-05 needs an image in the registry and a
migration runner that can fail loudly.

## 6. Risks & Assumptions

| Risk / assumption | Impact | Mitigation |
|-------------------|--------|------------|
| terry has no `/etc/docker/daemon.json`, so it cannot pull from an HTTP registry | The first automated deploy fails at `docker compose pull` | DEL-05 writes the file and restarts the docker daemon as an explicit, verified step |
| terry's schema may already differ from `server/db/migrations/` | The runner marks migrations as pending that in fact ran, and re-running them errors | DEL-01 compares the live schema against the file list and seeds `schema_migrations` accordingly, before any new migration exists |
| The runner reaches terry over SSH as `root` | A compromised runner owns terry | Recorded as Q-D3; a dedicated deploy user is the alternative |
| `gitea-runner-1` runs `act_runner:nightly` | A nightly image can change behaviour between two deploys | Out of scope to pin here; noted so a sudden CI failure has a suspect |
| `amqplib` is a dependency with zero usages | Dead weight and a misleading signal about the architecture | DEL-02 removes it while touching `package.json` |
| Assumption: the Gitea container registry is enabled and writable | DEL-04 has nowhere to push | `has_packages: true` on the repo, verified 2026-08-07 |

## 7. Open Questions

- [ ] **Q-D1** [DEL-03] Does the GitHub repo stay as a mirror target indefinitely, or is it
      archived once Gitea is primary? Recommendation: keep it as a mirror, it is the only
      off-site copy of the code.
- [ ] **Q-D2** [DEL-04] Image tag scheme: commit SHA only, or SHA plus `latest`?
      Recommendation: both. SHA identifies the deploy, `latest` keeps a manual
      `docker compose up` working.
- [ ] **Q-D3** [DEL-05] Deploy as `root` into `/root/plantz` (the current layout) or move
      to a dedicated `deploy` user? Recommendation: keep `root` for this epic, note it as
      debt. Moving the checkout is a separate change with its own failure modes.
- [ ] **Q-D4** [DEL-01] Do migrations run in the app process on start, or as a separate
      one-shot container before the app? Recommendation: in the app process, since there is
      exactly one instance and no orchestrator to sequence two containers.

## 8. Decisions Taken

- **D-D1** Migrations apply automatically on start and abort the process on failure. A
  half-migrated schema behind a running app is worse than an app that refuses to start.
- **D-D2** `pg.Pool` lands here rather than as a later refactor, because INS-01 cannot
  measure query latency meaningfully without it.
- **D-D3** The image is built in CI, not on terry. Building on the target means the target
  needs the source, a toolchain and enough RAM, and it makes "what is deployed" a question
  about a working copy rather than about a tag.
- **D-D4** Deployment is push-based over SSH (D-A3 in the backlog). The alternative,
  Watchtower polling the registry, hides the deploy from the CI run that caused it.

## 9. References

- [backlog.md](../backlog.md), the queue and the loop rules
- [archive/main-prd-plantz-1-0.md](../archive/main-prd-plantz-1-0.md), the superseded
  single-epic version
- `homelab-root/ansible/inventory/hosts.yml`, terry at 192.168.178.27, gitea at
  192.168.178.43
- `homelab-root/TODOS.md`, the open item on mirroring gitea repos off-site
