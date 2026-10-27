// Issue 02: the hosted Hideki indexer that EXCHANGE.md says does not exist; read-only.
import { mk } from "./lib.ts"
import fs from "fs"
const docs = new URL("../node_modules/@somnia-chain/markets-sdk/docs/", import.meta.url)
for (const [f, re] of [["EXCHANGE.md", /Hideki has no hosted indexer/], ["reference/networks-and-endpoints.md", /hideki-dev\.smk\.somnia\.host/]] as const) {
  fs.readFileSync(new URL(f, docs), "utf8").split("\n").forEach((l, i) => { if (re.test(l)) console.log(`docs/${f}:${i + 1}: ${l.trim()}`) })
}
const m: any = mk(false)
const markets = await m.loadMarkets()
const perps = Object.values(markets).filter((x: any) => x.type === "swap")
console.log("indexer https://hideki-dev.smk.somnia.host/v1/graphql -> loadMarkets:", Object.keys(markets).length, "markets,", perps.length, "perps")
const tk = await m.fetchTicker("BTC/USDso:USDso"); console.log("fetchTicker BTC/USDso:USDso last", tk.last, "statsState", tk.statsState)
const ds = await m.fetchDataStatus(); console.log("fetchDataStatus indexerByChain[50383]:", JSON.stringify(ds.indexerByChain?.[50383] ?? ds.indexer, (k, v) => typeof v === "bigint" ? v.toString() : v))
console.log("run at", new Date().toISOString())
process.exit(0)
