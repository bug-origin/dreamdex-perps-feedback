// Issue 06: SignerRequiredError names a different method than the one called. Read-only, no wallet.
import { mk } from "./lib.ts"
const ex: any = mk(false) // no privateKey / account
const calls: [string, () => Promise<unknown>][] = [
  ["fetchOpenStopOrders()", () => ex.fetchOpenStopOrders()],
  ["getOrderHistoryPage()", () => ex.getOrderHistoryPage()],
  ["fetchOrders()  (control)", () => ex.fetchOrders()],
  ["fetchPositions()  (control)", () => ex.fetchPositions()],
]
for (const [name, f] of calls) {
  try { await f(); console.log(name.padEnd(28), "-> resolved (unexpected)") }
  catch (e: any) { console.log(name.padEnd(28), "->", e?.name, "| operation:", JSON.stringify(e?.operation), "|", e?.message) }
}
// Same for input validation: getOrderHistoryPage reports itself as getOrdersPage (read-only account, any address).
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
const ro: any = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql",
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, account: "0x000000000000000000000000000000000000dEaD" } as any)
try { await ro.getOrderHistoryPage({ limit: 0 }) } catch (e: any) { console.log("getOrderHistoryPage({limit:0}) ->", e?.name, "|", e?.message) }
await ex.close?.()
process.exit(0)
