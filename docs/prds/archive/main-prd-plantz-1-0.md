# [EPIC-PLANTZ-1.0] plantz 1.0 — From Homelab Tool to an App That Can Be Run for Real — Main PRD

> **PRD type:** Main / Epic. Describes the **WHAT**, not the HOW.
> Implementation detail belongs in the linked sub-PRDs.

## Meta

| Field | Value |
|-------|-------|
| Epic ID | `EPIC-PLANTZ-1.0` |
| Status | Draft |
| Owner | Dennis Fink |
| Created / Updated | 2026-08-06 |
| Related documents | [plantz-dashboard-requirements.md](../../../homelab-root/docs/brainstorms/plantz-dashboard-requirements.md) (homelab-root) · [README.md](../../README.md) |

## 1. Summary

plantz works: plants, rooms, photos, notes, AI photo analysis and a propagation link
between parent and child plant are all implemented and in daily use on terry. What it
lacks is everything that separates a personal script from an application: it records
state but not events, it has a `users` table that nothing reads, it opens a fresh
Postgres connection per query, its migrations are applied by hand, and it is invisible to
the monitoring stack that watches every other service in the homelab.

This epic closes that gap. Exit state: plantz has a time axis in its data, knows who owns
a plant, is measurable from Grafana, and can be deployed to a public host without
handing the database to whoever finds it.

## 2. Motivation & Context

Three findings drive this epic, all verified against the current `main` (4d935f8).

**The schema stores what a plant *is*, never what *happened* to it.** `plants.status` is
a single enum column that gets overwritten, so a plant that was sick in March and is
healthy now looks like it was always healthy. `reminders` has `remind_at` but no
completion column, so a reminder is never open or done, only present. Watering,
fertilizing and repotting are recorded nowhere at all. Every interesting question the app
should answer — what needs water, how many care actions this week, how long plants stay
sick — has no source data.

**Authentication is declared as a goal in the README and is absent from the code.** The
`users` table exists from `initial.sql` and `plants.user_id` references it, but
`grep user_id server/` returns nothing: no endpoint writes it, none filters by it. Every
plant in the database belongs to nobody. Public deployment, which the README names as the
near-term goal, is not reachable from here without a data migration.

**plantz is outside the operational path.** It runs on terry (192.168.178.27) via
`deploy.sh` and a hand-rolled `docker-compose.yml`. terry is in
`ansible/inventory/hosts.yml` but has no role, no node_exporter and no Prometheus job.
Migrations are applied by pasting a `psql` command from the README, with no record of
which ones ran where. `DATABASE_URL` is on `admin:changeme`. Photos in MinIO and note
history in Postgres are a second irreplaceable dataset on grace hardware with no backup.

The dashboard brainstorm from 2026-08-05 specified the monitoring end of this in detail.
This PRD is the wider frame it sits in: the dashboard is one of six blocks, and it is not
the first one.

## 3. Goals & Non-Goals

### 3.1 Goals (WHAT)

- **Has a history.** Care actions, status changes and reminder completions are recorded as
  events, so the app can answer questions about time, not just about now.
- **Knows its owner.** Every plant belongs to a user; a request without a session sees
  nothing.
- **Is measurable.** App health and plant care are both visible in Grafana without opening
  the app.
- **Is deployable.** A deploy is one documented command, migrations included, with secrets
  that are not `changeme`.
- **Is trustworthy.** The core flows have tests, and lint plus tests run before a deploy.

### 3.2 Non-Goals (explicitly excluded)

- **No care planning engine.** Logging a watering, yes. Species-specific schedules,
  push notifications and a recommendation system, no.
- **No redesign** of the UI or of the existing plants/rooms/notes/photos model beyond the
  additive changes named here.
- **No multi-tenant product.** Auth exists to make public hosting safe, not to onboard
  strangers. Registration stays closed (Q-01).
- **No ORM migration.** Raw SQL against `pg` stays; only the connection handling changes.
- **No move into an Ansible role.** plantz stays on `deploy.sh` for this epic; pulling it
  into the homelab role set is tracked separately in homelab-root `TODOS.md`.

## 4. Definition of Done (epic exit criteria)

- [ ] A watering logged in the app appears as a row in `care_events` and moves the Care
      Backlog panel in Grafana within one scrape interval.
- [ ] A reminder can be marked done and stops counting as open; a recurring reminder
      produces its next occurrence.
- [ ] A request without a valid session receives 401 from every `/api/plants*` endpoint;
      a logged-in user sees only their own plants (verified by a negative test).
- [ ] `pnpm test` runs and passes in CI, including the existing
      `BaseHeadline.test.ts`, which today has no runner and has never executed.
- [ ] A deploy applies pending migrations automatically and refuses to start on a failed
      migration; `psql -f` by hand is no longer in the README.
- [ ] Prometheus job `plantz` is `up` against terry, and the `Service: Plantz` board
      renders with every panel query verified against real data.
- [ ] No production credential is a default value, and a `.env.example` documents every
      variable the app reads.
- [ ] Postgres and MinIO data from terry are part of the monthly USB backup job.

## 5. Scope — Work Blocks (Sub-PRDs)

Each block becomes its own sub-PRD (the **HOW**, including guardrails).

| Sub-PRD | Title | Prio | Status | Depends on |
|---------|-------|------|--------|------------|
| `PRD-01` | Data Access & Migration Runner | **P0** | open | — |
| `PRD-02` | Care Events & the Time Axis | **P0** | open | PRD-01 |
| `PRD-03` | Authentication & Plant Ownership | **P0** | open | PRD-01 |
| `PRD-04` | Observability: `/metrics` and the Grafana Board | P1 | open | PRD-01, PRD-02 |
| `PRD-05` | Public Deployment, Secrets & Backup | P1 | open | PRD-03 |
| `PRD-06` | Test Suite & CI Gating | P2 | open | — |

**PRD-01 — Data Access & Migration Runner.** `server/utils/db.ts` moves from a per-query
`pg.Client` to a module-level `pg.Pool`. A migration runner applies numbered files from
`server/db/migrations/` on startup and records what ran. Everything after this depends on
being able to ship a schema change without an SSH session.

**PRD-02 — Care Events & the Time Axis.** New `care_events` table (append-only:
`plant_id`, `type`, `occurred_at`, `note`). `reminders` gains `completed_at` and
`recurrence_days`. New `plant_status_events` table written wherever `plants.status` is
written today, including `bury/index.post.ts`. Includes the minimum UI to log a care
action; a table nothing writes to is worthless.

**PRD-03 — Authentication & Plant Ownership.** Session-based login against the existing
`users` table, `user_id` written and filtered on every plant-scoped endpoint, and a
migration that assigns the existing plants to the single existing owner.

**PRD-04 — Observability.** `/metrics` in Prometheus format on port 3000, domain gauges
from a 60s sampler rather than per scrape, Prometheus job on cerf, and the
`Service: Plantz` board. Fully specified in the homelab-root brainstorm; that document is
this sub-PRD's input, not a duplicate of it.

**PRD-05 — Public Deployment, Secrets & Backup.** Real credentials, `.env.example`,
reverse proxy with TLS, and terry's Postgres plus MinIO added to the monthly USB backup.

**PRD-06 — Test Suite & CI Gating.** A test runner (none is installed today), coverage of
the care-logging and ownership flows, and lint plus tests as a gate before deploy.

## 6. Sequence & Phases

| Phase | Content | Sub-PRDs |
|-------|---------|----------|
| **1 — Foundation** | Pool and migration runner, so every later schema change is one command | PRD-01 |
| **2 — Domain** | Care events, reminder completion, status history, logging UI | PRD-02 |
| **3 — Visibility** | `/metrics`, sampler, Prometheus job, board | PRD-04 |
| **4 — Public-ready** | Auth and ownership, then secrets, TLS and backup | PRD-03, PRD-05 |
| **5 — Gate** | Tests and CI, running alongside from phase 2 onward | PRD-06 |

Phase 3 comes before phase 4 on purpose: the board is the reward that makes the schema
work visible, and it is cheap once the events exist. PRD-06 is listed last but should
start with PRD-02, because the care-logging flow is the first thing worth a test.

## 7. Risks & Assumptions

| Risk / assumption | Impact | Mitigation |
|-------------------|--------|------------|
| `plants.user_id` is NULL for every existing row | Introducing auth orphans the entire collection | Backfill migration to the single owner, part of PRD-03 |
| Migrations are applied by hand today, with no record of what ran where | dev and prod schemas can already differ without anyone noticing | PRD-01 runner records applied migrations; verify terry against the file list first |
| `DATABASE_URL` on `admin:changeme`, reachable from the LAN | Trivial compromise the moment the host is exposed | Rotate in PRD-05, before anything is published |
| terry has no backup; photos in MinIO are irreplaceable | Total loss of the collection's history | Add to the monthly USB job (PRD-05, homelab-root) |
| `BaseHeadline.test.ts` exists with no test runner in `package.json` | The one test in the repo has never run | PRD-06 installs a runner and executes it in CI |
| `amqplib` is a dependency with zero usages in the codebase | Dead weight and a false signal about the architecture | Remove in PRD-06 unless a queue is actually planned |
| Assumption: plantz stays the only writer to its schema | Sampled counts in PRD-04 are authoritative | Holds as long as migrations run through the app |
| Assumption: OpenRouter stays available for photo analysis | Analysis breaks, the rest of the app does not | Failure is measured (PRD-04), not prevented |

## 8. Open Decisions

- [ ] **Q-01** [affects PRD-03, non-goals] Single-user with a login, or real multi-user
      with registration? The schema supports multi-user; the UI has no concept of it.
      Recommendation: single-user, registration closed, so auth is a lock and not a
      product feature.
- [ ] **Q-02** [affects PRD-02] Which care types on day one? `watering` and `fertilizing`
      are certain. `repotting`, `pruning` and `treatment` are guesses at the actual
      routine.
- [ ] **Q-03** [affects PRD-02, PRD-04] Is the watering interval a property of the plant
      (a column), of the species (a lookup), or purely a recurring reminder? The Care
      Backlog thresholds depend on the answer.
- [ ] **Q-04** [affects PRD-05] Where does the public instance live? netcup like invoi, or
      terry behind a tunnel? Determines what PRD-05 actually builds.
- [ ] **Q-05** [affects PRD-04, PRD-05] Is `/metrics` exposed once the app is public, or
      bound to the LAN?
- [ ] **Q-06** [affects PRD-04] Store `size_bytes` on `photos` at upload, or read the
      total from MinIO in the sampler? The column is cheaper to query and needs a
      backfill pass over existing objects.

## 9. Decisions Taken

- **D-01** Care events go into an append-only table, not a `last_watered_at` column on
  `plants`. A column answers "when last" and nothing else; the table answers that plus
  every rate and history question.
- **D-02** Status history goes into its own table rather than being reconstructed from
  notes. Notes are free text written by a human; parsing them would be guesswork.
- **D-03** No backfill of invented history. Care and status history start on the day of
  the migration. Plausible-looking fake watering dates would make the first weeks of
  every history panel fiction.
- **D-04** Domain metrics come from plantz's own `/metrics`, not from a textfile collector
  on cerf. A collector would need the Postgres credentials on a second machine and still
  could not see HTTP or MinIO activity.
- **D-05** `pg.Pool` lands in PRD-01 rather than as a later refactor. A per-query connect
  makes any latency measurement measure connection setup instead of query time.
- **D-06** plantz keeps `deploy.sh` for this epic. Moving it into an Ansible role is real
  work with no bearing on any goal above.

## 10. References

- [plantz-dashboard-requirements.md](../../../homelab-root/docs/brainstorms/plantz-dashboard-requirements.md)
  — full specification for PRD-04, including metric inventory and panel layout
- [README.md](../../README.md) — current feature list, deployment and migration commands
- `server/db/migrations/` — `initial.sql` plus 001 to 004, the current schema
- PRD structure follows the templates in `invoi-next/invoi-docs/prds/templates/`
