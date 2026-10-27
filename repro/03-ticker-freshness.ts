// Issue 03: fetchTicker freshness fields vs latest trade; read-only.
import { mk, t, j } from "./lib.ts"
const m = mk(false)
await m.loadMarkets()
const sym = "BTC/USDso:USDso"
const x:any=(m as any).market(sym); console.log(Object.keys(x)); console.log(j({...x, info: undefined}).slice(0,2500))
for (let i=0;i<3;i++){ const tk:any = await (m as any).fetchTicker(sym); console.log("now", new Date().toISOString(), "timestamp", new Date(tk.timestamp).toISOString(), "statsAsOf", new Date(tk.statsAsOf).toISOString(), "lastSource", new Date(tk.lastSource.timestamp).toISOString(), "last", tk.last) ; await new Promise(r=>setTimeout(r,1000))}
const trades:any[] = await (m as any).fetchTrades(sym, undefined, 1); console.log("latest trade", trades[0].datetime, trades[0].price)
process.exit(0)
