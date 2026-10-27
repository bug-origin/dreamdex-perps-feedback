// Issue 09: watchPrice() resolves a fabricated {price: 0, ema: 0, timestamp: now}
// for an asset the feed has no observations for, where fetchPrice() returns null.
// Read-only: no signer, no transactions.
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES, SOMNIA_TESTNET_PRICE_FEED } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"

const ex: any = new SomniaMarkets({
  chain: hidekiTestnet,
  indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql",
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  priceFeed: SOMNIA_TESTNET_PRICE_FEED, // { url, quote: "USDC" } as in docs/PRICES.md
  account: "0x0000000000000000000000000000000000000001",
} as any)

const show = (p: any) =>
  p === null ? "null" : JSON.stringify({ symbol: p.symbol, price: p.price, ema: p.ema, datetime: p.datetime, info: p.info === null ? null : "<LivePrice>" })
const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error(`no resolution within ${ms} ms`)), ms))])

console.log("run at", new Date().toISOString())
// Bases of the dreamDEX markets listed on Hideki, plus a typo.
await ex.loadMarkets()
const bySym: Record<string, string> = {}
for (const m of Object.values(ex.markets) as any[]) if (!String(m.base).includes("-")) bySym[m.base] ??= m.symbol // skip binary series
const bases = Object.keys(bySym).sort()
const assets = ["BTC", ...bases.filter((b) => b !== "BTC"), "BTCX"]
const missing: string[] = []
for (const a of assets) {
  const f = await ex.fetchPrice(a)
  if (f === null) missing.push(a)
}
console.log("spot/perp bases checked:", assets.length, "| fetchPrice() === null for:", JSON.stringify(missing.map((a) => bySym[a] ? `${a} (${bySym[a]})` : `${a} (typo, not listed)`)))

for (const a of ["BTC", ...missing.slice(0, 3), "BTCX"]) {
  const fetched = await ex.fetchPrice(a)
  const t0 = Date.now()
  let watched: string
  try { watched = show(await withTimeout(ex.watchPrice(a), 15000)) } catch (e: any) { watched = `ERR ${e.name}: ${e.message}` }
  console.log(`\n[${a}]`)
  console.log("  fetchPrice :", show(fetched))
  console.log(`  watchPrice : ${watched}  (${Date.now() - t0} ms)`)
}

// A second await on an asset that never ticks: does the docs' loop ever see a change?
const probe = missing[0] ?? "BTCX"
const t1 = Date.now()
try { console.log(`\nsecond watchPrice(${probe}):`, show(await withTimeout(ex.watchPrice(probe), 10000))) }
catch (e: any) { console.log(`\nsecond watchPrice(${probe}): ${e.message} (${Date.now() - t1} ms)`) }

await ex.close()
process.exit(0)
