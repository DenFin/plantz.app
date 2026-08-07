---
id: DEL-01
epic: EPIC-PLANTZ-DELIVERY
title: Data Access & Migration Runner
status: done
priority: P0
depends_on: []
repo: plantz
loopable: true
---

# [DEL-01] Data Access & Migration Runner

> **PRD type:** Sub. Describes the **HOW**, including guardrails.
> Parent: [EPIC-PLANTZ-DELIVERY](../epics/epic-delivery.md)

## 1. Goal

Two things that every later sub-PRD depends on: a connection pool instead of a connection
per query, and a migration runner that applies pending files on startup and records what
ran.

## 2. Current State (verified against `main` 4d935f8)

`server/utils/db.ts` is 30 lines:

- `database()` constructs a `new pg.Client(...)` from `DATABASE_USER`, `DATABASE_HOST`,
  `DATABASE_NAME`, `DATABASE_PASSWORD` and `DATABASE_PORT`, connects and returns it.
- `queryDatabase(query, params)` calls `database()`, runs one query, and closes the client
  in a `finally` block.
- 21 files import one of the two.
- `DATABASE_URL` exists in `.env` but no code reads it.

**The `database()` callers are the part that needs care.** Eight files call it directly,
not through `queryDatabase`, because they need more than one statement on the same
connection:

```
server/api/db-status.ts
server/api/plants/index.post.ts
server/api/plants/[id]/index.put.ts
server/api/plants/[id]/photos/index.post.ts
server/api/plants/[id]/photos/[photoId]/index.delete.ts
server/api/plants/[id]/photos/[photoId]/index.get.ts
server/api/rooms/index.post.ts
server/api/notes/index.post.ts
```

Six of them then call `client.end()`:

```
server/api/db-status.ts:13
server/api/plants/index.post.ts:73
server/api/plants/[id]/photos/[photoId]/index.delete.ts:60
server/api/plants/[id]/photos/[photoId]/index.get.ts:65
server/api/plants/[id]/photos/index.post.ts:92
server/api/rooms/index.post.ts:42
```

Against a `pg.Client`, `end()` closes one connection. Against a pool, calling `end()` on
the pool closes the whole pool and every subsequent query fails. These six call sites are
the real work in this sub-PRD.

`server/db/migrations/` holds `initial.sql`, `001-add-rooms.sql`,
`002-add-photos-to-notes.sql`, `003-add-status-to-plants.sql` and
`004-add-parent-plant.sql`. Nothing records which of them ran on which host. The README
documents applying them by hand:

```bash
psql -h 192.168.10.117 -U admin -d plantz -f server/db/migrations/<FILE_NAME>.sql
```

Note the host in that command (`192.168.10.117`) is not terry's address
(`192.168.178.27`), which is itself a sign of how reliable the manual process is.

## 3. Scope

### 3.1 In Scope

- Replace the per-query `pg.Client` with a module-level `pg.Pool`. Keep the exported
  `queryDatabase(query, params)` signature, so the call sites that use it do not change.
- Change `database()` to check a client out of the pool (`pool.connect()`), returning a
  `PoolClient`.
- Change all six `client.end()` call sites listed in section 2 to `client.release()`, and
  make sure each one runs in a `finally` block so a thrown query cannot leak a connection.
- Expose the pool object so INS-01 can read `totalCount`, `idleCount` and `waitingCount`
  later.
- A `schema_migrations` table: `filename` primary key, `applied_at`.
- A runner that, on server startup, reads `server/db/migrations/`, sorts by filename,
  skips what is recorded, and applies the rest inside a transaction per file.
- Seed `schema_migrations` on first run: if the table does not exist but the schema is
  clearly already migrated, record every file currently in the directory as applied rather
  than re-running it. See section 4 for how "clearly already migrated" is decided.
- Abort the process on a failed migration with a non-zero exit and the failing filename in
  the message.
- Remove the `psql -f` instructions from the README and describe the automatic path.

### 3.2 Out of Scope

- Down migrations or rollback. Forward-only.
- Any ORM or query builder. Raw SQL against `pg` stays.
- Refactoring the eight `database()` callers beyond the `end()` to `release()` change.
  Their query logic stays as it is.
- Wrapping their multi-statement sequences in explicit transactions. Several of them should
  be, and that is a separate change with its own verification.
- Changing the environment variable names. `DATABASE_URL` stays unread and is cleaned up
  in OPS-03.
- Seeding data.

## 4. Implementation Notes

**Pool lifetime is the trap.** The pool is created once per process at module scope and is
never ended by request code. `queryDatabase` becomes `pool.query()`, which checks a client
out and back in by itself. The six handlers that call `client.end()` today must call
`client.release()` instead. Turning any of them into `pool.end()` closes the pool for the
whole process, and the symptom is not a failure at that request but at the next one, which
makes it slow to diagnose. Grep for `.end()` under `server/` after the change: the only
acceptable remaining hit is none.

**A released client is not a closed client.** `release()` returns the connection to the
pool. If a handler throws between checkout and release, the connection leaks and the pool
eventually runs dry after enough errors. Every `release()` belongs in a `finally`.

**Startup ordering.** Migrations must complete before the first request is served. In
Nitro, a plugin under `server/plugins/` runs at startup; the runner belongs there. Q-D4 in
the parent epic settled on running migrations in the app process, since there is one
instance and no orchestrator to sequence a separate job.

**Seeding against the live schema.** terry's database was migrated by hand and there is no
record. Re-running `initial.sql` would fail on `CREATE TABLE users`, and re-running
`003` would fail on `CREATE TYPE plant_status`. The runner therefore does this on first
run only, when `schema_migrations` does not yet exist:

1. Create `schema_migrations`.
2. Check for a marker that proves the schema is already at the current head. The most
   recent migration is `004-add-parent-plant.sql`, so the marker is: does
   `plants.parent_plant_id` exist?
3. If it exists, insert every file currently in the directory as applied, with a comment in
   the log saying they were adopted rather than executed.
4. If it does not exist, run every file in order as normal. This is the fresh-database
   path, which is what a developer setting up locally hits.

This is a one-time branch. After the first successful start, the table is authoritative.

**Failure behaviour.** A failed migration logs the filename and the Postgres error, then
exits non-zero. Do not catch and continue. D-D1 in the parent epic: an app serving traffic
on a half-migrated schema is worse than an app that will not start.

**Transactions.** One transaction per file. `003-add-status-to-plants.sql` contains four
statements that only make sense together.

## 5. Definition of Done

- [ ] `server/utils/db.ts` exports a module-level pool, and no code path calls `end()` on
      it per query.
- [ ] `grep -rn "\.end()" server/` returns no hits.
- [ ] All six former `client.end()` sites call `client.release()` from a `finally` block.
- [ ] Fifty sequential requests to `/api/plants` all succeed, proving the pool is not
      closed by the first one.
- [ ] A handler that throws mid-query does not leak a connection: the pool's `idleCount`
      returns to its resting value afterwards.
- [ ] A `schema_migrations` table exists after startup.
- [ ] Starting the app against terry's existing database adopts the five known files
      without executing them, and does not error.
- [ ] Starting the app against an empty database runs all five files in order and produces
      the same schema.
- [ ] Adding a new file to `server/db/migrations/` applies it on the next start and records
      it.
- [ ] A migration file containing invalid SQL stops the process with a non-zero exit code
      and names the file.
- [ ] The README no longer contains a `psql -f` instruction.

## 6. Verification

```bash
# Fresh database path
docker run --rm -d --name plantz-verify -e POSTGRES_PASSWORD=verify -p 55432:5432 postgres:latest
DATABASE_HOST=localhost DATABASE_PORT=55432 DATABASE_USER=postgres \
  DATABASE_PASSWORD=verify DATABASE_NAME=postgres pnpm dev
# expect: log lines for all five migrations, then the app starts

psql -h localhost -p 55432 -U postgres -c "SELECT filename FROM schema_migrations ORDER BY filename;"
# expect: 001, 002, 003, 004, initial

# Adoption path: restart against the same database
# expect: no migration executed, no error

# Pool survives repeated use (the client.end() trap)
for i in $(seq 1 50); do curl -so /dev/null -w '%{http_code} ' http://localhost:3000/api/plants; done
# expect: fifty times 200, no 500 after the first request

grep -rn "\.end()" server/
# expect: no output

# Failure path. `pnpm dev` cannot be used here: `nuxt dev` supervises the Nitro worker
# and keeps running after it exits, so no exit code is ever produced. The production
# entrypoint is a single process and is what the container runs.
pnpm build
echo "SELECT this_is_not_valid_sql;" > server/db/migrations/999-broken.sql
node .output/server/index.mjs; echo "exit=$?"
# expect: non-zero exit, "999-broken.sql" in the message
rm server/db/migrations/999-broken.sql

docker rm -f plantz-verify
```

Against terry, verification is a deploy (DEL-05) or a manual run pointed at terry's
Postgres from the LAN. The adoption branch is the one that matters there.

## 7. Risks

| Risk | Mitigation |
|------|------------|
| The adoption marker (`plants.parent_plant_id`) is wrong for some host | It is the column added by the newest migration. If a host is older than that, adoption correctly falls through to running the files |
| One missed `client.end()` closes the pool for the whole process | The DoD greps for `.end()` under `server/` and runs fifty sequential requests. This is the single most likely way to break this sub-PRD |
| A handler throws between checkout and release and leaks a connection | Every `release()` in a `finally`, verified by the idle-count check in the DoD |
| A pool that is never drained holds connections open across a redeploy | The container is replaced on deploy, so the process exits and Postgres reaps the connections |
| Startup migrations delay the first request after every deploy | Milliseconds when nothing is pending, which is the normal case |
| Two app instances would race on the same migration | There is one instance and no plan for a second. If that changes, an advisory lock is the fix |

## 8. Open Questions

- [ ] **Q-D4** (parent epic) settled: migrations run in the app process. Recorded here for
      traceability.
- [x] **Q-D5** settled 2026-08-07: the failure-path command in section 6 was replaced.
      `pnpm dev; echo "exit=$?"` can never return non-zero, because `nuxt dev` is a
      supervisor: it restarts the Nitro worker and keeps running, so the parent process
      never exits. Section 6 now builds and runs the production entrypoint instead, which
      is the single process the container runs. Observed there:

      ```
      node .output/server/index.mjs; echo "exit=$?"
      # exit=1
      # ERROR Migration failed: 999-broken.sql: column "this_is_not_valid_sql" does not exist
      ```

      Under `pnpm dev` the worker does exit and every later request answers 500, so no
      request reaches a half-migrated schema on either path.

## 9. Implementation Notes Added During the Work

- **D-D5** `initial.sql` is applied first, not in plain filename order. Sorting by filename
  alone puts it last, and `002-add-photos-to-notes.sql` alters a table that `initial.sql`
  creates, so a fresh database would fail on the first file. The runner pins `initial.sql`
  to the front and orders everything else lexicographically. The `ORDER BY filename` output
  in section 6 is unaffected, since that is the SELECT's ordering, not the apply order.
- **D-D6** The migration files are read through `useStorage('assets:migrations')`, wired up
  by `nitro.serverAssets` in `nuxt.config.ts`. Reading the directory from disk works in dev
  but not in the bundled server, where `server/db/` is not shipped. The server-asset route
  bundles the `.sql` files into `.output`, verified by running the production build against
  an empty database.
- **D-D7** Nitro does not await plugin initialisation, so the migration runner cannot rely
  on finishing before the first request. `server/plugins/migrations.ts` keeps the runner's
  promise and awaits it in a `request` hook. That is what actually holds the guarantee in
  section 4 under "Startup ordering".
- **D-D8** Three handlers needed slightly more than the `end()` to `release()` swap named in
  section 3.1, because a released client keeps its open transaction and hands it to the next
  caller:
  - `server/api/notes/index.post.ts` and `server/api/plants/[id]/index.put.ts` never
    released at all. Both got a `finally { client.release() }`, and `notes` also got the
    `ROLLBACK` that the other six handlers already had.
  - `server/api/plants/[id]/photos/[photoId]/index.delete.ts` and `index.get.ts` return 404
    from inside the transaction. Both got a `ROLLBACK` before that early return.
- **D-D9** The pool cannot be used by two processes at once during verification. Two
  `pnpm dev` instances were briefly running against the same database and produced a
  misleading "nothing pending". Worth knowing for anyone re-running section 6.
