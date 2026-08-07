---
id: CARE-02
epic: EPIC-PLANTZ-CARE
title: Reminders End to End
status: done
priority: P0
depends_on: [DEL-01]
repo: plantz
loopable: true
---

# [CARE-02] Reminders End to End

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-CARE](../epics/epic-care.md)

## 1. Goal

Turn `reminders` from a table that has been empty and unreachable since March 2025 into a
working feature: create, list, complete, and recurring reminders that produce their next
occurrence.

## 2. Current State (verified against `main` 4d935f8)

- `reminders` exists in `initial.sql` with `id`, `plant_id`, `remind_at`, `message`,
  `created_at`.
- `find server/api -name "*reminder*"` returns nothing. No endpoint creates, reads,
  updates or deletes a reminder.
- No UI mentions reminders.
- `db-types.ts` contains a `Reminders` type, generated from the table, used nowhere.
- There is no completion column, so a reminder cannot be open or done, only present.
- The README's feature list promises "get reminded to take care of them". Nothing in the
  code delivers it.

This is the largest gap between what the project claims and what it does.

## 3. Scope

### 3.1 In Scope

- Migration `006-extend-reminders.sql`:
  - `completed_at TIMESTAMP NULL`
  - `recurrence_days INT NULL`
  - Index on `(completed_at, remind_at)`, the access path for "what is open and overdue"
- Endpoints:
  - `POST /api/reminders` create
  - `GET /api/reminders` list, with a filter for open, overdue and completed
  - `POST /api/reminders/[id]/complete` mark done
  - `DELETE /api/reminders/[id]` remove
  - `GET /api/plants/[id]/reminders` a plant's reminders
- Completing a reminder with `recurrence_days` set creates the next occurrence, dated
  `recurrence_days` after the completion time.
- A `useReminders()` composable in the established shape.
- UI:
  - An overdue and upcoming list on the start page (`app/pages/index.vue`)
  - Create and complete controls on the plant detail page
- Tests: create, complete, complete a recurring reminder, list filters.

### 3.2 Out of Scope

- Push notifications, email or any other outbound channel. The app shows them, nothing
  pushes. This is a stated non-goal of the parent epic.
- A calendar view.
- Snoozing. Completing and re-creating covers it.
- Linking a reminder completion to a care event. Tempting, and wrong: completing "check
  for spider mites" is not a care action. Recorded as Q-CARE2-2.
- Editing a reminder's text or date after creation. Delete and re-create.

## 4. Implementation Notes

**Open, overdue and done are derived, not stored:**

- open: `completed_at IS NULL`
- overdue: `completed_at IS NULL AND remind_at < now()`
- done: `completed_at IS NOT NULL`

INS-01 samples exactly these definitions for `plantz_reminders_open` and
`plantz_reminders_overdue`. Keep them in one SQL helper so the app and the sampler cannot
drift apart.

**Recurrence is relative to completion, not to the due date.** A reminder due every 7 days,
completed 3 days late, recurs 7 days after the completion. The alternative, recurring from
the original due date, produces a backlog of missed occurrences when the app goes unused
for a few weeks. This is the parent epic's mitigation for that risk.

**The next occurrence is a new row.** Completing sets `completed_at` on the existing row
and inserts a fresh row with the same `plant_id`, `message` and `recurrence_days`. The
history of what was completed when stays intact, which is what makes the reminder panels
on the board meaningful.

**Both operations belong in one transaction.** Setting `completed_at` and inserting the
successor must not half-happen.

**The start page is where reminders earn their place.** `app/pages/index.vue` is what gets
opened. A reminder list on the plant detail page only is a list nobody sees.

## 5. Definition of Done

- [ ] `006-extend-reminders.sql` is applied by the DEL-01 runner.
- [ ] `POST /api/reminders` creates a reminder with a plant, a date and a message.
- [ ] `GET /api/reminders?filter=overdue` returns only reminders that are open and past
      due.
- [ ] `POST /api/reminders/:id/complete` sets `completed_at` and the reminder stops
      appearing in the open list.
- [ ] Completing a reminder with `recurrence_days: 7` creates exactly one new open
      reminder dated 7 days after the completion.
- [ ] Completing a reminder without `recurrence_days` creates no successor.
- [ ] The start page lists overdue and upcoming reminders, with a control to complete one.
- [ ] The plant detail page can create a reminder for that plant.
- [ ] `pnpm test` covers create, complete, recurring completion and the list filters.

## 6. Verification

```bash
# Create
curl -sX POST http://localhost:3000/api/reminders -H 'content-type: application/json' \
  -d '{"plant_id":"<uuid>","remind_at":"2026-08-01T09:00:00Z","message":"repot","recurrence_days":7}' | jq -r .data.id
# expect: an id, and remind_at in the past so it counts as overdue

# Overdue filter
curl -s "http://localhost:3000/api/reminders?filter=overdue" | jq '.data | length'
# expect: at least 1

# Complete, and check the successor
curl -sX POST http://localhost:3000/api/reminders/<id>/complete | jq
curl -s "http://localhost:3000/api/reminders?filter=open" | jq '.data[] | {id, remind_at}'
# expect: the original is gone from open; one new row dated ~7 days from now

# Non-recurring
# create without recurrence_days, complete it
# expect: the open list does not grow

pnpm test   # expect: exit 0
```

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Recurrence from the due date piles up missed occurrences | Recurrence is relative to completion. Stated in section 4 and in the DoD |
| Completing and creating the successor half-fails | One transaction |
| The open and overdue definitions drift between the app and the INS-01 sampler | One shared SQL helper, referenced by both |
| Reminders sit only on the detail page and go unnoticed | The DoD puts them on the start page |
| Timezone confusion between `remind_at` in UTC and a local "overdue today" | The columns are `TIMESTAMP` without zone, matching the rest of the schema. Keep everything in one interpretation and do not mix `now()` with client-side dates |

## 8. Open Questions

- [x] **Q-CARE2-1** settled as recommended: a reminder requires a plant, or can it be standalone ("buy
      fertilizer")? Recommendation: require a plant. `plant_id` is already a foreign key,
      and a general todo list is a different application.
- [x] **Q-CARE2-2** settled as recommended, no coupling. Completing a "water the fern" reminder also log a watering care
      event? Recommendation: no, not automatically. The two actions mean different things
      and coupling them makes the care history a guess. Revisit once both features have
      been used for a while.

## 9. Implementation Notes Added During the Work

- **D-C2 The recurrence interval is built with `make_interval`, not string concatenation.**
  The first version wrote `now() + ($2 || ' days')::interval` and reused `$2` for the
  `recurrence_days` column. Concatenating binds the parameter as text, and Postgres then
  refuses it for an integer column: `column "recurrence_days" is of type integer but
  expression is of type text`. `now() + make_interval(days => $2::int)` keeps one integer
  parameter for both uses.

  The failure was useful: it proved the transaction requirement from section 4. The
  `UPDATE` that set `completed_at` had already run when the `INSERT` failed, and
  `completed_at` was still `NULL` afterwards, so the rollback did its job.

- **D-C3 Completing an already completed reminder answers 409.** Section 3.1 does not say
  what should happen, and without a guard a double tap would set a second `completed_at`
  and insert a second successor. The row is selected `FOR UPDATE` and a completed one is
  refused.

- **D-C4 The start page awaits its reminder fetch.** The other data on
  `app/pages/index.vue` is loaded without `await`, which is fine for counters that appear
  a moment later. The reminder list is the reason the page is worth opening, so it is
  awaited and arrives in the server-rendered HTML.

- **Q-CARE2-1 applied at the endpoint, not in the schema.** `reminders.plant_id` stays
  nullable, because section 3.1 lists only `completed_at`, `recurrence_days` and the index
  for migration 006. `POST /api/reminders` answers 400 without a `plant_id`.

Verified on 2026-08-07 against a local Postgres: an overdue recurring reminder appears
under `filter=overdue`, completing it produces exactly one successor dated seven days
after the completion, completing a non-recurring one produces none and shrinks the open
list by one, and the start page server-renders both an overdue and an upcoming entry with
a completion control.
