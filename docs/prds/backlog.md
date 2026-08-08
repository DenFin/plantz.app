# plantz PRD Backlog

Single source of truth for what gets built next. This file is the entry point for the
`/loop` workflow: the loop reads the queue, picks the first eligible sub-PRD, works it,
and updates the status here and in the sub-PRD frontmatter.

Last updated: 2026-08-07

## How the loop picks work

1. Read the queue below top to bottom.
2. Take the first row with `status: open` whose every `depends_on` entry is `done`.
3. If that row has `loopable: no`, skip it, report it to the operator, and continue.
4. If that row has `loopable: confirm`, ask the operator before the step that causes
   downtime or touches production credentials, then continue.
5. Open the sub-PRD, do the work, and run the commands under its `Verification` section.
6. Set `status: done` in the sub-PRD frontmatter and in this table only when every
   `Verification` command produced the stated result. A partial pass stays `wip`.

The loop never invents a sub-PRD. If work falls outside every open sub-PRD, it stops and
reports instead of widening scope.

## Branching and commits

The whole program runs on one long-lived branch: **`feat/plantz-program`**. The loop works
there and does not create a branch per sub-PRD.

- One or more commits per sub-PRD, conventional commits, English, imperative.
- The commit that finishes a sub-PRD names its ID in the body, so
  `git log --grep=DEL-01` finds the work.
- The status update in this file and in the sub-PRD frontmatter goes in that same commit.
- Merging `feat/plantz-program` into `main` is a decision for the operator, not for the
  loop. A reasonable point is the end of each epic.

Once DEL-04 is done, CI runs lint, test and build on every branch, so the program branch is
verified continuously. The image push and the deploy to terry are gated on `main`, so work
in progress never reaches the running app by accident. That also means DEL-05 cannot be
fully verified without one merge to `main`, which its verification section states
explicitly.

Two sub-PRDs also touch `homelab-root` (INS-02, INS-03) and one touches it partially
(OPS-01). That repository has its own branch and its own commits; the plantz branch does
not track those changes.

## Status values

| Value | Meaning |
|-------|---------|
| `open` | Not started |
| `wip` | Branch exists, work started, not verified |
| `done` | Every `Verification` command passed |
| `blocked` | Cannot proceed, reason recorded in the sub-PRD |

## Queue

| # | ID | Title | Epic | Status | Depends on | Loopable | Repo |
|---|-----|-------|------|--------|------------|----------|------|
| 1 | [DEL-01](subs/del-01-data-access-and-migration-runner.md) | Data Access & Migration Runner | DELIVERY | done | none | yes | plantz |
| 2 | [DEL-02](subs/del-02-test-runner-and-lint-gate.md) | Test Runner & Lint Gate | DELIVERY | done | none | yes | plantz |
| 3 | [DEL-03](subs/del-03-gitea-origin-github-mirror.md) | Gitea as Origin, GitHub as Mirror | DELIVERY | done | none | yes | plantz |
| 4 | [DEL-04](subs/del-04-ci-pipeline.md) | CI Pipeline: Lint, Test, Build, Push | DELIVERY | done | DEL-02, DEL-03 | yes | plantz |
| 5 | [DEL-05](subs/del-05-automated-deploy-to-terry.md) | Automated Deploy to terry | DELIVERY | done | DEL-01, DEL-04 | yes | plantz, terry |
| 6 | [CARE-01](subs/care-01-care-events.md) | Care Events | CARE | done | DEL-01 | yes | plantz |
| 7 | [CARE-02](subs/care-02-reminders-end-to-end.md) | Reminders End to End | CARE | done | DEL-01 | yes | plantz |
| 8 | [CARE-03](subs/care-03-plant-status-history.md) | Plant Status History | CARE | done | DEL-01 | yes | plantz |
| 9 | [CARE-04](subs/care-04-watering-due-dates.md) | Watering Due Dates | CARE | done | CARE-01 | yes | plantz |
| 10 | [INS-01](subs/ins-01-metrics-endpoint-and-sampler.md) | Metrics Endpoint & Sampler | INSIGHT | done | DEL-01, CARE-01, CARE-02, CARE-04 | yes | plantz |
| 11 | [INS-02](subs/ins-02-prometheus-job-and-node-exporter.md) | Prometheus Job on cerf | INSIGHT | open | INS-01 | yes | homelab-root |
| 12 | [INS-03](subs/ins-03-grafana-board.md) | Grafana Board `Service: Plantz` | INSIGHT | open | INS-02 | yes | homelab-root |
| 13 | [OPS-01](subs/ops-01-backup-postgres-and-minio.md) | Backup for terry Postgres & MinIO | OPS | open | none | confirm | homelab-root, terry |
| 14 | [OPS-02](subs/ops-02-remote-access.md) | Remote Access via Tunnel | OPS | open | DEL-05 | no | terry |
| 15 | [OPS-03](subs/ops-03-credential-rotation.md) | Credential Rotation | OPS | open | DEL-05, OPS-01 | confirm | plantz, terry |

## Epics

| Epic | Document | Sub-PRDs | Exit state |
|------|----------|----------|------------|
| DELIVERY | [epic-delivery.md](epics/epic-delivery.md) | DEL-01 to DEL-05 | A push to `main` lands on terry without a shell session |
| CARE | [epic-care.md](epics/epic-care.md) | CARE-01 to CARE-04 | The database records what happened to a plant, not only what it is |
| INSIGHT | [epic-insight.md](epics/epic-insight.md) | INS-01 to INS-03 | The board answers "is the app healthy" and "what needs water" |
| OPS | [epic-ops.md](epics/epic-ops.md) | OPS-01 to OPS-03 | The data survives a disk failure and no credential is a default |

## Why this order

DELIVERY runs first because every later change ships through it. Building the pipeline
after the features means every CARE change is deployed by hand and the pipeline is
verified against nothing.

CARE runs before INSIGHT because a board over the current schema would be flat lines. The
brainstorm in `homelab-root/docs/brainstorms/plantz-dashboard-requirements.md` states this
directly: the interesting panels have no source data until care events exist.

OPS-01 (backup) has no dependencies and can be pulled forward at any point. It sits last
only because it lives in homelab-root and needs a physical USB disk. OPS-02 and OPS-03 are
deliberately last: neither is needed while the app is LAN-only.

## Decisions that shaped this backlog

- **D-A1** Authentication is out of scope. Dennis is the only user. The `users` table and
  `plants.user_id` stay in the schema untouched, so the path stays open, but no endpoint
  reads or writes them in this program. Remote access is solved by a tunnel (OPS-02), not
  by a login screen. See the archived
  [main-prd-plantz-1-0.md](archive/main-prd-plantz-1-0.md) for the version that included
  it.
- **D-A2** Gitea (`192.168.178.43:3000`) becomes `origin`. GitHub
  (`DenFin/plantz.app`) becomes a push mirror, which also closes the open item in
  `homelab-root/TODOS.md` about mirroring gitea repos off-site.
- **D-A3** Deployment is push-based: the Gitea Actions runner connects to terry over SSH
  and starts the new image. Pull-based (Watchtower) was considered and rejected because
  the deploy would be untraceable from the CI run.
- **D-A4** plantz keeps `deploy.sh` semantics but not the script: building on terry is
  replaced by pulling a tagged image from the Gitea container registry.

## Archived documents

- [main-prd-plantz-1-0.md](archive/main-prd-plantz-1-0.md), the single-epic version of this
  program from 2026-08-06. Superseded, kept for the reasoning in sections 2, 7 and 9.
