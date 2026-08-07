---
id: EPIC-PLANTZ-OPS
type: main
status: open
priority: P1
owner: Dennis Fink
created: 2026-08-07
subs: [OPS-01, OPS-02, OPS-03]
---

# [EPIC-PLANTZ-OPS] Backup & Remote Access

> **PRD type:** Main / Epic. Describes the **WHAT**, not the HOW.
> Implementation detail belongs in the linked sub-PRDs.

## 1. Summary

plantz holds two things that cannot be recreated: the photo history of every plant in
MinIO, and the notes and care history in Postgres. Both live on terry, a container host
running on grace, with no backup of any kind. `homelab-root/TODOS.md` already names
plantz-Postgres and MinIO-Fotos as unersetzlich, and the restic job that would protect
them is still on the backlog.

The second half of this epic is access. The app is reachable on the LAN only. Getting to
it from outside is a networking problem, and this program solves it as one: a tunnel that
only Dennis can enter, rather than a login screen in front of a public host.

Exit state: a disk failure on grace costs at most one month of history, no credential is a
default value, and the app is reachable from a phone outside the flat.

## 2. Motivation & Context

Verified on 2026-08-07.

**terry has no backup.** `docker ps` on terry shows `postgres:latest`,
`quay.io/minio/minio` and `plantz.app` alongside penpot, uptime-kuma and nginx-ui. None of
their volumes are copied anywhere. The photos in MinIO are the only copy of years of plant
photos.

**The database password is a default.** `DATABASE_URL` runs on `admin:changeme`, reachable
from the LAN, and adminer is exposed on the same host. This is harmless as long as the LAN
is the boundary and stops being harmless the moment anything reaches in from outside.

**Remote access is unsolved and does not need authentication to be solved.** The original
plan was a public host plus a login. Since Dennis is the only user (D-A1 in the backlog),
a tunnel is strictly less work: no session handling, no login UI, no `user_id` on ten
endpoints, no backfill migration, and nobody outside the tunnel can even reach the app.

## 3. Goals & Non-Goals

### 3.1 Goals (WHAT)

- **The data survives the hardware.** Postgres and MinIO from terry are part of a
  restic backup with a documented restore.
- **The restore is proven, not assumed.** A restore has been performed once, into a
  throwaway target, and produced readable data.
- **Access from outside works.** The app opens on a phone that is not on the home network.
- **No default credentials.** Postgres, MinIO and every API key are values that were
  chosen, and `.env.example` documents every variable the app reads.

### 3.2 Non-Goals (explicitly excluded)

- **No authentication.** See D-A1. A tunnel replaces it for a single user.
- **No public hosting.** The app is not exposed to the open internet in this program, so
  no reverse proxy, no TLS certificate and no rate limiting are needed.
- **No automated off-site backup.** The USB disk is connected by hand, monthly. Automating
  it is a homelab-root concern, not a plantz one.
- **No secret manager.** `.env` on terry stays the storage. Rotating the values is in
  scope, replacing the mechanism is not.

## 4. Definition of Done (epic exit criteria)

- [ ] A restic snapshot exists that contains a Postgres dump of the `plantz` database and
      the MinIO bucket holding the photos.
- [ ] A restore of that snapshot into a scratch location produced a readable dump and at
      least one intact photo file.
- [ ] The backup step is documented in `homelab-root` as part of the monthly USB routine,
      not as a plantz-specific script.
- [ ] The app loads on a mobile device that is not on the home network, and does not load
      for a device outside the tunnel.
- [ ] `DATABASE_URL` no longer contains `changeme`, and the MinIO root credentials are not
      the defaults.
- [ ] `.env.example` lists every variable the app reads, with no real values in it.
- [ ] The app still works after rotation: a photo uploads, a plant saves, an analysis runs.

## 5. Scope (sub-PRDs)

| ID | Title | Prio | Depends on | Loopable |
|----|-------|------|------------|----------|
| [OPS-01](../subs/ops-01-backup-postgres-and-minio.md) | Backup for terry Postgres & MinIO | P1 | none | confirm |
| [OPS-02](../subs/ops-02-remote-access.md) | Remote Access via Tunnel | P2 | DEL-05 | no |
| [OPS-03](../subs/ops-03-credential-rotation.md) | Credential Rotation | P1 | DEL-05, OPS-01 | confirm |

OPS-01 has no dependencies and can be pulled forward at any point in the program. OPS-03
deliberately runs after OPS-01: rotating a database password without a backup is the one
sequence in this program that can lose data.

## 6. Risks & Assumptions

| Risk / assumption | Impact | Mitigation |
|-------------------|--------|------------|
| Rotating `DATABASE_URL` while the app runs | The app cannot reach its database and photos fail to save | OPS-03 rotates in a defined order with the app stopped, and runs the smoke test in the DoD afterwards |
| Rotating MinIO root credentials can orphan existing objects if the bucket policy is tied to the user | Photos become unreadable while the files still exist | OPS-01 runs first, so a broken rotation is recoverable |
| A backup that has never been restored is a belief, not a backup | The first restore happens during an actual emergency | The DoD requires one restore into a scratch target |
| The USB disk is connected by hand | A forgotten month is a month of history at risk | Accepted. The mirror to GitHub (DEL-03) covers the code, not the data |
| Assumption: a tunnel covers every remote-access need | If a second person ever needs access, this epic is reopened along with authentication | Recorded as Q-O2 |

## 7. Open Questions

- [ ] **Q-O1** [OPS-01] Postgres backup by `pg_dump` into the restic source tree, or by
      snapshotting the container volume? Recommendation: `pg_dump`, because a volume
      snapshot of a running Postgres is only consistent by luck.
- [ ] **Q-O2** [OPS-02] Tailscale or a Cloudflare tunnel? Recommendation: Tailscale.
      It exposes nothing publicly, and the other homelab hosts can join later.
- [ ] **Q-O3** [OPS-03] Does the OpenRouter API key get rotated as part of this, or only
      the credentials that are defaults? Recommendation: rotate it too, since it is in the
      same `.env` and has been in a working copy on more than one machine.
- [ ] **Q-O4** [OPS-01] Does the backup cover only plantz data, or terry as a whole
      (penpot, uptime-kuma, nginx-ui)? Recommendation: plantz first, since that is what
      this program is responsible for, with the job written so adding paths is trivial.

## 8. Decisions Taken

- **D-O1** Remote access is a tunnel, not a public host with a login. This is the concrete
  consequence of D-A1 in the backlog and removes an entire epic of work.
- **D-O2** The backup job lives in homelab-root, not in the plantz repo. terry's other
  containers will want the same job, and a plantz-specific script would be copied and then
  diverge.
- **D-O3** Backup comes before credential rotation. Rotation is the riskiest operation in
  this program, and it is the one place where an unrecoverable mistake is possible.
- **D-O4** `.env` on terry stays the mechanism for secrets. This program rotates values, it
  does not introduce a secret store.

## 9. References

- [backlog.md](../backlog.md), the queue and the loop rules
- `homelab-root/TODOS.md`, the open restic-on-USB item that already names plantz-Postgres
  and MinIO as irreplaceable
- `homelab-root/ansible/inventory/hosts.yml`, terry at 192.168.178.27 on grace at
  192.168.178.25
- [epic-delivery.md](epic-delivery.md), which produces the `.env.example` this epic fills in
