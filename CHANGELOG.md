# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [semver](https://semver.org).

## [Unreleased]

### Added

- **Workflow documentation as a build stage.** `scripts/workflow-docs-stage.mjs` owns the
  workflow's `description` and the per-node `notes`, so a rebuild can no longer silently drop
  either. The description states that the ERC-20 feed creation code ships with the workflow (the
  trigger creates and starts the feed itself) and prints the exact payload every stage below it
  reads — `contract`, `from`, `to`, `rawAmount`, `network`, `txHash`. Note: only applied to a node
  that has none, so anything typed on the canvas survives.
- **`wf:example`** (`scripts/export-example-workflow.mjs`): writes the pending graph to
  `examples/atria-large-erc20-transfers-digest-workflow.json` with every instance-specific value
  redacted (credential ids, the spreadsheet id including the `cachedResultUrl` links, the Telegram
  chat id) and refuses to write if any of them survives.

- **Workflow tooling** (`wf:pull` / `wf:build` / `wf:export` / `wf:apply`): the reference
  workflow is refactored into `workflows/*.json` instead of the n8n editor, and the graph is read
  through n8n's own CLI export — never by opening `~/.n8n/database.sqlite` from the host, which
  corrupts the container's WAL view over the macOS bind mount.
- `tg:chat-id` (`scripts/telegram-chat-id.mjs`): reads the token from `TELEGRAM_BOT_TOKEN` and
  lists the chat ids the bot can actually write to, via read-only `getMe`/`getUpdates`.

### Fixed

- **Hourly digest: `[undefined] P1 · [undefined] P2`.** The Telegram template came from the
  reference, whose window node publishes severity counters; this port published money bands named
  `mega`/`large`/`medium`/`gate`. `Last Hour Events` now also derives `p1`/`p2`/`p3` using the
  reference's `Classify & Score` thresholds, from the columns the ledger really carries.
- **Hourly digest: Telegram 400 `can't parse entities`.** With an empty *Additional Fields*, n8n's
  Telegram node sends `parse_mode: Markdown` (legacy), where every `*` the model emits opens an
  italic entity; an odd count is a hard rejection. The digest node is now set to `HTML` and the
  model's free text is escaped (`&`, `<`, `>`) with `*`/`-` bullets converted to `•`. `chatId` and
  credentials are never rewritten.
- **Builder: a rebuild deleted the canvas tail.** `mergeBranch` now treats everything below
  `Last Hour Events` as canvas-owned: it neither resurrects nodes that were deleted nor orphans
  ones that were added, and it preserves live `id`/`position` while owning node parameters.

## [0.2.1] - 2026-11-09

### Added

- **Atria Trigger: "Create New Feed" feed source.** *Feed Source → Create New Feed* adds *Feed
  Name*, *Network*, *Data Type*, *Filter Code* (JavaScript, edited in the node) and *Start From*
  (*Latest Block*, the default, or *Specific Block* with the block number). On activation the node creates its webhook output, creates the feed with those
  parameters, attaches the output and starts the feed. Re-activating after a parameter change
  writes the new values into the same feed instead of creating a duplicate, and deactivation
  pauses (never deletes) the self-created feed. Created feeds are written with
  `ContinueOnError` handling, no transform function, no end block and no block delay, since
  those have no node parameter.

### Changed

- The trigger's `Feed` parameter is now shown for *Feed Source → Existing Feed* only. Existing
  workflows keep working unchanged: the new `feedSource` parameter defaults to "Existing Feed".

### Removed

- The stale "Known limitations (v0.1)" heading in the README now describes the current state.

## [0.2.0] - 2026-10-05

### Added

- **Demo workflow shipped with the package.** `examples/atria-demo-workflow.json` is now
  included in the npm tarball (`files` → `examples`). After installing the community node it is
  available at `~/.n8n/nodes/node_modules/n8n-nodes-atria/examples/atria-demo-workflow.json`
  and can be imported via *Workflows → Import from File*.

### Changed

- The demo workflow now mirrors the current node set (manual trigger → Get feed; Atria Trigger
  → Edit Fields → HTTP Request) and ships with placeholders instead of real values
  (`REPLACE_WITH_CREDENTIAL_ID`, `REPLACE_WITH_FEED_UUID`, `REPLACE_WITH_YOUR_TOKEN`).

## [0.1.4] - 2026-10-05

### Removed (breaking)

- **Atria Trigger: "Create new feed" and "Create from library" feed sources.** The trigger now
  only attaches to an **existing feed**, selected by search or by pasting its UUID. The
  `feedSource` parameter and all `create*` / `lib*` parameters are gone; workflows that used
  those modes must select a feed UUID after upgrading. Feeds are created and configured in the
  Atria dashboard.
- **Atria node: Feed › Create and Feed › Create From Library operations.** All other feed
  operations (list, get, update, delete, start, pause, test, get results) are unchanged.
- Internals: the shared create-body builders and the now-unused feed create/start-on-registration
  lifecycle code.

### Changed

- On deactivation the trigger only detaches and deletes its own webhook output; it never
  pauses or otherwise modifies the feed.

## [0.1.3] - 2026-10-01

### Added

- **Atria Trigger: "Create From Library" feed source.** With *Feed Source → Create From
  Library* the trigger clones a feed library template (with `Filter Config` /
  `Function Config` JSON parameters), starts the clone on activation and reuses it on later
  activations; switching the selected template re-clones and pauses the superseded feed.
  A feed created this way is still only paused, never deleted, on deactivation.

### Changed

- Community-node verification tooling: `npm run lint` / `npm run lint:fix` via
  `n8n-node` (`@n8n/node-cli`), `npm run test` = build + lint, `eslint.config.mjs` with
  n8n's official community-node rules.
- All lint findings from `@n8n/scan-community-package` fixed: `peerDependencies`
  (`n8n-workflow`), credential icon + "Test" endpoint, `NodeApiError`/`NodeOperationError`
  wrapping, `sleep` instead of `setTimeout`, dynamic-option parameter naming
  ("… Name or ID") descriptions, `NodeConnectionTypes.Main`, `usableAsTool` on the
  action node.

## [0.1.2] - 2026-10-01

### Fixed

- Entity ids from the typed "By ID" parameter mode are now URL-encoded when interpolated into
  API paths, so a value like `../../admin` (or one containing `/ ? #`) can no longer reshape
  the request.
- Exact-output/feed lookups (`findByName`, `findAttachedToOutput`) use a server-side OData
  `$filter` instead of scanning only the first page client-side — on accounts with more
  resources than the page size, trigger activation could create duplicate outputs or miss an
  existing feed attachment. Deployments that reject `$filter` fall back to the previous
  search/top query automatically.
- The trigger's deferred registration retry loop is sequential; a slow probe+register attempt
  could previously overlap with the next timer tick and register the output/feed twice.

### Changed

- Internals: layered architecture (shared per-model services, typed operation registry,
  trigger lifecycle services) and TypeScript `strict` mode with real response DTOs replacing
  pervasive `any` and double casts.
- The action node's Network dropdown now falls back to the bundled network list when the API
  is unreachable (previously trigger-only), and both nodes label entries with the environment id.

## [0.1.1] - 2026-09-29

### Changed

- No functional changes. Released through the GitHub Actions publish workflow so the package
  carries npm provenance (attestation from the CI run instead of a local machine).

## [0.1.0] - 2026-09-29

### Added

- **Atria node** with feed, output and library resources:
  - Feed: list, get, create (custom filter/function code), create from library, update, delete,
    start, pause, test (dry-run against a block), get results.
  - Output: list, get, create/update/delete webhook outputs (URL, HTTP method, custom headers, timeout).
  - Library: list templates and read a template's `filterConfig`/`functionConfig` shapes.
- **Atria Trigger** node that receives feed results and starts the workflow. On activation it creates
  a dedicated webhook output pointing at the workflow and attaches it to the selected feed; on
  deactivation it detaches and deletes it.
- **Atria API credential** (`X-API-KEY` header + configurable base URL).
- Searchable "By ID / From List" dropdowns backed by the Atria REST API (feeds, outputs, libraries,
  tags, networks).
- Local development setup documented (Docker bind-mount into `~/.n8n/nodes/node_modules`).
