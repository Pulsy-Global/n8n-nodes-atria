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

- Keep API calls in `nodes/Atria/genericFunctions.ts` so that every resource shares the same request
  wrapper (`X-API-KEY`, base URL handling, `{ items, totalCount }` unwrapping).
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
2. Owner `Pulsy-Global`, Repository `n8n-nodes-atria`, Workflow name `release.yml` (the file name,
   must match exactly), Environment name — leave empty;
3. The workflow needs `permissions: id-token: write` (already set).

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
