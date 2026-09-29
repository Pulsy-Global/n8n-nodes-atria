# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [semver](https://semver.org).

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
