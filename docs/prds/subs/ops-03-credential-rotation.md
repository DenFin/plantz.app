---
id: OPS-03
epic: EPIC-PLANTZ-OPS
title: Credential Rotation
status: wip
priority: P1
depends_on: [DEL-05, OPS-01]
repo: plantz, terry
loopable: confirm
---

# [OPS-03] Credential Rotation

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-OPS](../epics/epic-ops.md)

**`loopable: confirm`.** The rotation itself stops the app and the database. The loop does
the repository half unattended and asks before touching terry.

## 1. Goal

No credential plantz uses is a default value, no key is shipped to the browser, and
`.env.example` documents every variable the app actually reads.

## 2. Current State (verified 2026-08-07)

`.env` contains 14 keys:

```
DATABASE_URL, DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD,
DATABASE_NAME, MINIO_HOST, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY,
MINIO_USE_SSL, MINIO_BUCKET, NUXT_PUBLIC_OPEN_ROUTER_API_KEY, BETTER_AUTH_SECRET
```

Three findings from reading the code against that list:

**The OpenRouter API key is exposed to the browser.** `nuxt.config.ts` puts it in
`runtimeConfig.public.openRouterApiKey`. Nuxt inlines `runtimeConfig.public` into the
client bundle, so the key is readable by anyone who opens the app and looks at the
JavaScript. It is only ever used server-side, at
`server/api/plants/[id]/photos/[photoId]/analyze.post.ts:11`, which reads
`process.env.NUXT_PUBLIC_OPEN_ROUTER_API_KEY` directly. The `public` placement buys
nothing and leaks the key. This is not a missing-guard finding, it is a key in a public
bundle.

**`DATABASE_URL` is dead.** `server/utils/db.ts` builds its connection from
`DATABASE_USER`, `DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_PASSWORD` and
`DATABASE_PORT`. Nothing reads `DATABASE_URL`. The archived main PRD flagged
`DATABASE_URL` on `admin:changeme`; the credential that actually matters is
`DATABASE_PASSWORD`.

**`BETTER_AUTH_SECRET` is dead.** `grep -r "BETTER_AUTH\|better-auth" server/ app/` returns
nothing. It is a leftover from an abandoned auth attempt. D-A1 makes it permanently
unnecessary.

There is no `.env.example`.

## 3. Scope

### 3.1 In Scope

Repository half (unattended):

- Rename `NUXT_PUBLIC_OPEN_ROUTER_API_KEY` to `OPENROUTER_API_KEY` and remove it from
  `runtimeConfig.public` in `nuxt.config.ts`. Update the one read site in
  `analyze.post.ts`.
- Delete `DATABASE_URL` and `BETTER_AUTH_SECRET` from `.env` handling and documentation.
- Add `.env.example` listing every variable the app reads, with placeholder values and a
  one-line comment each.
- Confirm `.env` is in `.gitignore` and has never been committed.

Host half (needs confirmation):

- Rotate `DATABASE_PASSWORD` on terry's Postgres and in terry's `.env`.
- Rotate the MinIO access key and secret.
- Rotate the OpenRouter API key at the provider and in terry's `.env`.
- Restart plantz and run the smoke test below.

### 3.2 Out of Scope

- A secret manager. D-O4: `.env` on terry stays the mechanism.
- Rotating credentials for penpot, adminer, nginx-ui or uptime-kuma on terry.
- Removing adminer, however tempting once the database password is rotated.
- Restricting Postgres to localhost or changing its network exposure.
- Authentication. D-A1.

## 4. Implementation Notes

**Order, and why OPS-01 comes first.** Rotating a database password is the one operation in
this program that can cost data if it goes sideways: a wrong password in `.env`, a restart,
and the app cannot reach its own database. With a verified backup from OPS-01 this is an
inconvenience. Without one it is a gamble.

**Rotation sequence for Postgres:**

1. `docker compose stop` plantz, so nothing is writing.
2. `ALTER USER <user> WITH PASSWORD '<new>';` inside the postgres container.
3. Update `DATABASE_PASSWORD` in `/root/plantz/.env`.
4. `docker compose up -d` plantz.
5. Smoke test.

Do not update `.env` first and restart later. A window where the app is running with the
old password and the database has the new one produces confusing errors.

**MinIO rotation can orphan objects.** If the bucket policy is bound to the current user,
new credentials can leave existing photos unreadable while the files are still there. Check
the bucket policy before rotating, and have the OPS-01 restore path ready.

**The OpenRouter key rename is the security fix, the rotation is the cleanup.** Renaming it
out of `runtimeConfig.public` stops the leak. Rotating it invalidates the key that was
already shipped in every bundle built so far. Both are needed; the rename alone leaves an
exposed key valid.

**Smoke test after every rotation.** Photo upload exercises MinIO, saving a plant exercises
Postgres, an AI analysis exercises OpenRouter. Three actions cover all three credentials.

## 5. Definition of Done

- [ ] `nuxt.config.ts` has no API key under `runtimeConfig.public`.
- [ ] `OPENROUTER_API_KEY` is the name in code and in `.env.example`.
- [ ] A production build contains no OpenRouter key: grepping `.output/public` for the key
      value finds nothing.
- [ ] `DATABASE_URL` and `BETTER_AUTH_SECRET` appear nowhere in the repo or in terry's
      `.env`.
- [ ] `.env.example` exists, lists every variable the app reads, and contains no real
      values.
- [ ] `.env` is gitignored and absent from the git history.
- [ ] `DATABASE_PASSWORD` on terry is not `changeme` or any other default.
- [ ] The MinIO credentials are not the defaults.
- [ ] The OpenRouter key was rotated at the provider.
- [ ] Smoke test passes: a photo uploads, a plant saves, an AI analysis returns.

## 6. Verification

```bash
# The key is not in the client bundle
pnpm build
grep -r "sk-or-" .output/public/ | wc -l
# expect: 0

# Dead variables gone
grep -rn "DATABASE_URL\|BETTER_AUTH" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs
# expect: no hits

# .env never committed
git log --all --oneline -- .env
# expect: empty

# Env example completeness: every process.env read has an entry
grep -rho "process\.env\.[A-Z_]*" server/ app/ scripts/ nuxt.config.ts | sort -u
diff <(grep -rho "process\.env\.[A-Z_]*" server/ app/ scripts/ nuxt.config.ts | sed 's/process\.env\.//' | sort -u) \
     <(cut -d= -f1 .env.example | grep -v '^$' | sort -u)
# expect: no lines missing from .env.example

# Smoke test after rotation, against terry
curl -fsS http://192.168.178.27:3000/api/db-status
curl -fsS http://192.168.178.27:3000/api/minio-status
# expect: both connected
# then, in the browser: upload a photo, save a plant, run an analysis
```

## 7. Risks

| Risk | Mitigation |
|------|------------|
| A wrong password in `.env` leaves the app unable to reach its database | OPS-01 is a hard dependency. The rotation sequence stops the app first, so the failure is immediate and obvious rather than partial |
| MinIO rotation orphans existing photos | Check the bucket policy first; the OPS-01 restore is the fallback |
| The old OpenRouter key stays valid in bundles already shipped | The rotation at the provider is what invalidates it, which is why the rename alone is not enough |
| Renaming the env variable breaks the analyze endpoint silently | The smoke test includes an AI analysis, which is the only thing that reads it |
| `.env` turns out to be in git history | The verification checks. If it is, the keys being rotated here are exactly the ones that needed rotating |

## 8. Open Questions

- [ ] **Q-O3** recommendation applied: rotate the OpenRouter key too, since it has been in
      the client bundle.
- [ ] **Q-OPS3-1** Should `.env.example` also cover the variables `scripts/generateTypes.ts`
      reads? It reads the same `DATABASE_*` set, so yes, and no extra entries are needed.

## 9. Repository Half: Done, 2026-08-08

Everything under "Repository half (unattended)" in section 3.1 is complete. The host half
is untouched and needs the confirmation the frontmatter asks for.

- `nuxt.config.ts` no longer has a `public` block at all. The comment there now says why:
  nuxt inlines `runtimeConfig.public` into the client bundle, so a key placed there is
  readable by anyone who opens the app.
- `NUXT_PUBLIC_OPEN_ROUTER_API_KEY` is `OPENROUTER_API_KEY` in the one read site,
  `server/api/plants/[id]/photos/[photoId]/analyze.post.ts:14`, and in the local `.env`.
- `DATABASE_URL` and `BETTER_AUTH_SECRET` are gone from the local `.env` and appear nowhere
  in the repository outside these PRDs, which describe them.
- `.env.example` lists all 13 variables the code reads, derived from the code rather than
  from the old `.env`:

  ```
  grep -rhoE "process\.env\.[A-Z_][A-Z0-9_]*" server/ scripts/ nuxt.config.ts | sort -u
  ```

  It carries no real values. `.gitignore` already had `!.env.example`, so it is tracked
  while `.env` stays ignored.

Verification:

| Check | Expected | Observed |
|---|---|---|
| Key value in `.output/public` | none | 0 files |
| Key value anywhere in `.output` | none | 0 files |
| `openRouterApiKey` as a name in the bundle | none | 0 files |
| `.env` tracked by git | never | `git log --all -- .env` is empty, `git status` reports it ignored |
| `.env.example` tracked | yes | staged and committed |
| Lint, tests, build | pass | 0 errors, 57 tests, build exit 0 |

## 10. Host Half: Waiting for Confirmation

Nothing on terry was touched. Four steps remain, and each one can take the app off the air
if it goes wrong:

1. **Rotate `DATABASE_PASSWORD`.** Section 4 gives the order: stop plantz, `ALTER USER`,
   update `/home/dennis/plantz/.env`, start plantz, smoke test. Note the path: DEL-05 moved
   the compose project from `/root/plantz` to `/home/dennis/plantz`, so section 4's
   `/root/plantz/.env` is out of date.
2. **Rotate the MinIO access key and secret.** Section 4's warning applies: check the bucket
   policy first, because new credentials can leave existing photos unreadable while the
   files are still there.
3. **Rotate the OpenRouter key at the provider.** The rename above stops the leak for
   future builds. Every bundle built before today still carries the old key, so the old key
   stays valid until it is rotated at OpenRouter. This is the half that actually closes the
   exposure.
4. **Smoke test:** save a plant (Postgres), upload a photo (MinIO), run an analysis
   (OpenRouter).

**OPS-01 comes first by the sub-PRD's own reasoning.** Section 4: rotating a database
password is the one operation in the program that can cost data. With a verified backup it
is an inconvenience; without one it is a gamble. OPS-01 needs a USB disk connected to terry,
which is why it is `loopable: confirm` too.
