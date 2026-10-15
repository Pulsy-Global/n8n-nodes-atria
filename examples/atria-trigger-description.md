# Template listing copy — Atria Demo Workflow

Paste-ready text for the n8n community template page
(https://n8n.io/workflows/20463-forward-atria-feed-events-to-a-custom-http-webhook/).

Canonical source: Confluence page
(https://pulsy.atlassian.net/wiki/spaces/Pulsy/pages/320143362/n8n). This file and the sticky note in
`examples/atria-trigger-workflow.json` must stay in sync with it.

---

## Title

Atria Trigger: react to any blockchain events in n8n

## Quick overview

Atria watches blockchains for you: a feed pulls the data you care about out of every new block and
streams it straight to n8n. Each on-chain event starts your workflow, which hands it to whatever tool
you connect next.

## How it works

1. **Atria delivers.** A feed pulls the data you care about out of every new block and streams each
   matching result to n8n. Activating the workflow registers a webhook output on your feed.
2. **Atria Event Trigger catches the delivery.** Feed data arrive as ordinary json so you can
   process it further with other n8n nodes.

## Setup

1. **Install and import.** Add the `n8n-nodes-atria` package to your n8n instance, then import this
   workflow.
2. **Connect Atria.** In the Atria dashboard (Account → API Keys) create an API key with the scopes
   `feeds.read`, `feeds.manage`, `outputs.read`, `outputs.manage`, and store it in n8n as an
   **Atria API** credential (base URL `https://atria.pulsy.app/api`).
3. **Fill in the placeholders and activate.** Copy the **UUID** of the feed you want to listen to into
   `REPLACE_WITH_FEED_UUID` in both Atria nodes, then activate the workflow - that attaches its webhook
   output to your feed, and every result Atria delivers starts an execution.

## Requirements

- An Atria account and an API key.
- At least one **existing, running feed** in Atria - feeds are created and configured in the Atria
  dashboard, this template only consumes them.
