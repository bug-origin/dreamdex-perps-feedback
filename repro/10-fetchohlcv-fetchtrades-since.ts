// Issue 10: fetchOHLCV / fetchTrades `since` is a client-side post-filter on the newest page.
import { mk } from "./lib.ts"
const ex = mk(false)
await ex.loadMarkets()
const sym = "BTC/USDso:USDso"
const iso = (ms: number) => new Date(ms).toISOString()
// Baseline: what history exists?
const all = await ex.fetchOHLCV(sym, "1h", undefined, 500)
console.log(`fetchOHLCV(${sym}, 1h, undefined, 500): ${all.length} candles, ${iso(all[0][0])} .. ${iso(all.at(-1)![0])}`)
const since = all[0][0]
for (const lim of [5, 24]) {
  const r = await ex.fetchOHLCV(sym, "1h", since, lim)
  console.log(`fetchOHLCV(${sym}, 1h, since=${iso(since)}, limit=${lim}): ${r.length} rows -> ${r.map(x => iso(x[0])).join(", ") || "[]"}`)
}
const tr = await ex.fetchTrades(sym, undefined, 200)
const oldest = tr.at(-1)!, newest = tr[0]
console.log(`\nfetchTrades(${sym}, undefined, 200): ${tr.length} trades, ${iso(oldest.timestamp)} .. ${iso(newest.timestamp)}`)
const r2 = await ex.fetchTrades(sym, oldest.timestamp, 5)
console.log(`fetchTrades(${sym}, since=${iso(oldest.timestamp)}, limit=5): ${r2.length} rows -> ${r2.map(x => iso(x.timestamp)).join(", ") || "[]"}`)
process.exit(0)
