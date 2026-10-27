// Issue 07: fetchOrders(ref, since, limit) applies `since` AFTER taking the newest `limit` rows,
// so it never returns the orders that start at `since`. Read-only: a bare address as `account`, no key.
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
const INDEXER = "https://hideki-dev.smk.somnia.host/v1/graphql"
// The busiest order placer on Hideki in the last minute (found via the public indexer); any active account works.
const ACCOUNT = (process.argv[2] ?? "0x47537e3a3ea6e9391f3b26ea45618db6828c8bff").toLowerCase()
const ex: any = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: INDEXER, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, account: ACCOUNT } as any)
await ex.loadMarkets()
const iso = (ms: number) => new Date(ms).toISOString()
const since = Math.floor((Date.now() - 3600_000) / 1000) * 1000 // one hour ago, whole second, ms (ccxt convention)
console.log("account", ACCOUNT)
console.log("now  ", iso(Date.now()))
console.log("since", iso(since))

// Control: the indexer has orders for this account right after `since`.
const q = `{ Order(where:{owner:{_eq:"${ACCOUNT}"}, placedAtTimestamp:{_gte:"${Math.floor(since / 1000)}"}}, order_by:{placedAtTimestamp:asc}, limit:5){ orderId placedAtTimestamp } }`
const ctl = await (await fetch(INDEXER, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) })).json()
console.log("\nindexer: first 5 orders at/after since:")
for (const o of ctl.data.Order) console.log("  ", iso(Number(o.placedAtTimestamp) * 1000), "orderId", o.orderId)

for (const limit of [5, 100]) {
  const rows = await ex.fetchOrders(undefined, since, limit)
  const ts = rows.map((o: any) => o.timestamp).sort((a: number, b: number) => a - b)
  console.log(`\nfetchOrders(undefined, since, ${limit}) -> ${rows.length} rows, oldest ${ts.length ? iso(ts[0]) : "-"} (${ts.length ? ((ts[0] - since) / 60000).toFixed(1) : "-"} min after since), newest ${ts.length ? iso(ts.at(-1)) : "-"}`)
}

// Older `since`, small limit: the window is entirely before the newest page, so since filters it to nothing.
const rows = await ex.fetchOrders(undefined, since, 5)
const before = await ex.fetchOrders(undefined, undefined, 5)
console.log("\nsame call without since -> newest", before.map((o: any) => iso(o.timestamp)).join(", "))
console.log("with since (1h ago)     ->       ", rows.map((o: any) => iso(o.timestamp)).join(", "))
await ex.close()
process.exit(0)
