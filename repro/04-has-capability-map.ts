// Issue 04: exchange.has omits verbs the exchange implements; read-only, no network needed.
import { mk } from "./lib.ts"
const m: any = mk(false)
const has = m.has
import fs from "fs"
console.log("SDK version:", JSON.parse(fs.readFileSync(new URL("../node_modules/@somnia-chain/markets-sdk/package.json", import.meta.url), "utf8")).version)
console.log("exchange.has =", JSON.stringify(has))
const names = new Set<string>()
for (let p = Object.getPrototypeOf(m); p && p !== Object.prototype; p = Object.getPrototypeOf(p)) Object.getOwnPropertyNames(p).forEach(n => names.add(n))
// declared `private` in dist/unified/exchange.d.ts, so not part of the public surface:
const privateInDts = new Set(["setCurrency", "fetchOpenOrdersOnchain", "fetchMyTradesOn"])
const missing = [...names].filter(n => !privateInDts.has(n)).filter(n => /^(fetch|watch|create|cancel|edit|set)/.test(n) && typeof m[n] === "function" && !(n in has))
console.log("public verbs (per exchange.d.ts) implemented but absent from exchange.has:", missing)
console.log("has.fetchTicker =", has.fetchTicker, "| typeof exchange.fetchTicker =", typeof m.fetchTicker)
console.log("has.fetchOrders =", has.fetchOrders, "| typeof exchange.fetchOrders =", typeof m.fetchOrders)
console.log("has.createStopOrder =", has.createStopOrder, "| typeof exchange.createStopOrder =", typeof m.createStopOrder)
// Capability-probing code as the d.ts comment describes it:
const pick = (verb: string) => has[verb] ? "use " + verb : "skip " + verb + " (venue says unsupported)"
console.log(["fetchTicker", "fetchOrders", "fetchOpenStopOrders", "watchUser", "fetchDataStatus"].map(pick))
process.exit(0)
