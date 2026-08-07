---
id: CARE-03
epic: EPIC-PLANTZ-CARE
title: Plant Status History
status: open
priority: P1
depends_on: [DEL-01]
repo: plantz
loopable: true
---

# [CARE-03] Plant Status History

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-CARE](../epics/epic-care.md)

## 1. Goal

Every status change is recorded with the time it happened, so "how long was this plant
sick" becomes answerable. And, first: make the status changeable at all.

## 2. Current State (verified against `main` 4d935f8)

`003-add-status-to-plants.sql` added a `plant_status` enum
(`healthy`, `sick`, `dead`, `needs_repotting`) and a `plants.status` column defaulting to
`healthy`.

Searching for writes to that column across `server/api/` returns exactly one:

- `server/api/plants/[id]/bury/index.post.ts:9`, `SET status = $2`

Not one other endpoint sets it:

- `server/api/plants/index.post.ts:27` inserts `name, species, parent_plant_id, location,
  room_id`. Status falls back to the `healthy` default.
- `server/api/plants/[id]/index.put.ts:6` updates `name, species, location, room_id,
  parent_plant_id`. Status is absent.

So the enum has four values and the application can reach two of them: `healthy` on
creation and whatever `bury` sets. There is no way to mark a plant sick or needing a repot.

Side observation while reading `index.put.ts`: the parameter list is
`$1, $2, $3, $4, $6`, skipping `$5`. Whatever `$5` used to be, it is gone, and this
sub-PRD touches that query anyway.

## 3. Scope

### 3.1 In Scope

- Migration `008-add-status-history.sql`: table `plant_status_events` with `id` UUID PK,
  `plant_id` UUID FK cascade, `from_status plant_status NULL`, `to_status plant_status NOT
  NULL`, `changed_at TIMESTAMP NOT NULL DEFAULT now()`, `note TEXT NULL`. Index on
  `(plant_id, changed_at DESC)`.
- Make status settable: add `status` to `PUT /api/plants/[id]`, and fix the `$5` gap while
  in that query.
- UI: a status control on the plant detail page, in the existing edit modal, offering all
  four enum values.
- Write an event on every status transition, from both the PUT endpoint and `bury`.
- No event when a PUT sets the status to the value it already has.
- `GET /api/plants/[id]/status-history` listing transitions, newest first.
- Show the history on the plant detail page, as a simple list of "healthy to sick, 3 weeks
  ago".
- Tests: a transition writes one event with the correct `from_status`; a no-op write
  writes nothing; `bury` writes an event.

### 3.2 Out of Scope

- Backfilling history from notes or from `created_at`. D-C3: history starts at the
  migration.
- Removing `plants.status`. It stays as the fast current-value column, which every list
  query already reads.
- New enum values. Four is what exists.
- Status-based filtering or search in the plant list.
- A metric or panel. INS-01 reads this table.

## 4. Implementation Notes

**The table alone is worthless.** This is the concrete case of D-C4 in the parent epic:
adding `plant_status_events` without making the status settable would produce a table with
one possible transition in it, written only when a plant dies. The status control is not a
nice extra here, it is what makes the table have content.

**Both write sites, one helper.** `bury` and the PUT endpoint both need to read the old
value, write the new one, and append the event. Put that in one function in
`server/utils/`, so a third write site added later cannot silently skip the event.

**Read-then-write is a race in theory.** Two concurrent status changes could record the
same `from_status`. With one user and one browser this is not a real scenario. Doing the
read and the write in one statement with a `RETURNING` clause avoids it anyway and is not
harder.

**`from_status` is nullable** so the row can express "created as healthy" if that is ever
recorded. Day one, only real transitions produce rows.

**Do not couple to care events.** Marking a plant as `needs_repotting` is a status, and
repotting it is a care event. They are related in the head and separate in the schema.

## 5. Definition of Done

- [ ] `008-add-status-history.sql` is applied by the DEL-01 runner.
- [ ] `PUT /api/plants/:id` accepts `status` and persists it.
- [ ] The `$5` parameter gap in the PUT query is gone.
- [ ] The plant detail edit modal offers all four status values and saving one persists.
- [ ] Changing a status from `healthy` to `sick` writes one row with
      `from_status='healthy'`, `to_status='sick'`.
- [ ] Saving the edit modal without changing the status writes no row.
- [ ] Burying a plant writes a row with `to_status='dead'`.
- [ ] `GET /api/plants/:id/status-history` returns the transitions, newest first.
- [ ] The plant detail page shows the history.
- [ ] `pnpm test` covers the three cases above and passes.

## 6. Verification

```bash
# Change status
curl -sX PUT http://localhost:3000/api/plants/<uuid> -H 'content-type: application/json' \
  -d '{"status":"sick"}' | jq

curl -s http://localhost:3000/api/plants/<uuid>/status-history | jq '.data[0]'
# expect: from_status "healthy", to_status "sick"

# No-op write
curl -sX PUT http://localhost:3000/api/plants/<uuid> -H 'content-type: application/json' \
  -d '{"status":"sick"}'
curl -s http://localhost:3000/api/plants/<uuid>/status-history | jq '.data | length'
# expect: still 1

# Bury
curl -sX POST http://localhost:3000/api/plants/<uuid>/bury -H 'content-type: application/json' -d '{}'
curl -s http://localhost:3000/api/plants/<uuid>/status-history | jq '.data[0].to_status'
# expect: "dead"

pnpm test   # expect: exit 0
```

## 7. Risks

| Risk | Mitigation |
|------|------------|
| The table gets built and the status stays unreachable, so it stays empty | Making status settable is in the DoD, not implied |
| A future third write site forgets to append an event | One shared helper does both, and no endpoint writes `plants.status` directly |
| Fixing the `$5` gap changes PUT behaviour in an unintended way | The PUT has no test today. Add one for the existing fields alongside the status test |
| `bury` does more than set a status and the helper breaks it | Read `bury/index.post.ts` fully before changing it. It is a small file |

## 8. Open Questions

- [ ] **Q-CARE3-1** Should a status change carry a note ("leaves yellowing")? The column is
      in scope as nullable. Recommendation: include the column, leave the UI field for
      later if the control feels cluttered.
- [ ] **Q-CARE3-2** What was `$5` in the PUT query? Recommendation: do not archaeologise.
      Rewrite the statement with contiguous parameters and verify every field it updates
      still round-trips.
