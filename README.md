# n8n-nodes-atria

[Atria](https://atria.pulsy.app) community nodes for [n8n](https://n8n.io): deploy and manage
blockchain data feeds, and let feed results start your workflows.

**Atria** is a platform for building and deploying blockchain data feeds — small modules that
extract specific data from blockchain blocks and stream it to your chosen destinations.

## Nodes

### Atria (action node)

| Resource | Operations |
| --- | --- |
| **Feed** | list, get, create (custom code), create from library, update, delete, start, pause, test (dry-run on a block), get results |
| **Output** | list, get, create webhook output, update, delete |
| **Library** | list templates, get template (includes `filterConfig`/`functionConfig` shapes) |

### Atria Trigger (webhook trigger)

Starts the workflow whenever the selected feed delivers a new result.

On **activation** the node automatically:

1. creates a dedicated webhook output pointing at the workflow's production webhook URL;
2. attaches it to the selected feed (existing outputs are preserved);

On **deactivation** it detaches and deletes the output again.

Each trigger item contains the delivery payload:

```json
{
	"feedId": "…",
	"data": { "…your feed output…" },
	"blockNumber": "21000001",
	"isTestExecution": false,
	"deployId": "…",
	"dataSizeBytes": 123
}
```

Enable *Options → Include Delivery Headers* to also expose the `X-Atria-Feed-Id` /
`X-Atria-Test-Execution` headers on the item.

## Setup

1. In the Atria dashboard, create an **API key** (Account → API Keys) with the scopes you need:
   `feeds.read`, `feeds.manage`, `outputs.read`, `outputs.manage`.
2. In n8n, create a credential of type **Atria API**:
   - *API Key*: the key from step 1 (sent as `X-API-KEY` header)
   - *Base URL*: `https://atria.pulsy.app/api` (production) or `https://atria-dev.pulsy.works/api` (development)

> **Note for the trigger:** your n8n instance must have a reachable *Webhook URL* configured
> (Settings → n8n hosting), because Atria delivers results to it over the public internet.
> Self-hosted n8n behind a tunnel works too (e.g. Cloudflare Tunnel / ngrok for evaluation).

## Quick start: "alert me on big USDT transfers"

1. Add the **Atria Trigger** node and pick (or create) a feed — e.g. deploy the *ERC-20 large
   transfers* template with **Atria → Feed → Create From Library** and attach any placeholder output.
2. Activate the workflow — the node wires a webhook output onto the feed for you.
3. Connect the trigger to Slack / Telegram / HTTP Request / whatever you like.

Every matching blockchain event now runs the workflow.

## Recipes with the action node

- **Nightly backfill**: Schedule → *Feed: Create* (`startBlock`/`endBlock`) → *Feed: Start* → wait → *Feed: Get Results* → summarize in AI node → *Feed: Delete*.
- **Self-service deployer**: Chat/Typeform input → *Library: Get* (to learn config keys) → *Output: Create* → *Feed: Create From Library* with `filterConfig` JSON → *Feed: Start*.
- **Safe code iteration**: *Feed: Test* against one block with `executeOutputs: false` before touching production filters.

## Local development (running this package in n8n)

`~/.n8n` is **created automatically by n8n on first start** — you don't make it yourself.
The fastest loop is Docker with your working tree bind-mounted as a custom-node package:

```bash
mkdir -p ~/.n8n/nodes/node_modules
cd ~/Projects/n8n-nodes-atria && npm install && npm run build

docker run -d --name n8n-atria-dev -p 5678:5678 \
  -e N8N_DEV_RELOAD=true \
  -v ~/.n8n:/home/node/.n8n \
  -v ~/Projects/n8n-nodes-atria:/home/node/.n8n/nodes/node_modules/n8n-nodes-atria \
  docker.io/n8nio/n8n:latest
```

n8n's `CustomDirectoryLoader` picks up everything in `~/.n8n/nodes/node_modules/` at startup —
no npm publish, install, or `npm link` needed. With `N8N_DEV_RELOAD=true` the node descriptions
hot-reload when you rebuild (`npm run dev` = tsc watch; run `npm run build` once more after
touching `.svg` files so postbuild copies them into `dist/`).

Verify the package registered:

```bash
docker exec n8n-atria-dev n8n export:nodes --output=/tmp/nodes.json
docker exec n8n-atria-dev grep -o 'n8n-nodes-atria[a-zA-Z.]*' /tmp/nodes.json | sort -u
# → n8n-nodes-atria.atria / n8n-nodes-atria.atriaTrigger
```

Then open http://localhost:5678, create the owner account, and search the node palette for "Atria".

If you prefer running n8n via npm on the host instead of Docker (`npx n8n`), the classic
`npm link` flow works too — but the Docker image may fail to build native deps on very new
Node versions, which is why Docker is the recommended path here.

## Testing the trigger end-to-end

- Production mode: activating the workflow registers the output automatically (check the feed's
  outputs in the Atria dashboard afterwards).
- Test mode ("Listen for test event"): n8n does not run activation hooks for test webhooks.
  Create a temporary output manually with **Atria → Output → Create** pointing at the
  `webhook-test/...` URL, attach it to your feed, fire a test execution, then delete it.

## Known limitations (v0.1)

- Webhook outputs only for output CRUD (Atria currently delivers to webhook targets only).
- No HMAC signing of deliveries yet (Atria doesn't sign webhook payloads). Use a custom header as a
  shared secret and verify it downstream if you need authentication.
- Test mode ("Listen for test event") does not run the registration hooks — n8n never calls
  `webhookMethods.create` for test webhooks. See "Testing the trigger end-to-end" above.

## License

MIT © 2026 Pulsy Labs LLC — see [LICENSE.md](LICENSE.md).

This package talks to Atria over its public REST API and contains no Atria server code, so the
node's license is independent from the Atria platform license.
