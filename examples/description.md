## What this does

Your Atria feed watches the chain and delivers every matching ERC-20 transfer to n8n. This workflow turns those events into a priced, safety-checked, labelled ledger in Google Sheets, and posts an hourly whale digest to your Telegram chat. A weekly job keeps the ledger small.

Only transfers worth $100,000 or more are kept, and only the ones the workflow managed to put a USD price on.

## How it works

- **Atria Trigger**: creates and starts its own ERC-20 Atria feed when you activate the workflow, and delivers the largest transfer of each block.
- **Token Price & Meta (CoinGecko)**: looks each token market price.
- **Amount Resolve**: turns the raw token amount into USD value.
- **USD Value Filter and Whale Gate**: keep only the transfers big enough to be worth alerting on.
- **Token Safety (GoPlus) and Safety Resolve**: mark the risky tokens, such as honeypots and contracts with a changeable owner.
- **Known Wallets (Sheets) and Known Wallet Labels**: put a name on the sender and the receiver when you have labelled that address before.
- **Hourly digest**: reads the ledger back, summarises the last hour, lets Gemini analyze collected transfers, and posts them to Telegram.
- **Weekly partitioning**: moves rows older than a week into an archive tab, then deletes them from the ledger.

## Setup

1. **Install and import.** Add the `n8n-nodes-atria` community node to your n8n instance, then import this workflow.
2. **Connect Atria.** In the Atria dashboard (Account → API Keys) create an API key with the scopes `feeds.read`, `feeds.manage`, `outputs.read`, `outputs.manage`, and store it in n8n as an Atria API credential (base URL `https://atria.pulsy.app/api`).
3. **Create one spreadsheet with three tabs:** `Whale transfers` for the ledger, `Wallets` with two columns `address,label` for your known addresses, and `Whale transfers archive` with the same header as the ledger. The columns the workflow fills are listed on the *Append row in sheet* node.
4. **Paste the spreadsheet ID** into the six `REPLACE_WITH_SPREADSHEET_ID` fields, and select your Google Sheets credential in the same six nodes.
5. **Connect Telegram.** Add a Telegram credential and put your chat id into `REPLACE_WITH_TELEGRAM_CHAT_ID`.
6. **Connect Gemini.** Add a Google Gemini credential to the chat-model node.

### Tuning it

- Whale floor: `WHALE_MIN_USD` in Whale Gate.
- Ledger retention: `RETAIN_DAYS` in Partition Ledger Rows.
- Notification rate: Once per Hour.

## Requirements

- An Atria account and an API key.
- A Google account for the ledger.
- A Telegram bot and the chat id to post to.
- A Gemini API key for the digest agent.