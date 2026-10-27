// Issue 05: fetchPriceOHLCV(asset, tf, since, limit) returns the NEWEST `limit` candles, not `limit` candles from `since`.
// Read-only; no wallet needed.
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES, SOMNIA_TESTNET_PRICE_FEED } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
const ex = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql",
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, priceFeed: SOMNIA_TESTNET_PRICE_FEED })
const iso = (ms: number) => new Date(ms).toISOString()
const minute = 60_000
const since = Math.floor((Date.now() - 3 * 3600_000) / minute) * minute // 3 hours ago, on a minute boundary
console.log("now   ", iso(Date.now()))
console.log("since ", iso(since), `(${since})`)

// 1) ccxt-style call: 5 one-minute candles starting at `since`
const page1 = await ex.fetchPriceOHLCV("BTC", "1m", since, 5)
console.log("\nfetchPriceOHLCV('BTC','1m', since, 5) bucket starts:")
for (const r of page1) console.log("  ", iso(r[0]), "minutes after since:", (r[0] - since) / minute)

// 2) the candles that DO exist right at `since` (same feed, narrow window via the client verb)
const s = since / 1000
const atSince = await (ex as any).client.fetchPriceCandles("BTC", "M1", { from: s, to: s + 4 * 60 })
console.log("\nclient.fetchPriceCandles('BTC','M1',{from: since, to: since+4m}) bucket starts:")
for (const c of atSince) console.log("  ", iso(c.bucketStart * 1000))

// 3) forward pagination the ccxt way: since = last candle + 1 timeframe. It never moves forward from `since`.
let cursor = since
console.log("\nccxt forward-pagination loop (pages of 5, up to 3):")
for (let i = 0; i < 3; i++) {
  const page = await ex.fetchPriceOHLCV("BTC", "1m", cursor, 5)
  if (page.length === 0) { console.log(`  page ${i + 1}: requested since ${iso(cursor)} -> [] (loop ends; everything between the first since and the newest page was never returned)`); break }
  console.log(`  page ${i + 1}: requested since ${iso(cursor)} -> got ${iso(page[0][0])} .. ${iso(page.at(-1)![0])}`)
  cursor = page.at(-1)![0] + minute
}
await ex.close()
process.exit(0)
