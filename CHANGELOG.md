# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [semver](https://semver.org).

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
