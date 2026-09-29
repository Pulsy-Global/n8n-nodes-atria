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

## Reporting issues

Include the node name, resource/operation, n8n version, and (if possible) the API response body —
most failures come from DTO mismatches between a new Atria release and this package.
