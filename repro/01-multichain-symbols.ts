// Issue 01: the EXCHANGE.md two-testnet config; read-only.
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk"
import { hidekiTestnet, somniaShannon } from "@somnia-chain/markets-sdk/chains"
const ex:any = new SomniaMarkets({ chains: [
 { chain: somniaShannon, indexerUrl: "https://dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_TESTNET_ADDRESSES },
 { chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES },
]} as any)
const mk = await ex.loadMarkets()
const syms = Object.keys(mk).filter(s=>s.includes(":USDso"))
for (const s of syms) { const m=ex.market(s); console.log(s.padEnd(28), m.chainId, m.pool) }
console.log("has BTC/USDso:USDso?", "BTC/USDso:USDso" in mk)
try { ex.market("BTC/USDso:USDso"); console.log("market ok") } catch(e:any){ console.log("market ERR", e.name, e.message) }
try { const t = await ex.fetchTicker("BTC/USDso:USDso"); console.log("ticker ok", t.symbol) } catch(e:any){ console.log("fetchTicker ERR", e.name, e.message) }
try { await ex.createOrder("BTC/USDso:USDso", "limit", "buy", 1, 60000) } catch(e:any){ console.log("createOrder ERR", e.name, e.message) }
process.exit(0)
