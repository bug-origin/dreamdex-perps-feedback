# `fetchTicker` returns `percentage` as a fraction (ccxt uses percent) and leaves out `close`, `bid` and `ask`, though EXCHANGE.md promises ccxt field names with "nothing to surprise you"

Severity: normal
Area: SDK, docs

## Steps to reproduce
1. Build a read-only `SomniaMarkets` for Hideki (chain 50383), then call `loadMarkets()`.
2. Call `fetchTicker("BTC/USDso:USDso")` and `fetchTicker("ETH/USDso:USDso")`.
   Script: `repro/11-ticker-ccxt-fields.ts`.

## Expected
`docs/EXCHANGE.md` (lines 3-6) pitches the class as ccxt-compatible: "if you've driven a venue through ccxt, nothing here will surprise you, down to the field names". A ccxt ticker has:
- `percentage` in **percent**: `change / open * 100`, so -4.68 means -4.68%.
- `close`, equal to `last`.
- `bid` / `ask`, the top of book (often with `vwap = quoteVolume / baseVolume`).

## Actual
```
BTC/USDso:USDso {"open":81387.9,…,"close":"<undefined>","last":77579.7,"change":-3808.2,"percentage":-0.04679,"vwap":"<undefined>","bid":"<undefined>","ask":"<undefined>",…,"statsState":"ok"}
  ccxt percentage = change/open*100 = -4.6791  | SDK percentage = -0.04679073916392974
  'close' in ticker: false
```
- `percentage` is `change / open` (`exchange.ts:2644`), a fraction that is **100x smaller** than ccxt's. The only place this is documented is a JSDoc comment in `structs.ts:421` ("plain fraction (0.05 = +5%)"). The EXCHANGE.md verb table just says "24h change". A bot ported from ccxt that checks `percentage > 5` for "pumped 5%" now fires only on a +500% move. Display code shows "-0.05%" for a -4.7% day.
- `close` is never set, so ccxt code that reads `ticker.close` (the common pattern) gets `undefined`, even though `last` is right there.
- `bid`, `ask` and `vwap` are absent too, even though the book and both volumes are available. A ccxt client that computes spread from the ticker gets `NaN`.

## Evidence
- Output: `repro/11-output.txt` (BTC and ETH perps, `statsState: "ok"`, so these are not the documented "unavailable" absences).
- Source: `src/unified/exchange.ts:2644` (`const percentage = change / open`), `src/unified/structs.ts:421-422`. `close` is not among the `UnifiedTicker` fields.
- Docs claim: `docs/EXCHANGE.md:3-6`.

Suggested fix: emit `percentage` in percent, as ccxt does, or rename the fraction (e.g. `changeRatio`) and call out the difference in EXCHANGE.md. Set `close = last`, and fill `bid`/`ask`/`vwap` when they are known.

## Environment
- `@somnia-chain/markets-sdk` 0.32.1 (npm latest), Node v20.19.2
- Somnia Tokyo testnet (Hideki 2, chain 50383), indexer `https://hideki-dev.smk.somnia.host/v1/graphql`
- Read-only, no key. Reproduced 2026-10-30 UTC
