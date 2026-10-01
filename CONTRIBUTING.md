# Contributing

Thanks for helping improve the Atria nodes for n8n.

## Development setup

```bash
npm install
npm run build          # tsc + copy icons into dist/
npm run dev            # tsc --watch
```

Run your changes inside n8n (Docker):

```bash
mkdir -p ~/.n8n/nodes/node_modules
docker run -d --name n8n-atria-dev -p 5678:5678 \
  -e N8N_DEV_RELOAD=true \
  -e N8N_SECURE_COOKIE=false \
  -v ~/.n8n:/home/node/.n8n \
  -v "$PWD":/home/node/.n8n/nodes/node_modules/n8n-nodes-atria \
  docker.io/n8nio/n8n:latest
```

Verify both nodes registered:

```bash
docker exec n8n-atria-dev n8n export:nodes --output=/tmp/nodes.json
docker exec n8n-atria-dev grep -o 'n8n-nodes-atria[a-zA-Z.]*' /tmp/nodes.json | sort -u
```

## Guidelines

- `nodes/Shared/lib/` is split by concern, not a grab-bag: `api-client.ts` (the `AtriaApiClient`
  transport — the only place that calls `httpRequest` against Atria), `pagination.ts`
  (`unwrapPaged`, `listAll`), `feed.dto.ts` (DTO mapping, incl. the `buildCreateFeedBody` builder
  shared by the node's Feed › Create operation and the trigger), `list-search.ts`
  (`makeListSearchHandler` — the skip/paginationToken loop every `methods.listSearch` needs),
  `parameters.ts` (node-parameter parsing), `property-modes.ts` (UI mode config). Shared model
  constants live in `nodes/Shared/constants.ts`.
  Atria Cloud API calls for a model belong in the matching `nodes/Shared/services/{Model}.service.ts`,
  which construct an `AtriaApiClient` from the n8n context — never call transport functions directly.
  Every executable operation is a class in
  `nodes/Atria/operations/{resource}/{operation}.operation.ts` registered in
  `nodes/Atria/operations/index.ts`. The registry is typed against a union derived from
  the resource/operation dropdown definitions (`RESOURCE_OPTIONS` and the per-resource
  `*_OPERATIONS` lists, each `as const`), so a typo or a UI operation with no class — or a
  class not surfaced in the UI — is a compile error, not a runtime surprise. To add an
  operation: add a `*_OPERATIONS` entry, create the class, and register it; TypeScript
  points at any of the three you missed. Node-specific concerns live in `{Node}/services/`
  (the trigger's webhook lifecycle is `TriggerRegistrationService` + `WebhookService`),
  UI property definitions in `{Node}/resources/`, constant values
  in `{Node}/constants/{Node}.constants.ts`. Node classes are thin: description +
  delegation only. Dependencies point down into `nodes/Shared/` — Shared
  never imports from a node.
- Typing is strict (`tsconfig.json` → `"strict": true`) and API shapes are real DTOs in
  `nodes/Shared/lib/dtos.ts` — `FeedDto`, `OutputDto`, `LibraryDto`, `TagDto`, `NetworkDto` and the
  write bodies (`CreateFeedDto`, `UpsertOutputDto`), plus the `AtriaPage<T>` envelope. Declare them
  as **type aliases, not interfaces**: aliases get an implicit index signature, so a DTO drops
  straight into `{ json: feed }` without casting to `IDataObject`. Service methods return DTOs
  (never `Promise<any>`), operation `execute()` returns `Promise<INodeExecutionData[]>`, and the
  listSearch/loadOptions mappers infer their item type from `makeListSearchHandler<T>`. The only
  sanctioned untyped boundaries: `unwrapPaged` (parses the wire envelope once),
  `getCredentials(...) as AtriaCredentials`, `NodeOperation.get()` / `FeedParamGetter` (n8n hands
  UI parameters over as `any`), and `parseJsonParameter` — everything downstream of those is
  checked. Do not add `as unknown as X` double casts; if one seems needed, the DTO is wrong.
- Logic that both nodes need exists exactly once: the CreateFeedDto builder (`feed.dto.ts`), the
  listSearch paging factory (`list-search.ts`) and the network loader (`NetworkService`, which
  falls back to `NETWORK_FALLBACKS` when `GET /config/networks` is unavailable) are shared — do not
  fork them per node.
- Payload shapes must match Atria DTOs exactly: camelCase properties, enums serialized as string
  names, `startBlock`/`endBlock` as numbers on write (strings on read).
- Every new operation needs a display name, a description and correct `displayOptions` so it only
  appears for the right resource.
- Update `CHANGELOG.md` and bump the version before publishing.

## Publishing a release

The npm package is published from GitHub Actions (`.github/workflows/release.yml`) when a GitHub
Release is created. Authentication uses **npm Trusted Publishing (OIDC)** — there is no repository
secret, no token to rotate, and no OTP prompt.

> Granular access tokens that bypass 2FA are being retired by npm for direct publishing: a CI run
> with `NPM_TOKEN` fails with `EOTP` (npm cannot ask for a one-time password non-interactively).
> Trusted Publishing is the supported replacement.

One-time setup (requires the package to exist on npm — `0.1.0` already does):

1. npmjs.com → package `n8n-nodes-atria` → **Settings** → **Trusted Publisher** → add *GitHub Actions*;
2. Organization `Pulsy-Global`, Repository `n8n-nodes-atria`, **Workflow filename** `release.yml`
   (file name only, with extension, case-sensitive), Environment name — leave empty;
3. **Allowed actions** — tick *direct publish* (`npm publish`). Connections created after
   **2026-09-03** default to `npm stage publish` only, and a direct publish is then refused with
   `403 OIDC permission denied for this action` — *after* provenance was signed, so it looks like
   an identity problem while it is not;
4. a connection **cannot be edited afterwards** — to change any field (including allowed actions),
   delete it and create a new one. npm does not validate the configuration when you save it;
5. the workflow needs `permissions: id-token: write` (already set) and npm ≥ 11.5.1 for the OIDC
   exchange (≥ 11.15.0 for staged publishing) — the workflow pins npm explicitly.

### Staged publishing (optional hardening)

Keep the publisher stage-only and change the publish step to `npm stage publish --access public`.
CI can only *submit* — reviewing and approving requires a human with 2FA, and those subcommands do
not accept OIDC:

```bash
npm stage list n8n-nodes-atria
npm stage view <stage-id>        # or: npm stage download <stage-id> to inspect the tarball
npm stage approve <stage-id>     # prompts for a 2FA code; also possible on npmjs.com → Staged Packages
```

Then the recommended maximum-security posture: package → Settings → **Publishing access** →
*Require two-factor authentication and disallow tokens*, and revoke every remaining publish token.
This does not affect trusted publishing.

Release checklist:

1. `CHANGELOG.md` entry + version bumped in `package.json` (`npm version patch --no-git-tag-version`
   keeps `package-lock.json` in sync) in the **same commit**;
2. `main` is green;
3. GitHub → Releases → **Draft a new release**, target `main`, *Choose tag* → type `vX.Y.Z` →
   **Create a new tag on publish** (GitHub points the tag at the current `main` commit) → Publish.

For a `release` event the workflow file itself is taken from the **tag's commit**, so the tag must
point at a commit that already contains the bump. The publish job checks that
`v<package.json version>` equals the tag and that the version is not in the registry yet. Version
numbers are permanent: never reuse one, and avoid `npm unpublish` (deleting the only published
version locks the package name for 24 h).

Manual publish (emergency only, e.g. npm or GitHub Actions is down): authenticate with
`npm login` and run `npm publish --access public --no-provenance` — provenance cannot be created
outside CI, so such a release will be listed as unsigned.

## Reporting issues

Include the node name, resource/operation, n8n version, and (if possible) the API response body —
most failures come from DTO mismatches between a new Atria release and this package.
