# `watchPrice` resolves a made-up `{ price: 0, ema: 0, timestamp: now }` for an asset with no feed (listed markets included, and typos), where `fetchPrice` returns `null`

Severity: normal
Area: SDK

## Steps to reproduce
1. Build a `SomniaMarkets` on Hideki with `priceFeed: SOMNIA_TESTNET_PRICE_FEED`, as in `docs/PRICES.md`. Script: `repro/09-watchprice-unknown-asset.ts` (read-only).
2. Call `fetchPrice(asset)` for the base asset of every spot/perp market `loadMarkets()` lists, plus a typo (`BTCX`).
3. For `BTC` and for assets where `fetchPrice` returned `null`, call `watchPrice(asset)`. Then await `watchPrice` a second time on one of them.
4. Read `fetchDataStatus().prices` and `client.getPriceStatus(asset)`.

## Expected
`fetchPrice` is documented as returning `UnifiedPrice | null`, with `null` when "the feed has no observations yet". `watchPrice` reads the same feed. With no price available, it should say so: return `null`, throw (`InvalidInputError` for an asset the feed doesn't know), or keep waiting. It should not make up a price.

## Actual
`watchPrice` resolves straight away (about 100 ms) with a well-formed struct for any asset the feed has no price for:

```
{"symbol":"1000PEPE","price":0,"ema":0,"datetime":"<now>","info":null}
```

The `timestamp`/`datetime` is the local wall clock, so the row looks fresh. The only sign that it is fake is `info: null`. This happens for 7 of the 24 spot/perp base assets listed on Hideki (`1000PEPE`, `LIT`, `VVV`, `ZRO` perps, and `STT`, `WBTC`, `WETH` spot). It also happens for a typo (`BTCX`). The next `await watchPrice(asset)` then never resolves (no tick arrives), so the loop in `docs/PRICES.md` (`for await … { const tick = await exchange.watchPrice("BTC") }`) receives one zero price and then hangs silently.

Cause: `src/unified/exchange.ts:4933-4950`. The `nextTick` mapper falls back to a literal object when `getLivePrice(key)` is `null`:
```ts
(live) => this.toUnifiedPrice(key, live) ?? {
  symbol: key, price: 0, ema: 0,
  timestamp: Date.now(), datetime: Structs.toDatetime(Date.now()), info: null,
}
```
The declared return type is `Promise<UnifiedPrice>` with no null case, and neither the JSDoc, `docs/EXCHANGE.md` nor `docs/PRICES.md` mentions a zero sentinel. `fetchPrice` (`exchange.ts:4956`) maps the same `null` to `null`.

Impact: a bot that values positions, sizes orders or checks deviation against the index price with `watchPrice` gets `0` for a listed market, or for a mistyped asset name, with a current timestamp. For example, a "mark vs index deviation" guard computes 100% deviation, or a notional computes as 0. The health surfaces do not reliably flag it either. In the same run, `client.getPriceStatus` reported `"live"` for the typo `BTCX`, and `fetchDataStatus().prices` reported `"hydrated"` for `LIT`, `STT` and `BTCX`, with an overall `status: "ok"`. Only `1000PEPE`, after the 10-second second await, had moved to `"error"`.

## Evidence
`repro/09-output.txt` (Hideki + `SOMNIA_TESTNET_PRICE_FEED`, 2026-10-27 18:15 Asia/Shanghai):
```
run at 2026-10-27T10:14:58.361Z
spot/perp bases checked: 25 | fetchPrice() === null for: ["1000PEPE (1000PEPE/USDso:USDso)","LIT (LIT/USDso:USDso)","STT (STT/USDso)","VVV (VVV/USDso:USDso)","WBTC (WBTC/USDso)","WETH (WETH/USDso)","ZRO (ZRO/USDso:USDso)","BTCX (typo, not listed)"]

[BTC]
  fetchPrice : {"symbol":"BTC","price":79415.35,"ema":79411.7775872548,"datetime":"2026-10-27T10:15:02.000Z","info":"<LivePrice>"}
  watchPrice : {"symbol":"BTC","price":79415.35,"ema":79411.7775872548,"datetime":"2026-10-27T10:15:02.000Z","info":"<LivePrice>"}  (127 ms)

[1000PEPE]
  fetchPrice : null
  watchPrice : {"symbol":"1000PEPE","price":0,"ema":0,"datetime":"2026-10-27T10:15:03.239Z","info":null}  (107 ms)

[LIT]
  fetchPrice : null
  watchPrice : {"symbol":"LIT","price":0,"ema":0,"datetime":"2026-10-27T10:15:03.447Z","info":null}  (108 ms)

[STT]
  fetchPrice : null
  watchPrice : {"symbol":"STT","price":0,"ema":0,"datetime":"2026-10-27T10:15:03.657Z","info":null}  (107 ms)

[BTCX]
  fetchPrice : null
  watchPrice : {"symbol":"BTCX","price":0,"ema":0,"datetime":"2026-10-27T10:15:03.872Z","info":null}  (112 ms)

second watchPrice(1000PEPE): no resolution within 10000 ms (10000 ms)

fetchDataStatus().status: ok | prices: [{"asset":"BTC","health":"streaming"},{"asset":"1000PEPE","health":"error"},{"asset":"LIT","health":"hydrated"},{"asset":"STT","health":"hydrated"},{"asset":"BTCX","health":"hydrated"}]
client.getPriceStatus: {"BTC":"live","1000PEPE":"error","BTCX":"live"}
```

## Suggested fix
Make `watchPrice` return `Promise<UnifiedPrice | null>` (like `fetchPrice`), or have it wait for the first real observation. Reject unknown assets with `InvalidInputError` (`listPriceFeeds()` already knows the feed set). At least document the sentinel and use a non-current timestamp (e.g. `0`) so freshness checks can catch it.

## Environment
- `@somnia-chain/markets-sdk` 0.32.1, Node v20.19.2
- Hideki 2 (chain 50383), indexer `https://hideki-dev.smk.somnia.host/v1/graphql`; price feed `SOMNIA_TESTNET_PRICE_FEED` (`https://price-feed.dev.oracle.somnia.host/v1/graphql`, quote `USDC`)
- Read-only; no signer, no transactions
