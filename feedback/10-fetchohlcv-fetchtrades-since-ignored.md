# `fetchOHLCV` and `fetchTrades` ignore `since` as a cursor: they return the newest `limit` rows, so ccxt-style backfill of market candles and trades is impossible

Severity: major
Area: SDK

## Steps to reproduce
1. Build a read-only `SomniaMarkets` for Hideki (chain 50383) with the hosted indexer and call `loadMarkets()`.
2. `fetchOHLCV("BTC/USDso:USDso", "1h", undefined, 500)` to see how much history exists (500 hourly candles, starting 2026-10-09T01:00Z).
3. `fetchOHLCV("BTC/USDso:USDso", "1h", since = <first candle ts>, 5)`.
4. `fetchTrades("BTC/USDso:USDso", undefined, 200)`, then `fetchTrades(sym, since = <oldest of those>, 5)`.
   Script: `repro/10-fetchohlcv-fetchtrades-since.ts`.

## Expected
Per the ccxt convention that the unified API follows (and that the SDK already follows in `fetchFundingRateHistory` and `fetchMyTrades`), `since` is a lower bound the server pages from. `fetchOHLCV(sym, "1h", 2026-10-09T01:00Z, 5)` should return the candles for 01:00–05:00 on 2026-10-09. `fetchTrades(sym, since, 5)` should return the 5 trades starting at `since`.

## Actual
Both return the newest `limit` rows, because `since` is never sent to the indexer:
```
fetchOHLCV(BTC/USDso:USDso, 1h, since=2026-10-09T01:00:00.000Z, limit=5): 5 rows -> 2026-10-30T12:00Z … 2026-10-30T16:00Z
fetchTrades(BTC/USDso:USDso, since=2026-10-30T16:02:03.000Z, limit=5): 5 rows -> 2026-10-30T16:05:59Z, 16:05:57Z, 16:05:54Z …
```
In `src/unified/exchange.ts`:
- `fetchOHLCV` (line ~2443): `getCandles(t.pool, interval, { limit, market })` is called with no `from`, then `.filter((row) => since === undefined || row[0] >= since)`.
- `fetchTrades` (line ~2383): `getFills(t.pool, { limit: Math.max(limit, TRADE_PAGE) })`, then `.slice(0, limit)` (newest first), then `.filter(tr.timestamp >= since)`.

As a result:
- The standard ccxt backfill loop (`since = last.ts + 1`) never moves forward. Every call returns the same newest page, so a bot or charting client that backfills history either loops forever or silently gets only the last `limit` rows.
- If `since` is newer than the newest page's start, you get fewer than `limit` rows. If it is older, `since` has no effect at all.
- `fetchTrades` also returns rows newest-first, while ccxt expects trades in ascending order. The same `since` page is therefore not even ordered from the cursor.

This is the same class of bug already reported for `fetchPriceOHLCV` (issue 05) and `fetchOrders` (issue 07). Those cover the price-feed candles and the private order history. This issue covers the two core **public market-data** verbs, `fetchOHLCV` and `fetchTrades`. `fetchFundingRateHistory` in the same file shows the intended fix: it passes `from: Math.floor(since / 1000), order: "asc"` and documents `since` as a forward cursor.

## Evidence
- Output: `repro/10-output.txt`
- Source: `node_modules/@somnia-chain/markets-sdk/src/unified/exchange.ts`, `fetchTrades` and `fetchOHLCV`; compare `fetchFundingRateHistory` (~line 5699).

Suggested fix: forward `since` (as seconds) to `getCandles` / `getFills` with ascending order, as `fetchFundingRateHistory` does. If that isn't possible, document that `since` is only a post-filter.

## Environment
- `@somnia-chain/markets-sdk` 0.32.1 (npm latest), Node v20.19.2
- Somnia Tokyo testnet (Hideki 2, chain 50383), indexer `https://hideki-dev.smk.somnia.host/v1/graphql`
- Read-only, no key. Reproduced 2026-10-30 UTC
