// Issue 11: fetchTicker percentage is a fraction (ccxt: percent) and close is missing (ccxt: close == last).
import { mk } from "./lib.ts"
const ex = mk(false); await ex.loadMarkets()
for (const s of ["BTC/USDso:USDso", "ETH/USDso:USDso"]) {
  const tk: any = await ex.fetchTicker(s)
  const pick = Object.fromEntries(["open","high","low","close","last","change","percentage","vwap","bid","ask","baseVolume","quoteVolume","statsState"].map(k => [k, tk[k]]))
  console.log(s, JSON.stringify(pick, (k, v) => v === undefined ? "<undefined>" : v))
  console.log(`  ccxt percentage = change/open*100 = ${(tk.change / tk.open * 100).toFixed(4)}  | SDK percentage = ${tk.percentage}`)
  console.log(`  'close' in ticker: ${"close" in tk}; last = ${tk.last}`)
}
process.exit(0)
