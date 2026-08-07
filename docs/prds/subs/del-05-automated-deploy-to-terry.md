---
id: DEL-05
epic: EPIC-PLANTZ-DELIVERY
title: Automated Deploy to terry
status: open
priority: P0
depends_on: [DEL-01, DEL-04]
repo: plantz, terry
loopable: true
---

# [DEL-05] Automated Deploy to terry

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-DELIVERY](../epics/epic-delivery.md)

## 1. Goal

A green CI run on `main` results in the new image running on terry, with pending
migrations applied, without anyone opening a shell.

## 2. Current State (verified 2026-08-07)

On terry (`192.168.178.27`, SSH alias `terry`):

- Container `plantz.app` runs image `plantz.app:latest`, up 25 hours.
- Compose working directory is `/root/plantz`.
- Alongside it: `postgres:latest`, `quay.io/minio/minio`, `adminer`, `nginx-ui`,
  `uptime-kuma`, `whoami` and the penpot stack.
- Docker 29.4.0.
- **`/etc/docker/daemon.json` does not exist.** terry cannot pull from
  `192.168.178.43:3000` over HTTP as things stand.

In the repository:

- `docker-compose.yml` uses `build: context: .` with `image: plantz.app:latest`. It builds
  on the host.
- `deploy.sh` does `git pull`, `docker compose build`, `docker tag`, `docker compose up -d`.
  It requires the source tree on terry.

## 3. Scope

### 3.1 In Scope

- Write `/etc/docker/daemon.json` on terry with
  `{ "insecure-registries": ["192.168.178.43:3000"] }` and restart the docker daemon.
- Change `docker-compose.yml` to reference the registry image instead of building:
  `image: 192.168.178.43:3000/dennis/plantz.app:${PLANTZ_TAG:-latest}`, no `build:` key.
- A deploy job in Gitea Actions that runs after a green build on `main`: connect to terry
  over SSH, pull the tagged image, and restart the compose service.
- An SSH deploy key: private half as a Gitea repository secret, public half in terry's
  `authorized_keys`.
- Copy the updated `docker-compose.yml` to terry as part of the deploy, so the compose
  file on terry is not a copy that drifts.
- Delete `deploy.sh` and replace the deployment section of the README with the new flow.
- A post-deploy check in the job: the container is running and `/api/db-status` answers.

### 3.2 Out of Scope

- Zero-downtime deployment. A few seconds of downtime for a single-user app is acceptable.
- Automated rollback. Tagged images make a manual rollback a one-line command; automating
  it is not worth the complexity here.
- Moving plantz into an Ansible role. See D-D6 in the archived main PRD and the item in
  `homelab-root/TODOS.md`.
- Moving the checkout off `/root`. Q-D3 settled on keeping it, recorded as debt.
- Touching the other containers on terry.

## 4. Implementation Notes

**The daemon.json step is the one that will bite.** Writing the file requires a docker
daemon restart, which restarts every container on terry, including penpot and uptime-kuma.
Do this once, deliberately, and expect roughly a minute where terry's services are
unavailable. It is not reversible mid-flight: a malformed `daemon.json` prevents docker
from starting at all. Validate the JSON before restarting:

```bash
ssh terry "python3 -c 'import json,sys; json.load(open(\"/etc/docker/daemon.json\"))' && echo valid"
```

**Deploy key.** Generate a dedicated ed25519 key, used for nothing else:

```bash
ssh-keygen -t ed25519 -f ./plantz-deploy -C "gitea-actions-deploy-plantz" -N ""
```

Public half appended to terry's `/root/.ssh/authorized_keys`, ideally with a
`command=` restriction so the key can only run the deploy script. Private half into a
Gitea repository secret named `TERRY_SSH_KEY`. The generated files are deleted from the
working copy afterwards and never committed.

**Deploy sequence on terry:**

```bash
cd /root/plantz
docker compose pull
docker compose up -d
docker compose ps
```

Migrations run inside the container on start (DEL-01), so no separate step is needed. If
the migration fails, the container exits, `docker compose ps` shows it not running, and
the deploy job fails.

**The compose file must reach terry.** Copying it with `scp` in the deploy job keeps
`/root/plantz/docker-compose.yml` in sync with the repo. The alternative, a `git pull` on
terry, is what this sub-PRD is removing.

**Post-deploy check.** `curl -fsS http://192.168.178.27:3000/api/db-status` from the runner.
It exists already (`server/api/db-status.ts`) and proves both the app and its database
connection. Give it a few seconds of retry, since the container needs to start.

## 5. Definition of Done

- [ ] `/etc/docker/daemon.json` on terry contains the insecure registry entry and
      `docker info` lists it.
- [ ] `docker-compose.yml` in the repo has no `build:` key and references the registry
      image.
- [ ] `deploy.sh` is deleted from the repo.
- [ ] The README's deployment section describes the automatic flow and contains no
      `docker build` command.
- [ ] A push to `main` results in terry running the image built from that commit, verified
      by comparing the container's image tag to the commit SHA.
- [ ] A pending migration added in the same push is applied and recorded in
      `schema_migrations`.
- [ ] A deliberately broken migration causes the container to exit and the deploy job to
      fail red, and the previous image can be started again by hand.
- [ ] `TERRY_SSH_KEY` exists as a Gitea secret and the key material is not in the
      repository.

## 6. Verification

```bash
# Registry trust on terry
ssh terry "cat /etc/docker/daemon.json && docker info 2>/dev/null | grep -A2 'Insecure Registries'"
# expect: 192.168.178.43:3000 listed

# terry can pull
ssh terry "docker pull 192.168.178.43:3000/dennis/plantz.app:latest"
# expect: success

# Full round trip.
# The program runs on feat/plantz-program and the deploy triggers on main, so this
# verification needs an actual merge. That merge is the first time the program's work
# reaches terry, which is intended: work in progress does not auto-deploy.
git switch main && git merge --no-ff feat/plantz-program
git push origin main
# wait for the run, then:
ssh terry "docker inspect plantz.app --format '{{.Config.Image}}'"
# expect: the image tag containing the SHA of the commit just pushed

# App is alive
curl -fsS http://192.168.178.27:3000/api/db-status
# expect: a success response

# Migration record
ssh terry "docker exec postgres psql -U <user> -d plantz -c 'SELECT filename FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;'"
# expect: the five known files, plus anything added since
```

## 7. Risks

| Risk | Mitigation |
|------|------------|
| A malformed `daemon.json` prevents docker from starting on terry, taking down penpot, uptime-kuma and plantz | Validate the JSON before restarting, and know that recovery means editing the file over SSH with docker down. This is the single riskiest step in EPIC-PLANTZ-DELIVERY |
| The daemon restart interrupts every container on terry | Expected and brief. Do it once, announce it, do not repeat it |
| The deploy key grants root on terry to whoever controls the runner | Q-D3 accepted this for now. A `command=` restriction in `authorized_keys` narrows it to the deploy script |
| `docker compose pull` succeeds but the app fails to start for an unrelated reason | The post-deploy `db-status` check fails the job, so a broken deploy is visible in CI rather than discovered later |
| The old `plantz.app:latest` local image on terry shadows the registry image | The compose file's image reference is fully qualified with the registry host, so there is no ambiguity |
| Deleting `deploy.sh` removes the manual escape hatch | The README documents the manual equivalent: `docker compose pull && docker compose up -d` in `/root/plantz` |

## 8. Open Questions

- [ ] **Q-D3** (parent epic) settled for this epic: deploy as `root` into `/root/plantz`,
      recorded as debt.
- [ ] **Q-DEL5-1** Does the deploy job run automatically on every green `main` build, or
      only when manually triggered? Recommendation: automatically. A pipeline that needs a
      button is a slower version of `deploy.sh`.
