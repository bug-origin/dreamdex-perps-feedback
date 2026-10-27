import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import fs from "fs"
// Testnet-only throwaway key: PRIVATE_KEY env var, or a local ../.wallet.key (gitignored). Read-only repros need none.
const keyFile = new URL("../.wallet.key", import.meta.url)
export const pk = (process.env.PRIVATE_KEY ?? (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8") : "")).trim() as `0x${string}`
export const mk = (withKey = true) => new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES, ...(withKey && pk ? { privateKey: pk } : {}) })
export const j = (v: any) => JSON.stringify(v, (k, x) => typeof x === "bigint" ? x.toString() + "n" : x, 2)
export async function t(name: string, f: () => any) {
  const s = Date.now()
  try { const r = await f(); console.log(`== ${name} OK (${Date.now() - s}ms)\n${j(r)?.slice(0, 3000)}`); return r }
  catch (e: any) { console.log(`== ${name} ERR (${Date.now() - s}ms) ${e?.constructor?.name}: ${e?.shortMessage ?? e?.message}\n  ${j({ name: e?.name, code: e?.code, errorName: e?.errorName, details: e?.details })}`) }
}
