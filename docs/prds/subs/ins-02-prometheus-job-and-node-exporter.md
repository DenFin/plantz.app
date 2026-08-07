---
id: INS-02
epic: EPIC-PLANTZ-INSIGHT
title: Prometheus Job on cerf
status: open
priority: P1
depends_on: [INS-01]
repo: homelab-root
loopable: true
---

# [INS-02] Prometheus Job on cerf

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-INSIGHT](../epics/epic-insight.md)

**This sub-PRD is worked in `homelab-root`, not in the plantz repository.**

## 1. Goal

Prometheus on cerf scrapes `192.168.178.27:3000/metrics` under job name `plantz` with label
`host: terry`, and the target reports `up`.

## 2. Current State (verified 2026-08-07)

- `homelab-root/ansible/roles/monitoring/templates/prometheus.yml.j2` defines four jobs:
  `ddns-worker`, `node_exporter`, `cadvisor` and `proxmox`. `scrape_interval` is 30s.
- No job targets terry. terry appears in `ansible/inventory/hosts.yml` under
  `compute_nodes` with `ansible_host: 192.168.178.27`, `ansible_user: dennis`.
- The `proxmox` job reaches grace at `192.168.178.25` from inside the Prometheus container,
  which establishes that the container can route to other hosts on the LAN.
- `ansible/roles/monitoring/tasks/main.yml` is the single task file for the role.

## 3. Scope

### 3.1 In Scope

- Add a `plantz` job to `prometheus.yml.j2`:
  - target `{{ hostvars['terry'].ansible_host }}:3000`
  - label `host: terry`
  - default `metrics_path` (`/metrics`)
- Verify reachability from the Prometheus container before committing.
- Run the monitoring playbook and confirm the target is `up`.
- Re-run the playbook unchanged and confirm zero changes (R15, AE7).

### 3.2 Out of Scope

- **node_exporter on terry.** The brainstorm's scope boundaries exclude it explicitly, and
  no panel on the `Service: Plantz` board needs host-level metrics. It stays in
  `homelab-root/TODOS.md` as the separate "Bestand nachziehen" item.
- A `Host: terry` dashboard.
- cadvisor on terry.
- Alert rules.
- Any change to the plantz repository.

## 4. Implementation Notes

**Use the inventory, not a literal address.** `{{ hostvars['terry'].ansible_host }}`
matches how the `proxmox` job references grace. A hardcoded `192.168.178.27` works until
terry moves.

**Check routing first.** The Prometheus container must reach terry on 3000. Confirm before
committing a job that would otherwise sit permanently down:

```bash
ssh cerf "docker exec prometheus wget -qO- http://192.168.178.27:3000/metrics | head -5"
```

If the container has no `wget`, `docker exec prometheus promtool query instant ...` after
the fact works too, but checking first is cheaper than debugging a red target.

**Order against INS-01.** This sub-PRD only makes sense once `/metrics` is deployed on
terry, which is why `depends_on` names INS-01. Adding the job earlier produces a
permanently down target that then gets ignored as noise.

**Idempotence is a requirement, not a nicety.** AE7 in the brainstorm: re-running the
playbook with unchanged repo state reports zero changes and restarts nothing. A template
change that triggers a Prometheus restart handler on every run is a failure of this
sub-PRD.

## 5. Definition of Done

- [ ] `prometheus.yml.j2` contains a `plantz` job using the inventory reference.
- [ ] The monitoring playbook applies cleanly.
- [ ] The Prometheus targets page shows `plantz` as `up` with `host="terry"`.
- [ ] `plantz_build_info` is queryable in Prometheus.
- [ ] Re-running the playbook reports zero changed tasks and restarts nothing (AE7).
- [ ] No node_exporter or cadvisor was installed on terry.

## 6. Verification

```bash
# Reachability, before committing
ssh cerf "docker exec prometheus wget -qO- http://192.168.178.27:3000/metrics | head -5"

# Apply
cd ~/Workspace/Projects/Private/Dennis/homelab-root
ansible-playbook -i ansible/inventory/hosts.yml <monitoring playbook>

# Target up (AE1)
ssh cerf "curl -s localhost:9090/api/v1/targets" | jq '.data.activeTargets[] | select(.labels.job=="plantz") | {health, lastError, labels}'
# expect: health "up", no lastError, host "terry"

# Data arriving
ssh cerf "curl -s 'localhost:9090/api/v1/query?query=plantz_build_info'" | jq '.data.result'
# expect: one series

# Idempotence (AE7)
ansible-playbook -i ansible/inventory/hosts.yml <monitoring playbook>
# expect: changed=0
```

## 7. Risks

| Risk | Mitigation |
|------|------------|
| The Prometheus container cannot route to terry | Checked before committing, per section 4. The `proxmox` job proves the pattern works |
| A 30s scrape against a 60s sampler shows the same value twice | Correct and expected. The gauges are sampled, not counted per scrape |
| The template change triggers a restart handler on every playbook run | AE7 is in the DoD; if it fires, the handler condition is the thing to fix |
| terry's IP changes | The inventory reference means one edit in `hosts.yml`, not two |

## 8. Open Questions

None. The node_exporter question is settled by the brainstorm's scope boundaries and is
tracked separately in `homelab-root/TODOS.md`.
