---
id: INS-01
epic: EPIC-PLANTZ-INSIGHT
title: Metrics Endpoint & Sampler
status: done
priority: P1
depends_on: [DEL-01, CARE-01, CARE-02, CARE-04]
repo: plantz
loopable: true
---

# [INS-01] Metrics Endpoint & Sampler

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-INSIGHT](../epics/epic-insight.md)

## 1. Goal

`GET /metrics` on port 3000 returns Prometheus text format covering application metrics
(HTTP, dependencies, pool) and domain metrics (plants, care, reminders), where the domain
half comes from a 60s sampler and never from the scrape itself.

The metric inventory, the exact names and the label sets are specified in
`homelab-root/docs/brainstorms/plantz-dashboard-requirements.md`, requirements R1 to R3 and
R10 to R12 plus the inventory table. This sub-PRD does not restate them; implement against
that document.

## 2. Current State (verified against `main` 4d935f8)

- Nothing is instrumented. No metrics library is installed.
- `server/api/db-status.ts` calls `database()`, runs `SELECT NOW()`, then `client.end()`.
  It returns `{status: 'connected'|'error'}`.
- `server/api/minio-status.ts` calls `checkMinioConnection()` from `server/utils/minio.ts`
  and returns the same shape.
- These two are the probe sources named in R12.
- After DEL-01, `server/utils/db.ts` exposes a pool whose `totalCount`, `idleCount` and
  `waitingCount` are readable.
- `nuxt.config.ts` has no `nitro` block yet.

## 3. Scope

### 3.1 In Scope

- A metrics registry. Q-I1 recommendation: `prom-client`.
- `GET /metrics` as a Nitro route returning `text/plain; version=0.0.4`.
- A Nitro middleware for `plantz_http_requests_total` and
  `plantz_http_request_duration_seconds`, labelled by the **matched route pattern**, never
  the raw path.
- Dependency instrumentation: photo upload count and bytes, OpenRouter analysis count by
  outcome and duration, plus `plantz_db_up` and `plantz_minio_up` fed by the two existing
  probe handlers.
- Pool gauges from the DEL-01 pool.
- A sampler that runs the domain SQL every 60s, caches the result, and sets the gauges.
  `plantz_sampler_timestamp_seconds` records when it last ran.
- `plantz_plant_care_age_seconds` limited to the 20 most overdue plants, using the shared
  overdue helper from CARE-04.
- `plantz_build_info` with the version from the `BUILD_TAG` build argument that DEL-04
  passes.
- A `photos.size_bytes` column plus a backfill over existing MinIO objects (Q-I2
  recommendation).

### 3.2 Out of Scope

- The Prometheus job. That is INS-02.
- The board. That is INS-03.
- Alert rules.
- Authentication in front of `/metrics`. It stays LAN-only, which follows from D-A1 and
  OPS-02.
- Tracing or logs.
- Any metric not in the brainstorm's inventory table. If one seems missing, add it to that
  document first.

## 4. Implementation Notes

**The sampler must start once per process.** Q-I3 is flagged in the brainstorm as a
planning item. In Nitro, a `server/plugins/` plugin runs once at startup, which is where
the interval belongs. Do not start it from a route handler or a middleware: both run per
request and would create one interval per request.

**Scrapes read the cache, never the database.** This is D-I2 and it is verifiable: AE2 in
the brainstorm requires that ten scrapes in a row produce at most one round of sampler SQL
per 60s. Build it so that `/metrics` cannot reach Postgres at all.

**Route pattern, not path.** AE5: opening three plant detail pages must produce one series
with `route="/plants/[id]"` and no UUID anywhere in the label set. Nitro exposes the
matched route on the event context. Verify this explicitly, because getting it wrong is
silent: the endpoint works, the board works, and Prometheus quietly grows one series per
plant forever.

**Care events count is a gauge, not a counter.** D-I3. `plantz_care_events_total` holds a
SQL `COUNT(*)` from the sampler, so a container restart does not reset it.

**Reuse CARE-02's and CARE-04's SQL helpers.** `plantz_reminders_open`,
`plantz_reminders_overdue` and `plantz_plant_care_age_seconds` must use the same
definitions as the app, or the board and the app will disagree about what is overdue.

**`size_bytes` backfill.** The column is added by a migration; the backfill over existing
MinIO objects is a one-off script under `scripts/`, in the shape of the existing
`compressExistingImages.ts`. New uploads set it inline in
`server/api/plants/[id]/photos/index.post.ts`.

## 5. Definition of Done

- [ ] `curl http://localhost:3000/metrics` returns Prometheus text format.
- [ ] Every metric in the brainstorm's inventory table is present, with the specified name,
      type and labels.
- [ ] Ten consecutive scrapes trigger at most one round of sampler SQL (AE2).
- [ ] Opening three plant detail pages produces exactly one `route="/plants/[id]"` series
      and no UUID in any label value (AE5).
- [ ] Stopping MinIO makes `plantz_minio_up` go to 0 while `plantz_db_up` stays 1 (AE6).
- [ ] `plantz_plant_care_age_seconds` has at most 20 series.
- [ ] `plantz_build_info` reports the commit SHA the image was built from.
- [ ] `photos.size_bytes` is populated for existing photos and set on new uploads.
- [ ] The sampler survives a Postgres blip: a failed sample logs and retries on the next
      tick instead of crashing the process.
- [ ] `pnpm test` still passes.

## 6. Verification

```bash
curl -s http://localhost:3000/metrics | head -40
# expect: HELP/TYPE lines, plantz_ prefix throughout

# No UUID labels (AE5)
curl -s http://localhost:3000/api/plants | jq -r '.data[0:3][].id' | while read id; do
  curl -so /dev/null "http://localhost:3000/plants/$id"
done
curl -s http://localhost:3000/metrics | grep plantz_http_requests_total | grep -c '[0-9a-f]\{8\}-[0-9a-f]\{4\}'
# expect: 0

# Sampler caching (AE2)
for i in $(seq 1 10); do curl -so /dev/null http://localhost:3000/metrics; done
# then inspect the Postgres log or the sampler's own log line
# expect: one sample round, not ten

# Cardinality cap
curl -s http://localhost:3000/metrics | grep -c '^plantz_plant_care_age_seconds{'
# expect: <= 20

# Dependency down (AE6)
ssh terry "docker stop minio"
sleep 65
curl -s http://localhost:3000/metrics | grep -E '^plantz_(minio|db)_up'
# expect: minio 0, db 1
ssh terry "docker start minio"
```

## 7. Risks

| Risk | Mitigation |
|------|------------|
| A raw path becomes a label value and Prometheus grows one series per plant | AE5 is in the DoD with an explicit grep for UUID-shaped strings |
| The sampler runs per request instead of once per process | The plugin location is called out in section 4, and AE2 catches it |
| A slow sampler query blocks the event loop or piles up | Each tick logs its duration; if a tick is still running the next one is skipped |
| A Postgres outage crashes the process through an unhandled sampler rejection | Explicit DoD item: log and retry, do not crash |
| `prom-client` default metrics add Node internals nobody asked for | Register them deliberately or not at all; the inventory table is the contract |
| The `size_bytes` backfill hammers MinIO | It is a one-off script, run once, not part of startup |

## 8. Open Questions

- [x] **Q-I1** recommendation applied: `prom-client`.
- [x] **Q-I2** recommendation applied: a `size_bytes` column with a one-off backfill.
- [x] **Q-I3** resolved in section 4: the sampler lives in a `server/plugins/` plugin.

## 9. Implementation Notes Added During the Work

- **D-I5 Nitro's catch-all had to be excluded by hand for AE5 to mean anything.** Every
  page request matches `event.context.matchedRoute.path === '/**'`, so using the matched
  route verbatim produced a single `route="/**"` series for the whole app. That passes a
  naive reading of AE5 (one series, no UUID) while telling the board nothing. The
  middleware ignores any matched route containing `*` and falls through to a path
  normaliser, which replaces UUID and numeric segments with `[id]`. API routes keep their
  real pattern, so the label set is a mix of `/api/plants/:id` and `/plants/[id]`.

- **D-I6 The dependency gauges are probed by the sampler, not only by the status
  handlers.** Section 3.1 says the two existing handlers become the probe source, and they
  do set the gauges when hit. On their own that is not enough for AE6: the acceptance test
  stops MinIO, waits 65 seconds and scrapes, with no request to `/api/minio-status` in
  between. `probeDependencies()` therefore runs on every sampler tick as well.

- **D-I7 `size_bytes` is written at all three photo insert sites, not one.** Section 4
  names `server/api/plants/[id]/photos/index.post.ts`. Two others also insert into
  `photos`: `server/api/plants/index.post.ts` (a photo supplied while creating a plant)
  and `server/api/notes/index.post.ts` (photos attached to a note). All three now set the
  column and increment the upload counters, or `plantz_photo_bytes` would drift below the
  truth over time.

- **D-I8 The `/metrics` route is a nitro route, not an API route**, so it is reachable at
  `/metrics` rather than `/api/metrics`, and the middleware skips it: counting the scrape
  would add a series that only Prometheus causes.

- **D-I9 No default Node metrics are registered.** `prom-client` can add process and heap
  gauges with one call. The inventory table is the contract, so the registry holds exactly
  the 22 metrics it lists and nothing else.

## 10. Verification Results, 2026-08-08

Against a local Postgres with four plants, two rooms, four care events and two reminders.

| Check | Expected | Observed |
|---|---|---|
| `/metrics` format | Prometheus text | `# HELP` / `# TYPE`, `plantz_` throughout |
| Inventory completeness | 22 metrics, right types | all 22 present, types match |
| AE2 sampler caching | 10 scrapes, at most one sample | `plantz_db_query_duration_seconds_count` unchanged at 42, sampler timestamp unchanged |
| AE5 route labels | one series, no UUID | `plantz_http_requests_total{route="/plants/[id]",method="GET",status="200"} 3`, zero UUID-shaped label values |
| Cardinality cap | at most 20 series | 3 series, `plantsWithInterval(20)` asserted by test |
| AE6 dependency down | minio 0, db 1 | `plantz_db_up 1`, `plantz_minio_up 0` |
| `plantz_build_info` | build arg | `plantz_build_info{version="local-ins01-test"} 1` |
| Postgres outage | process survives | container stopped, `/metrics` still answered 200, process alive; the log-and-retry path is covered by a test |

Two DoD items could not be exercised locally and are noted rather than claimed:

- **The `size_bytes` backfill over existing objects.** The local database has no photos and
  no MinIO instance behind it. The script exists as `pnpm db:backfill-photo-sizes` and is
  meant to run once against terry after this deploys.
- **AE6 against terry's MinIO.** Verified by pointing the local app at an unreachable MinIO
  endpoint instead of stopping the real one, which would have interrupted the running app
  for the duration of the test. Same code path, same gauge.
