---
id: INS-03
epic: EPIC-PLANTZ-INSIGHT
title: "Grafana Board: Service: Plantz"
status: done
priority: P1
depends_on: [INS-02]
repo: homelab-root
loopable: true
---

# [INS-03] Grafana Board `Service: Plantz`

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-INSIGHT](../epics/epic-insight.md)

**This sub-PRD is worked in `homelab-root`, not in the plantz repository.**

## 1. Goal

A file-provisioned `Service: Plantz` board that answers two questions on one page: is the
app healthy, and do the plants need something.

The full panel layout is specified in
`homelab-root/docs/brainstorms/plantz-dashboard-requirements.md`, section "Dashboard
Layout": six bands, each 24 grid columns wide, with panel titles, queries, units and
widths. Build against that table.

## 2. Current State (verified 2026-08-07)

- `ansible/roles/monitoring/files/` contains `dashboard-host-cerf.json`,
  `dashboard-host-grace.json`, `dashboard-service-adguard.json`,
  `dashboard-service-autismus-alarm.json` and `dashboard-service-ddns-worker.json`.
- `ansible/roles/monitoring/tasks/main.yml` has a "Deploy service dashboards" task copying
  `dashboard-service-{{ item }}.json` to `/srv/monitoring/dashboards/Services/service-{{ item }}.json`,
  looping over `adguard`, `autismus-alarm`, `ddns-worker`.
- The naming convention is documented in
  `docs/brainstorms/dashboard-naming-convention-requirements.md`.
- The same task file contains a "Remove pre-convention dashboard files" task with a comment
  explaining that deleting the file is what deletes the dashboard.

## 3. Scope

### 3.1 In Scope

- `ansible/roles/monitoring/files/dashboard-service-plantz.json`, following the convention:
  title `Service: Plantz`, uid `service-plantz`, folder `Services`, tag `service`.
- Add `plantz` to the loop in the "Deploy service dashboards" task.
- All six bands from the brainstorm's layout table.
- Refresh `1m`, default time range `now-7d` (R13).
- Verify every panel query against live Prometheus before committing the JSON (R14).
- Run the playbook and confirm the board renders.

### 3.2 Out of Scope

- Alert rules. Thresholds are chosen once real data exists.
- A `Host: terry` board.
- Changing any existing dashboard.
- Adding metrics. If a panel needs a series that does not exist, that is an INS-01 change
  and this sub-PRD stops until it lands.

## 4. Implementation Notes

**Verify every query before committing the board.** R14 makes this explicit and it is the
step that separates a working board from a page of "No data" panels. For each panel, run
the query against Prometheus on cerf and confirm it returns a series:

```bash
ssh cerf "curl -sG localhost:9090/api/v1/query --data-urlencode 'query=<PROMQL>'" | jq '.data.result | length'
```

A zero result is either a wrong query or a missing metric. Both need fixing before the JSON
is committed, not after.

**Empty is expected for history panels.** Care history starts on the day of the CARE-01
migration (D-C3). Panels over `now-7d` will be sparse for the first week and that is
correct, not a bug to work around with fake data.

**Copy structure, not content.** `dashboard-service-ddns-worker.json` is the closest
working example for a service board. Take its provisioning-relevant fields (uid, tags,
schema version, datasource references) and build the panels fresh.

**Care Backlog is the panel that justifies the board.** `topk(15,
plantz_plant_care_age_seconds{type="watering"})` as a bargauge with green/yellow/red
thresholds. If only one panel works, it should be this one.

**Deleting the file deletes the board.** Noted in the task file already. Relevant here only
if the board is ever renamed: the old file has to go in the same change.

## 5. Definition of Done

- [ ] `dashboard-service-plantz.json` exists and follows the naming convention: title
      `Service: Plantz`, uid `service-plantz`, tag `service`.
- [ ] `plantz` is in the "Deploy service dashboards" loop.
- [ ] All six bands from the layout table are present with the specified panels and widths.
- [ ] Every panel query was run against Prometheus and returned a series before the JSON
      was committed.
- [ ] The board renders in the Services folder with no "No data" panel other than the
      history panels in their first week.
- [ ] Refresh is `1m` and the default range is `now-7d`.
- [ ] Watering a plant in the app drops its bar in Care Backlog and increases Care Actions
      7d within one scrape interval (AE3).
- [ ] Marking a reminder done decreases Open Reminders and never makes Overdue negative
      (AE4).
- [ ] Re-running the playbook unchanged reports zero changes (AE7).

## 6. Verification

```bash
# Query check, per panel, before committing
ssh cerf "curl -sG localhost:9090/api/v1/query --data-urlencode 'query=topk(15, plantz_plant_care_age_seconds{type=\"watering\"})'" | jq '.data.result | length'
# expect: > 0

# Apply
cd ~/Workspace/Projects/Private/Dennis/homelab-root
ansible-playbook -i ansible/inventory/hosts.yml <monitoring playbook>

# Board present
ssh cerf "ls /srv/monitoring/dashboards/Services/"
# expect: service-plantz.json among the others

# End to end (AE3): water a plant in the app, then
ssh cerf "curl -sG localhost:9090/api/v1/query --data-urlencode 'query=plantz_care_events_total{type=\"watering\"}'" | jq '.data.result[0].value[1]'
# expect: incremented within one scrape interval

# Idempotence (AE7)
ansible-playbook -i ansible/inventory/hosts.yml <monitoring playbook>
# expect: changed=0
```

## 7. Risks

| Risk | Mitigation |
|------|------------|
| Panels are committed without being verified and the board is a wall of "No data" | R14 and the DoD both require per-panel verification. This is the failure mode the AdGuard board already taught |
| History panels look broken in the first week | Expected, documented in section 4, and the reason the default range is 7d rather than 6h |
| A panel needs a metric INS-01 did not produce | Stop and change INS-01. Do not invent a query that approximates it |
| Grafana schema version mismatch with the file provisioner | Copy the schema fields from a board that currently renders |
| The board is committed but the loop is not updated, so nothing deploys | Both are in the DoD |

## 8. Open Questions

- [x] **Q-I4** settled while verifying: one panel with a second Y axis. `plantz_photos`
      counts in the tens and `plantz_photo_bytes` in the millions, so a shared axis would
      flatten the count to the zero line. A field override puts "Stored bytes" on the right
      axis with unit `bytes`. Two stacked panels would have cost a band's worth of height
      for the same information.

## 9. Implementation Notes Added During the Work

- **D-I11 The error-rate query returned nothing rather than zero.** Written as
  `sum(rate(plantz_http_requests_total{status=~"5.."}[5m])) / …`, the numerator's selector
  matches no series while the app has served no 5xx at all, `sum()` over an empty set
  returns no series, and the division yields nothing. The panel would have read "No data"
  in exactly the situation it is meant to report as healthy. Fixed with `or vector(0)`
  around the numerator. This is the failure R14 exists to catch, and it only showed up
  because every query was run before the JSON was committed.

- **D-I12 AE3 and AE4 were verified against a throwaway plant, not a real one.** Both
  acceptance tests require logging a watering and completing a reminder on terry. Doing
  that on one of the real plants would have written a watering that never happened into the
  history the whole CARE epic exists to make trustworthy. A plant named `AE3 Probe` was
  created, used for both tests, and deleted afterwards; the cascade took its care event and
  its reminder with it. Verified afterwards: zero rows left in `plants`, `care_events` and
  `reminders` for that id.

- **D-I13 The AI Analyses panel has no series yet and that is correct.** Section 4 says a
  zero result is either a wrong query or a missing metric. Here it is neither:
  `plantz_ai_analyses_total` is a counter whose label combinations only materialise on the
  first analysis. It joins the history panels in section 4's "empty is expected" note.

## 10. Verification Results, 2026-08-08

Panel queries, all 23 run against live Prometheus on cerf before committing:

| Result | Count | Which |
|---|---|---|
| Returned a series | 22 | every panel except one target |
| Returned nothing | 1 | `AI Analyses` target A, no analysis has run on terry yet |

Acceptance tests:

| Test | Expected | Observed |
|---|---|---|
| Board provisioned | in Services, right uid and tag | `Service: Plantz \| uid: service-plantz \| folder: Services \| tags: ['service']` |
| AE3 watering | care actions up, backlog bar down | `plantz_care_events_total{type="watering"}` 1 → 2, `plantz_plant_care_age_seconds` 864246 s → 602 s |
| AE4 reminder done | open down, overdue never negative | open 1 → 0, overdue 1 → 0 |
| AE7 idempotence | changed=0 | `ok=30 changed=0 failed=1` |

The `failed=1` is the AdGuard collector's 401, recorded as B-I1 in INS-02 and unrelated to
this sub-PRD. The dashboard tasks deliberately do not notify the restart handler, so the
board deployed and was picked up by the file provisioner within its 10 second poll despite
the play aborting later.
