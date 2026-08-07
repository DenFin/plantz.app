---
id: EPIC-PLANTZ-INSIGHT
type: main
status: open
priority: P1
owner: Dennis Fink
created: 2026-08-07
subs: [INS-01, INS-02, INS-03]
---

# [EPIC-PLANTZ-INSIGHT] Metrics & the Grafana Board

> **PRD type:** Main / Epic. Describes the **WHAT**, not the HOW.
> Implementation detail belongs in the linked sub-PRDs.

## 1. Summary

plantz is invisible to the monitoring stack that watches every other service in the
homelab. It runs on terry, which appears in `ansible/inventory/hosts.yml` with no
Prometheus job pointing at it. Nothing measures HTTP requests, photo uploads, OpenRouter
analyses or Postgres queries, and no board shows any of it.

This epic gives plantz a `/metrics` endpoint, a Prometheus job on cerf and a
`Service: Plantz` board that answers two different questions on one page: is the app
healthy, and do the plants need something.

The full specification already exists as
`homelab-root/docs/brainstorms/plantz-dashboard-requirements.md` (2026-08-05), including
the metric inventory, the panel layout and seven acceptance examples. The sub-PRDs here
reference it rather than restating it.

Exit state: the morning care decision is made from the board, and a plantz outage is
attributable to app, Postgres, MinIO or OpenRouter without an SSH session.

## 2. Motivation & Context

**The board is the payoff for EPIC-PLANTZ-CARE.** Care events, reminder completion and
watering intervals are schema work whose value is invisible inside the app. On the board
they become the Care Backlog panel, the Care Actions timeline and the overdue counter.
This is why INSIGHT runs directly after CARE and not at the end of the program.

**Nothing about the app is measured.** No request count, no latency, no error rate, no
photo upload volume, no analysis outcome. When the app feels slow there is no way to tell
a slow Postgres from a slow OpenRouter call except by reading logs.

**The monitoring stack is ready and the pattern is established.** cerf runs Prometheus and
Grafana with file-provisioned boards from `ansible/roles/monitoring/`. The jobs
`ddns-worker`, `node_exporter`, `cadvisor` and `proxmox` are already in
`templates/prometheus.yml.j2`, and boards follow `dashboard-service-<name>.json` with
`Service: AdGuard` and `Service: ddns-worker` as working examples.

## 3. Goals & Non-Goals

### 3.1 Goals (WHAT)

- **One endpoint.** `/metrics` on the existing port 3000 carries both application and
  domain metrics, so one scrape job covers everything.
- **A scrape never loads the database.** Domain gauges come from a sampler on a timer, not
  from queries triggered per scrape.
- **The failing layer is named.** App, Postgres, MinIO and OpenRouter are separable on the
  board.
- **The morning question is answered.** Which plants need water, ranked, without opening
  the app.
- **No UUID becomes a label.** Cardinality stays bounded, with exactly one metric carrying
  plant names and that one capped.

### 3.2 Non-Goals (explicitly excluded)

- **No alert rules.** The board comes first. Thresholds are chosen once real data exists.
- **No `Host: terry` board and no node_exporter on terry.** That is homelab-root work,
  tracked in `TODOS.md`, and no panel in this epic needs it.
- **No Loki log shipping** from plantz.
- **No `postgres_exporter`.** The board measures plantz's view of Postgres, not Postgres
  itself.
- **No authentication in front of `/metrics`.** It stays LAN-only, which follows from D-A1
  and OPS-02: nothing about plantz is publicly reachable.

## 4. Definition of Done (epic exit criteria)

Taken from the acceptance examples in the brainstorm.

- [ ] Prometheus job `plantz` is `up` against `192.168.178.27:3000` with label
      `host=terry`.
- [ ] Scraping `/metrics` ten times in a row triggers the sampler's SQL at most once per
      60s.
- [ ] Watering a plant in the app drops that plant's bar in Care Backlog to near zero and
      increases Care Actions 7d by one, within one scrape interval.
- [ ] Marking a reminder done decreases Open Reminders and never makes Overdue negative.
- [ ] Opening three different plant detail pages produces one series with
      `route="/plants/[id]"` and no series carrying a UUID.
- [ ] Stopping MinIO on terry shows the MinIO stat down while the DB stat stays up.
- [ ] Re-running the monitoring playbook unchanged reports zero changes and restarts
      nothing.
- [ ] Every panel query was verified against live Prometheus data before the board was
      committed.

## 5. Scope (sub-PRDs)

| ID | Title | Prio | Depends on | Loopable | Repo |
|----|-------|------|------------|----------|------|
| [INS-01](../subs/ins-01-metrics-endpoint-and-sampler.md) | Metrics Endpoint & Sampler | P1 | DEL-01, CARE-01, CARE-02, CARE-04 | yes | plantz |
| [INS-02](../subs/ins-02-prometheus-job-and-node-exporter.md) | Prometheus Job on cerf | P1 | INS-01 | yes | homelab-root |
| [INS-03](../subs/ins-03-grafana-board.md) | Grafana Board `Service: Plantz` | P1 | INS-02 | yes | homelab-root |

INS-01 depends on the CARE tables existing, otherwise the sampler has nothing to count.
INS-02 needs a scrapeable endpoint deployed on terry. INS-03 needs live data in Prometheus,
because every panel query is verified against it before the board is committed.

## 6. Risks & Assumptions

| Risk / assumption | Impact | Mitigation |
|-------------------|--------|------------|
| Panels look empty for the first weeks | The board reads as broken when it is correct | Accepted, see D-C3 in EPIC-PLANTZ-CARE. The default time range is `now-7d` so the window matches the data |
| A raw request path as a label value would create one series per plant UUID | Prometheus cardinality explodes | R11 in the brainstorm: the matched route pattern, never the raw path. Verified by an acceptance example |
| `plantz_plant_care_age_seconds` carries plant names | Bounded but non-trivial cardinality | Capped at the 20 driest plants (D-05 in the brainstorm) |
| The Prometheus container on cerf may not route to 192.168.178.27 | The job is configured and permanently down | The `proxmox` job already reaches grace the same way; INS-02 verifies reachability before committing the config |
| Assumption: OpenRouter stays available | Analyses fail, the rest of the app does not | Failure is measured, not prevented |
| Assumption: plantz is the only writer to its schema | Sampled counts are authoritative | Holds as long as migrations run through the app |

## 7. Open Questions

- [ ] **Q-I1** [INS-01] `prom-client` or a hand-written registry? Recommendation:
      `prom-client`. Histograms and the text format are exactly the part that is tedious
      and easy to get subtly wrong by hand.
- [ ] **Q-I2** [INS-01] Store `size_bytes` on `photos` at upload, or read the total from
      MinIO in the sampler? Recommendation: the column, with a one-off backfill over
      existing objects. The sampler stays a pure SQL job that way.
- [ ] **Q-I3** [INS-01] Where does the sampler timer live so that it starts once per
      process rather than once per request? Deferred to the sub-PRD, flagged in the
      brainstorm as a planning item.
- [ ] **Q-I4** [INS-03] Does `Photos and Storage` need a second Y axis or two stacked
      panels? Recommendation: decide while verifying the query against real data.

## 8. Decisions Taken

Inherited from the brainstorm, restated so the sub-PRDs do not have to be read alongside it.

- **D-I1** Metrics come from plantz's own `/metrics`, not from a textfile collector on
  cerf. A collector would need the Postgres credentials on a second machine and still
  could not see HTTP or MinIO activity.
- **D-I2** Domain gauges are sampled on a 60s timer, not computed per scrape. A scrape must
  never be able to run `COUNT(*)` over every table.
- **D-I3** `plantz_care_events_total` is a gauge holding a SQL count, not a counter
  incremented in the app. The sampler is then the single source, a restart does not reset
  it, and rows written outside the app still count.
- **D-I4** Per-plant labels exist on exactly one metric, capped at 20 series.
- **D-I5** The board is file-provisioned through Ansible like every other board, following
  the naming convention: uid `service-plantz`, folder `Services`, tag `service`.

## 9. References

- `homelab-root/docs/brainstorms/plantz-dashboard-requirements.md`, the full specification:
  metric inventory, six-band panel layout, acceptance examples AE1 to AE7
- `homelab-root/docs/brainstorms/dashboard-naming-convention-requirements.md`, the naming
  rules this board follows
- `homelab-root/ansible/roles/monitoring/templates/prometheus.yml.j2`, where the job is
  added
- `homelab-root/ansible/roles/monitoring/files/dashboard-service-ddns-worker.json`, a
  working board to copy structure from
- [epic-care.md](epic-care.md), which produces the tables this epic reads
