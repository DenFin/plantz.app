---
id: OPS-01
epic: EPIC-PLANTZ-OPS
title: Backup for terry Postgres & MinIO
status: open
priority: P1
depends_on: []
repo: homelab-root, terry
loopable: confirm
---

# [OPS-01] Backup for terry Postgres & MinIO

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-OPS](../epics/epic-ops.md)

**Worked in `homelab-root` and on terry. `loopable: confirm`: the loop stops before the
first restic run and before anything writes to the USB disk.**

## 1. Goal

A restic snapshot containing a Postgres dump of the `plantz` database and the MinIO objects
holding the photos, and one proven restore.

## 2. Current State (verified 2026-08-07)

- terry runs `postgres:latest` and `quay.io/minio/minio` as containers, alongside plantz,
  adminer, nginx-ui, uptime-kuma, whoami and the penpot stack.
- No backup of any of it exists.
- `homelab-root/TODOS.md`, Backlog section: "Backup: restic auf externe USB-Platte,
  monatlich manuell an grace. Unersetzlich sind gitea (Repos), plantz-Postgres und
  MinIO-Fotos auf terry."
- The photos in MinIO are the only copy of the plant photo history.
- terry runs on grace (Proxmox, 192.168.178.25).

## 3. Scope

### 3.1 In Scope

- A script on terry that produces a consistent backup source tree:
  - `pg_dump` of the `plantz` database to a file
  - the MinIO bucket contents, either from the data directory or via `mc mirror`
- A restic repository on the USB disk, initialised with a passphrase that is stored
  somewhere other than terry.
- A documented monthly procedure in `homelab-root`: connect the disk, run the job, verify
  the snapshot, disconnect.
- One restore into a scratch location, proving the dump is readable and at least one photo
  file is intact.
- Update the `TODOS.md` entry to reference the implemented job.

### 3.2 Out of Scope

- Automating the USB connection. It is monthly and manual by design.
- Backing up penpot, uptime-kuma or nginx-ui. Q-O4 recommendation: plantz first, with the
  job written so paths are easy to add.
- Off-site replication. The GitHub mirror from DEL-03 covers the code; the data stays on
  the USB disk.
- Backing up gitea. Same job eventually, different sub-PRD.
- Continuous or incremental backup on a schedule.

## 4. Implementation Notes

**`pg_dump`, not a volume snapshot.** Q-O1: copying a running Postgres data directory
produces a consistent result only by luck. `docker exec postgres pg_dump ...` is the
correct source.

**MinIO objects are files, but the metadata matters.** Copying the MinIO data directory
captures objects and their metadata together. `mc mirror` into a staging directory is the
alternative and is easier to restore selectively. Either is acceptable; the restore test
decides whether the choice was right.

**The passphrase must not live only on terry.** A restic repository whose passphrase is
stored on the machine being backed up protects against nothing except a disk failure, and
not against the case where terry is gone entirely.

**A restore that has not been performed is a belief.** The DoD requires one restore. Do it
into a scratch directory on grace or a laptop, load the dump into a throwaway Postgres,
and open one photo file. That is the whole test and it takes minutes.

**Where the script lives.** D-O2: in `homelab-root`, not the plantz repo. terry's other
containers will want the same job, and a plantz-specific copy would diverge.

## 5. Definition of Done

- [ ] A script exists in `homelab-root` that produces the backup source tree on terry.
- [ ] A restic repository is initialised on the USB disk.
- [ ] One snapshot exists containing both the Postgres dump and the photo objects.
- [ ] `restic snapshots` lists it and `restic check` passes.
- [ ] A restore into a scratch target produced a dump that loads into a throwaway Postgres
      and at least one photo file that opens.
- [ ] The monthly procedure is documented in `homelab-root`.
- [ ] The restic passphrase is stored outside terry.
- [ ] The `TODOS.md` backlog entry references the implemented job.

## 6. Verification

```bash
# Produce the source tree
ssh terry "<backup script>"
ssh terry "ls -la <staging dir>"
# expect: a .sql dump with a plausible size, and the photo objects

# Snapshot
restic -r <usb repo> snapshots
restic -r <usb repo> check
# expect: the snapshot listed, check passes

# Restore test
restic -r <usb repo> restore latest --target /tmp/plantz-restore-test
ls -la /tmp/plantz-restore-test
docker run --rm -d --name pg-restore-test -e POSTGRES_PASSWORD=test -p 55433:5432 postgres:latest
psql -h localhost -p 55433 -U postgres -f /tmp/plantz-restore-test/<dump>.sql
psql -h localhost -p 55433 -U postgres -c "SELECT count(*) FROM plants;"
# expect: the real plant count
docker rm -f pg-restore-test

# One photo opens
file /tmp/plantz-restore-test/<some photo>
# expect: a valid image, not a zero-byte file
```

## 7. Risks

| Risk | Mitigation |
|------|------------|
| The backup runs but has never been restored | The restore test is in the DoD, not optional |
| `pg_dump` runs as a user without rights to the whole database | The verification counts rows in `plants` after restore, which fails visibly if the dump was partial |
| The USB disk fills up or fails | restic deduplicates and `restic check` detects corruption. A second disk is a homelab-root decision |
| The passphrase is lost | It goes into the same place as other credentials, outside terry. A restic repository without its passphrase is unrecoverable |
| A monthly manual job gets forgotten | Accepted, stated in the parent epic. It is still infinitely better than the current zero |

## 8. Open Questions

- [ ] **Q-O1** recommendation applied: `pg_dump`, not a volume snapshot.
- [ ] **Q-O4** recommendation applied: plantz data first, job written so paths are easy to
      add.
- [ ] **Q-OPS1-1** MinIO data directory or `mc mirror`? Decide during implementation and
      let the restore test settle it.
