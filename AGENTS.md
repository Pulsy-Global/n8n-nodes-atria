# AGENTS.md

## n8n workflow edits: JSON through n8n's own interfaces — never the database file

**Do not open `~/.n8n/database.sqlite` from the host at all — not even read-only, not even
from a test.** This caused `SQLITE_IOERR: disk I/O error` storms on **2026-11-09** (raw
`UPDATE`s from `python3`) and **2026-11-10** (a Node test harness that only *SELECT*ed).

Why it breaks:

- n8n runs in Docker (`container: n8n-atria-dev`, n8n **2.41.3**) with the data dir
  bind-mounted: `/Users/savaralevich/.n8n -> /home/node/.n8n`.
- SQLite over a macOS bind mount (virtiofs) already has unreliable file locking and
  shared-memory semantics for the running process.
- A second SQLite engine on the host corrupts the container's view of the `-wal`/`-shm`
  pair. The container's pooled statements then fail with `SQLITE_IOERR` — **on writes** —
  so canvas saves 500, executions cannot be recorded, and **logins fail**.
- The subtle trap: a connection that never issues an `UPDATE` is still fatal. Opening the
  file read-write (which `node:sqlite`'s `new DatabaseSync(path)` and `python3 -c "import
  sqlite3"` do **by default**) makes the closing connection checkpoint and truncate
  `-wal`/`-shm`. The container holds those files mapped and does not notice until its next
  write — which errors. Verify with `stat -f %z ~/.n8n/database.sqlite-wal`: a WAL that
  drops to 0 bytes while the container is up is this bug.
- n8n 2.x also versions workflows (`workflow_entity.versionId`,
  `workflow_published_version`, `workflow_version_increment`). Raw `UPDATE`s bypass that
  bookkeeping entirely.

This file previously told you the opposite. That instruction was wrong; ignore any older
patch script in `$TMPDIR/opencode/n8n/` (`patch_wf.py`, `add_amount_stage.py`,
`fix_amount_decimals.py`, `reflow_layout.py`, …) — do not reuse them.

### The JSON loop that is safe

| step | command | mechanism |
|---|---|---|
| read the live graph | `npm run wf:pull` | `docker exec n8n-atria-dev n8n export:workflow --id=… --output=/home/node/.n8n/…` → `workflows/live-snapshot.json`; n8n reads through its own TypeORM, the host only reads plain JSON |
| edit as JSON | `npm run wf:build` | merges the hourly-digest branch (`scripts/hourly-digest-stage.mjs`) into `workflows/my-workflow-3.json` |
| test | `npm run test:workflow` | 53 tests over node bodies, wiring, layout, artifact-vs-snapshot equality, and export guards |
| hand it over | `npm run wf:export` (also run by `wf:build`) | validates the graph, then writes `~/Documents/my-workflow-3.json` + a timestamped copy — the file to import in the editor when there is no API key |
| write | `N8N_API_KEY=… npm run wf:apply` | `GET` then `PUT /api/v1/workflows/{id}` (n8n rejects PATCH with 405); dry-run by default, `-- --apply` to push, re-reads to verify (order-insensitive); never sets `active` |
| backup | `docker exec n8n-atria-dev n8n export:workflow --backup --output=/home/node/.n8n/backup-workflows-<date>.json` | instance-wide |
| new workflow | `docker exec -i n8n-atria-dev n8n import:workflow --input=…` or `POST /api/v1/workflows` | |

`scripts/test-hourly-digest.mjs` contains a suite that fails if any file in `scripts/` opens
the database again — keep it that way. `workflows/*.json` holds real credential ids, the
spreadsheet id and the Atria feed config, so it is gitignored; this package is published. The
`~/Documents` export carries the same secrets — fine on this machine, never attach it to an
issue or commit it.

**Permanent fix, still open**: move the SQLite file off the bind mount into a named volume,
or point n8n at Postgres (`atria-cloud-postgres` is already running on 5433). Until then the
host has no legitimate reason to open that file at all.

### Recovery recipe when the container 500s with SQLITE_IOERR

Restarting the container does NOT fix it — the new process re-attaches to the same stale
`-wal`/`-shm` generation. The file must be reset with exactly one engine touching it:

```sh
cd ~/.n8n
cp database.sqlite database.sqlite.recovery-copy          # insurance
docker stop n8n-atria-dev                                  # nothing may hold the file
sqlite3 database.sqlite "PRAGMA wal_checkpoint(TRUNCATE); PRAGMA integrity_check;"
docker start n8n-atria-dev
# verify: WAL starts growing again and `docker logs --since 2m | grep -c SQLITE_IOERR` is 0
```

`wal_checkpoint(TRUNCATE)` folds the WAL's committed frames into the main DB and then
zeroes it; it preserves data. Deleting `-wal` would lose the un-checkpointed commits —
never do that. This host-side `sqlite3` handle is the **one** allowed exception: it runs
while the container is stopped, so it is the only engine on the file.

Confirmed working twice: 2026-11-09 (78 IOERRs, editor 500s) and 2026-11-10 (50 IOERRs,
login broken — caused by a read-only-looking Node test harness). In both cases all 18
workflows and every execution survived, `integrity_check` ok before and after. A plain
`docker restart` fixes neither, because the new process re-attaches to the same stale
generation.

### Canvas/layout rules that still hold

- Check `settings.executionOrder`. Under `v1`, n8n walks a node's outgoing branches
  top-to-bottom by `y`: a leaf read through `$('Node Name')` must sit **above** (smaller
  `y`) the node that reads it, or the reader gets an empty set and every item silently
  degrades.
- A read-only leaf with no outgoing edge is a legitimate pattern here (the reference
  template's `Known Wallets (Sheets)` is terminal by design and consumed via `$()`).
  Wiring it visibly into a node's input instead would concatenate two item streams and
  stall on an empty branch — the same trap the GoPlus branch avoids with `skip: true`.
- `n8n-nodes-base.code` v2 defaults to "Run Once for All Items" (no `mode` key); `$()`
  lookups are by node **name**, so names ported from a reference must stay identical.
- Validate every JS body before shipping it — `new Function(src)` under node, since
  top-level `return` is legal in a code node but not in a plain script check.
- Keep a JSON backup of the graph before any change, and re-check the diff afterwards: a
  "remove node + re-add" patch silently drops that node's edges.
