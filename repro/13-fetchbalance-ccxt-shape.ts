// Issue 13: fetchBalance has no ccxt top-level free/used/total/info maps.
// Needs a signer (any testnet key, no funds needed): export PRIVATE_KEY=0x<your throwaway testnet key>
import { mk } from "./lib.ts"
const ex: any = mk(true)
if (!ex.walletAddress) throw new Error("set PRIVATE_KEY")
await ex.loadMarkets()
const b: any = await ex.fetchBalance()
console.log("wallet:", ex.walletAddress)
console.log("top-level keys:", Object.keys(b).join(","))
console.log("typeof b.free / b.used / b.total / b.info:", typeof b.free, typeof b.used, typeof b.total, typeof b.info)
console.log("per-currency shape (USDso):", JSON.stringify(b.USDso))
// Common ccxt idioms:
for (const [label, f] of [["balance.total.USDso", () => b.total.USDso], ["balance.free['USDso']", () => b.free["USDso"]], ["Object.entries(balance.total)", () => Object.entries(b.total).length]] as const) {
  try { console.log(label, "->", (f as any)()) } catch (e: any) { console.log(label, "-> throws", e.constructor.name + ":", e.message) }
}
process.exit(0)
