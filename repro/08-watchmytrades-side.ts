// Issue 08: watchMyTrades returns side: undefined for every spot/perp fill, while fetchMyTrades and watchTrades
// return "buy"/"sell" for the same fills. Read-only: a bare address as `account`, no key.
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
const INDEXER = "https://hideki-dev.smk.somnia.host/v1/graphql"
const gql = async (query: string) => (await (await fetch(INDEXER, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) })).json()).data

// Pick the most active taker in the latest fills (any account with recent fills on one market works).
let account = process.argv[2]?.toLowerCase()
let marketId: string | undefined
const recent = (await gql(`{ Fill(order_by:{timestamp:desc}, limit:300){ taker market_id } }`)).Fill
if (!account) {
  const c = new Map<string, number>()
  for (const f of recent) c.set(f.taker + "|" + f.market_id, (c.get(f.taker + "|" + f.market_id) ?? 0) + 1)
  ;[account, marketId] = [...c.entries()].sort((a, b) => b[1] - a[1])[0][0].split("|")
}
const ex: any = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: INDEXER, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, account } as any)
const markets = await ex.loadMarkets()
const m: any = Object.values(markets).find((x: any) => !marketId || x.id?.toLowerCase() === marketId || x.info?.id?.toLowerCase() === marketId || ex.market(x.symbol).market.id.toLowerCase() === marketId)
const symbol = m.symbol
console.log("account", account, "\nsymbol ", symbol, "| marketType", ex.market(symbol).market.marketType)

// Raw indexer rows for this account's fills: spot/perp fills carry takerIsBid but no makerSide/takerSide.
const raw = (await gql(`{ Fill(where:{market_id:{_eq:"${ex.market(symbol).market.id}"}, _or:[{taker:{_eq:"${account}"}},{maker:{_eq:"${account}"}}]}, order_by:{timestamp:desc}, limit:3){ id takerIsBid makerSide takerSide } }`)).Fill
console.log("\nindexer Fill rows:", JSON.stringify(raw))

const sides = (rows: any[]) => { const c: Record<string, number> = {}; for (const r of rows) c[String(r.side)] = (c[String(r.side)] ?? 0) + 1; return JSON.stringify(c) }
const fetched = await ex.fetchMyTrades(symbol, undefined, 20)
console.log(`\nfetchMyTrades(${symbol}) -> ${fetched.length} rows, side counts ${sides(fetched)}`)
const live = await ex.watchMyTrades(symbol, 20)
console.log(`watchMyTrades(${symbol}) -> ${live.length} rows, side counts ${sides(live)}`)
const tape = await ex.watchTrades(symbol, 20)
console.log(`watchTrades(${symbol})   -> ${tape.length} rows, side counts ${sides(tape)}  (control: public tape on the same watch)`)

const byId = new Map(fetched.map((r: any) => [r.id, r]))
console.log("\nsame fill ids, fetchMyTrades.side vs watchMyTrades.side:")
let n = 0
for (const r of live) { const f: any = byId.get(r.id); if (f && n++ < 5) console.log("  ", r.id, "fetch:", f.side, "| watch:", r.side, "| watch txHash:", r.txHash, "| fetch txHash:", f.txHash?.slice(0, 12) + "…") }

await ex.unwatchMarket(symbol)
await ex.close()
process.exit(0)
