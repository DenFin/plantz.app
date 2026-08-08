---
id: CARE-04
epic: EPIC-PLANTZ-CARE
title: Watering Due Dates
status: done
priority: P1
depends_on: [CARE-01]
repo: plantz
loopable: true
---

# [CARE-04] Watering Due Dates

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-CARE](../epics/epic-care.md)

## 1. Goal

The app can answer "which plants are overdue for watering, and by how much", from data.
This is the source for the Care Backlog panel, the reason flow F1 in the dashboard
brainstorm exists at all.

## 2. Current State

After CARE-01, `care_events` records when a plant was watered. Nothing records how often it
should be. Without the second half, "overdue" is not computable: 12 days since the last
watering is neglect for a fern and normal for a cactus.

`plants` has `id`, `user_id`, `name`, `species`, `location`, `created_at`, `room_id`,
`status`, `parent_plant_id`. No interval column of any kind.

## 3. Scope

### 3.1 In Scope

- Migration `007-add-watering-interval.sql`: `plants.watering_interval_days INT NULL`.
  Nullable on purpose, see section 4.
- The interval is editable in the existing plant edit modal on
  `app/pages/plants/[id].vue` and settable on `app/pages/plants/create.vue`.
- A SQL helper that returns, per plant: last watering, interval, due date, and days
  overdue. One definition, used by the API, the UI and the INS-01 sampler.
- `GET /api/plants/due` returning overdue plants ordered by how overdue they are.
- Plant detail page: shows next due date, or "no interval set".
- Start page: an "needs water" list, alongside the reminders from CARE-02.
- Tests: a plant with an interval and an old watering is overdue; a plant with no interval
  never is; a plant watered today is not.

### 3.2 Out of Scope

- Species-based defaults. Q-C2 settled against a species lookup: the species database does
  not exist and inventing one is a different project.
- Seasonal adjustment (less water in winter). Real, and a rabbit hole.
- Automatically creating a reminder from an interval. The two features answer different
  questions, see Q-CARE4-1.
- Intervals for fertilizing or repotting. Watering is the one with a daily rhythm. The
  column name says `watering_` so adding others later is additive.
- The Grafana panel itself. INS-03 builds it, this sub-PRD makes the data exist.

## 4. Implementation Notes

**Nullable interval is the whole design.** A plant with `watering_interval_days IS NULL`
is never overdue and never appears in the due list. That means the feature works from day
one with zero plants configured, and gets better as intervals are filled in. The
alternative, a default interval for every plant, produces a due list of 30 plants on day
one that is meaningless and gets ignored.

**Due is derived, never stored:**

```sql
last_watering  = MAX(occurred_at) FROM care_events WHERE type='watering' AND plant_id = p.id
due_at         = last_watering + (p.watering_interval_days * INTERVAL '1 day')
days_overdue   = EXTRACT(days FROM now() - due_at)
```

A plant with an interval but no watering event yet: treat `created_at` as the baseline, so
a newly added plant becomes due after one interval rather than being overdue immediately.

**One SQL definition.** Put it in a view or a single query builder function in
`server/utils/`. The INS-01 sampler produces `plantz_plant_care_age_seconds` from the same
logic. Two copies of this query is how the board ends up disagreeing with the app.

**The sampler needs the top 20 by overdue days.** D-I4 in EPIC-PLANTZ-INSIGHT caps the
per-plant metric at 20 series. The helper should accept a limit so the sampler is a call,
not a second query.

## 5. Definition of Done

- [ ] `007-add-watering-interval.sql` is applied by the DEL-01 runner.
- [ ] The interval is editable in the plant edit modal and persists.
- [ ] `GET /api/plants/due` returns overdue plants, most overdue first.
- [ ] A plant with no interval never appears in that response.
- [ ] A plant with an interval and no watering event uses `created_at` as the baseline and
      is not immediately overdue.
- [ ] Logging a watering removes the plant from the due list.
- [ ] The plant detail page shows the next due date, or a clear empty state.
- [ ] The start page shows a needs-water list.
- [ ] The overdue definition exists once in the code, and INS-01 can call it with a limit.
- [ ] `pnpm test` covers the three cases in section 3.1 and passes.

## 6. Verification

```bash
# Set an interval
curl -sX PUT http://localhost:3000/api/plants/<uuid> -H 'content-type: application/json' \
  -d '{"watering_interval_days":7}' | jq

# Log a watering 10 days ago
curl -sX POST http://localhost:3000/api/plants/<uuid>/care -H 'content-type: application/json' \
  -d '{"type":"watering","occurred_at":"2026-07-28T09:00:00Z"}'

# Overdue
curl -s http://localhost:3000/api/plants/due | jq '.data[] | {name, days_overdue}'
# expect: the plant, roughly 3 days overdue

# Water it now
curl -sX POST http://localhost:3000/api/plants/<uuid>/care -H 'content-type: application/json' \
  -d '{"type":"watering"}'
curl -s http://localhost:3000/api/plants/due | jq '[.data[] | select(.id=="<uuid>")] | length'
# expect: 0

# No interval, never due
# set watering_interval_days to null on another plant, confirm it is absent from /due

pnpm test   # expect: exit 0
```

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Maintaining an interval per plant by hand and letting it rot | Nullable column: an unmaintained plant is simply absent from the list instead of producing a wrong one |
| The overdue query is duplicated between app and sampler and they diverge | One shared definition, explicitly in the DoD |
| A newly added plant with an interval shows as overdue on day one | `created_at` is the baseline when no watering event exists |
| Timezone or interval arithmetic off by a day | The verification uses a 10-day-old watering against a 7-day interval, so an off-by-one is visible rather than hidden |

## 8. Open Questions

- [x] **Q-C2** (parent epic) recommendation applied: a nullable column on `plants`, not a
      species lookup, not reminder-only.
- [x] **Q-CARE4-1** settled as recommended, no auto-created reminder. Should setting an interval automatically create a recurring reminder
      from CARE-02? Recommendation: no. The due list answers "what needs water now"; a
      reminder answers "remind me about this specific thing". Auto-creating one from the
      other means completing a reminder and watering a plant become two ways to do the
      same thing, and the care history stops being trustworthy.

## 9. Implementation Notes Added During the Work

- **D-C9 `PUT /api/plants/:id` now writes only the columns the body carries.** The
  verification in section 6 sends `{"watering_interval_days":7}` and nothing else. The old
  statement listed every column unconditionally, so that body wrote NULL over `name` and
  died on the NOT NULL constraint, rolled back, and answered 404. The endpoint builds its
  SET clause from the keys present in the body instead. A key that is present and null
  still clears the column, which is how an interval gets removed again. Two tests cover
  both halves.

  This also removes the last trace of the `$5` gap from CARE-03: parameters are numbered as
  the clause is built, so there is nothing left to skip.

- **D-C10 The due definition lives in `server/utils/wateringDue.ts` and has three entry
  points over one select.** `overduePlants()` is the select plus a due filter,
  `plantsWithInterval()` is the select as is, and `wateringDueForPlant()` is the select for
  one id. INS-01 calls the second with `limit: 20` for its per-plant series, which is why
  the limit is a parameter rather than something the sampler appends.

- **D-C11 The detail page reads the due date from the server, not from arithmetic in the
  page.** `GET /api/plants/:id` carries a `wateringDue` object from the shared helper. A
  computed date in the component would have been a second definition, which is exactly the
  drift section 4 warns about.

- **D-C12 Mixing local and UTC timestamps costs a day, as the risk table predicted.**
  Verifying with a locally-formatted `date -v-10d` against a Postgres container running in
  UTC reported 2 days overdue instead of 3, a two-hour offset landing on the wrong side of
  a day boundary. With `date -u -v-10d` it reports 3. Nothing in the code is wrong: it is
  the "do not mix `now()` with client-side dates" note in section 4, demonstrated. The UI
  never constructs these timestamps, the one-tap path sends no date at all.

Verified on 2026-08-08 against a local Postgres:

```
interval 7, watered 10 days ago (UTC)  -> due list: 3 days overdue
watered again just now                 -> due list: empty
interval 7, never watered, created today -> absent, created_at is the baseline
no interval at all                     -> absent
interval set back to null              -> column cleared
```

The start page renders "3 days overdue, every 7 days, last watered 29. Juli 2026" with a
one-tap Water button, and the detail page renders
"Next watering: 5. August 2026 (3 days overdue)".
