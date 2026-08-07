---
id: EPIC-PLANTZ-CARE
type: main
status: open
priority: P0
owner: Dennis Fink
created: 2026-08-07
subs: [CARE-01, CARE-02, CARE-03, CARE-04]
---

# [EPIC-PLANTZ-CARE] Care Events & the Time Axis

> **PRD type:** Main / Epic. Describes the **WHAT**, not the HOW.
> Implementation detail belongs in the linked sub-PRDs.

## 1. Summary

plantz records what a plant is: name, species, room, status, parent plant, plus photos and
notes. It records almost nothing about what happened to it. `plants.status` is a single
enum column that gets overwritten, so a plant that was sick in March and is healthy now
looks like it was always healthy. Watering, fertilizing and repotting are recorded nowhere.
The `reminders` table has existed since `initial.sql` and no API route in `server/api/`
touches it.

This epic gives the data a time axis and turns reminders from a dormant table into a
working feature. It is the feature expansion that EPIC-PLANTZ-INSIGHT depends on: a board
over today's schema would show flat lines.

Exit state: the app can answer "when was this last watered", "what is overdue", "how long
was this plant sick" and "how many care actions happened this week".

## 2. Motivation & Context

Verified against `main` (4d935f8).

**Care actions leave no trace.** There is no table, no endpoint and no UI for watering,
fertilizing or repotting. The information exists only in free-text notes, written by a
human in whatever wording felt right that day.

**Reminders are half-built.** `reminders` has `plant_id`, `remind_at`, `message` and
`created_at`. It has no completion column, so a reminder is never open or done, only
present. `find server/api -name "*reminder*"` returns nothing: there is no way to create
one, list one or complete one. The table has been dead since March 2025.

**Status has no history.** `003-add-status-to-plants.sql` added a `plant_status` enum
column. Every write overwrites the previous value. `server/api/plants/[id]/bury/index.post.ts`
sets it to `dead` and the fact that the plant was sick for two months before that is gone.

**Nothing knows when a plant is due.** The board's Care Backlog panel ranks plants by time
since last watering. Neither the "last watering" nor the "should be watered every N days"
side of that comparison exists in the schema.

## 3. Goals & Non-Goals

### 3.1 Goals (WHAT)

- **Care actions are events.** Watering, fertilizing and the rest are rows with a
  timestamp, appended and never updated.
- **Reminders work end to end.** Create, list, complete, and recurring reminders produce
  their next occurrence.
- **Status changes are history.** Every status transition is recorded with the time it
  happened.
- **Due is computable.** For any plant the app can answer "is it overdue and by how long"
  from data, not from memory.
- **Logging is one tap.** Every table added here has a UI that writes to it. A table
  nothing writes to is worthless.

### 3.2 Non-Goals (explicitly excluded)

- **No care planning engine.** Logging a watering, yes. Species-specific schedules derived
  from a plant database, no.
- **No push notifications.** Overdue is visible in the app and on the board. Nothing pushes.
- **No backfill of invented history.** History starts on the day of the migration. Plausible
  looking fake watering dates would make the first weeks of every history panel fiction.
- **No note parsing.** Existing notes are not mined for past waterings. They are free text
  and parsing them would be guesswork.
- **No redesign** of the existing plants, rooms, notes and photos UI beyond adding the
  logging entry points.

## 4. Definition of Done (epic exit criteria)

- [ ] Logging a watering in the UI creates a row in `care_events` with the correct
      `plant_id`, `type` and `occurred_at`.
- [ ] A plant detail page shows the last watering and the last fertilizing, read from
      `care_events`.
- [ ] A reminder can be created, listed, and marked done; a done reminder no longer counts
      as open.
- [ ] A recurring reminder, once completed, produces its next occurrence without manual
      input.
- [ ] Changing a plant's status, including burying it, appends a row to
      `plant_status_events` with the old and new value.
- [ ] A query returns every plant that is overdue for watering, ordered by how overdue it
      is.
- [ ] No existing plant, photo or note was modified by any migration in this epic.

## 5. Scope (sub-PRDs)

| ID | Title | Prio | Depends on | Loopable |
|----|-------|------|------------|----------|
| [CARE-01](../subs/care-01-care-events.md) | Care Events | P0 | DEL-01 | yes |
| [CARE-02](../subs/care-02-reminders-end-to-end.md) | Reminders End to End | P0 | DEL-01 | yes |
| [CARE-03](../subs/care-03-plant-status-history.md) | Plant Status History | P1 | DEL-01 | yes |
| [CARE-04](../subs/care-04-watering-due-dates.md) | Watering Due Dates | P1 | CARE-01 | yes |

CARE-01, CARE-02 and CARE-03 are independent of each other. CARE-04 needs care events to
compare against.

## 6. Risks & Assumptions

| Risk / assumption | Impact | Mitigation |
|-------------------|--------|------------|
| The chosen care types do not match the real routine | Half the buttons go unused and a sixth type is missing | Q-C1 decides the day-one list; the type column is text-backed so adding one is a migration, not a redesign |
| Every panel in EPIC-PLANTZ-INSIGHT starts empty | The board looks broken for the first weeks | Accepted, see D-C3. Empty is honest, fake data is not |
| A watering interval per plant means maintaining it per plant | 30 plants times one number, entered by hand, and it rots | Q-C2 decides the source; the interval is nullable so an unset plant simply never goes overdue |
| Recurring reminders can pile up if the app is unused for weeks | A backlog of 12 overdue occurrences for one plant | CARE-02 generates the next occurrence relative to the completion, not to the missed date |
| Assumption: plantz stays the only writer to its schema | Counts sampled in INS-01 are authoritative | Holds as long as migrations run through the app |

## 7. Open Questions

- [ ] **Q-C1** [CARE-01] Which care types on day one? `watering` and `fertilizing` are
      certain. `repotting`, `pruning` and `treatment` are guesses at the actual routine.
      Recommendation: ship all five. An unused type costs one row in an enum.
- [ ] **Q-C2** [CARE-04] Is the watering interval a property of the plant (a column), of
      the species (a lookup table), or purely a recurring reminder? Recommendation: a
      nullable column on `plants`. A species lookup needs a species database that does not
      exist, and a reminder-only model cannot answer "how overdue" for plants without one.
- [ ] **Q-C3** [CARE-01] Can a care action be logged for a past date, or only for now?
      Recommendation: default to now with an optional date field. Watering on Saturday and
      logging on Monday is the normal case.
- [ ] **Q-C4** [CARE-01] Does a care event carry a note, or does it link to an existing
      `notes` row? Recommendation: a plain nullable `note` text column. Linking two tables
      for "watered, soil was bone dry" is more structure than the fact deserves.

## 8. Decisions Taken

- **D-C1** Care events go into an append-only table, not a `last_watered_at` column on
  `plants`. A column answers "when last" and nothing else. The table answers that plus
  every rate and history question.
- **D-C2** Status history goes into its own table rather than being reconstructed from
  notes. See the non-goal on note parsing.
- **D-C3** No backfill of invented history. Care and status history start on the day of the
  migration.
- **D-C4** Every sub-PRD in this epic ships its UI in the same change as its table. A
  schema-only change here would be indistinguishable from no change at all.
- **D-C5** Reminders keep their existing table and are extended, not replaced. The table is
  empty in production, so the migration carries no data risk.

## 9. References

- [backlog.md](../backlog.md), the queue and the loop rules
- `homelab-root/docs/brainstorms/plantz-dashboard-requirements.md`, which panels need which
  of these tables
- `server/db/migrations/initial.sql`, the `reminders` table as it stands
- `server/api/plants/[id]/bury/index.post.ts`, the second place that writes `plants.status`
