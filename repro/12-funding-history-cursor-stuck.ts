// Issue 12: fetchFundingRateHistory's documented `since = last.timestamp + 1` cursor never advances
// (since is floored to seconds, so +1 ms re-selects the same row). The docs' loop never terminates.
import { mk } from "./lib.ts"
const ex = mk(false); await ex.loadMarkets()
const s = "BTC/USDso:USDso"
const iso = (ms: number) => new Date(ms).toISOString()
const run = async (label: string, start: number, limit: number, maxPages = 6) => {
  let since = start
  console.log(`\n${label}: documented loop, limit=${limit}, start=${iso(start)}`)
  for (let i = 0; i < maxPages; i++) {
    const page = await ex.fetchFundingRateHistory(s, since, limit)
    console.log(`  page ${i} since=${iso(since)} (${since}) -> ${page.map(r => `${iso(r.timestamp)} (${r.timestamp})`).join(", ") || "[]"}`)
    if (page.length === 0) { console.log("  terminated"); return }
    since = page[page.length - 1].timestamp + 1
  }
  console.log(`  still non-empty after ${maxPages} pages -> loop would spin forever`)
}
await run("A. middle of history", Date.now() - 3 * 86400e3, 3, 3)
await run("B. limit=1", Date.now() - 3 * 86400e3, 1)
const newest = (await ex.fetchFundingRateHistory(s, undefined, 1))[0]
await run("C. at the tail (start = newest row)", newest.timestamp, 100)
process.exit(0)
