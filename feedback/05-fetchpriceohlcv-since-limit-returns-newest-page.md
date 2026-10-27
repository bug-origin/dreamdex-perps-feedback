# `fetchPriceOHLCV(asset, tf, since, limit)` returns the newest `limit` candles instead of the candles starting at `since`, so forward pagination skips history

Severity: major
Area: SDK

## Steps to reproduce
1. Build a `SomniaMarkets` for Hideki with `priceFeed: SOMNIA_TESTNET_PRICE_FEED` (no key needed). Script: `repro/05-price-ohlcv-since.ts`.
2. Set `since` to 3 hours ago, on a minute boundary, and call `exchange.fetchPriceOHLCV("BTC", "1m", since, 5)`.
3. As a control, read the same window directly with `client.fetchPriceCandles("BTC", "M1", { from: since/1000, to: since/1000 + 240 })`.
4. Paginate the ccxt way: `since = lastCandle[0] + 60_000`, then repeat the call.

## Expected
The positional `(asset, timeframe, since, limit)` signature follows the ccxt convention, where `since` + `limit` means "the first `limit` candles at or after `since`". That makes `since` a forward cursor. The SDK already implements this for `fetchFundingRateHistory`: `src/unified/exchange.ts:5673` says "`since` is a CURSOR, not just a window bound: passing it walks FORWARD from that…", and `:5705` says "With `since` the read ASCENDS, so the page starts at the cursor". So step 2 should return the 06:59–07:03 candles.

## Actual
`since` only works as a lower bound. The query always sorts newest-first before applying `limit`. `src/priceFeed/query.ts:509-519` (`getPriceCandles`) adds `bucketStart >= from` but still sends `order_by: {bucketStart: desc}, limit: $limit` and then reverses the result. As a result:

- the call returns the **5 most recent** candles, starting 176 minutes after `since`;
- the candles at `since` exist: the control read returns them;
- the next ccxt page (`since = last + 1m`) starts in the future and returns `[]`. A forward pagination loop therefore ends after one page, and the 3 hours between `since` and the newest page are never returned. Nothing signals that data was skipped.

Backfilling index-price history is affected: a chart, a backtest, or a mark-vs-index check over a past range all start from a `since` cursor and all lose that range. The same happens when the window is bigger than `limit` (default 500). For example, `since` = 1 day ago with `1m` candles and no `limit` returns only the last 500 minutes, not the first 500 minutes of the day.

## Evidence
`repro/05-output.txt`:
```
since  2026-10-27T06:59:00.000Z (1793084340000)

fetchPriceOHLCV('BTC','1m', since, 5) bucket starts:
   2026-10-27T09:55:00.000Z minutes after since: 176
   ...
   2026-10-27T09:59:00.000Z minutes after since: 180

client.fetchPriceCandles('BTC','M1',{from: since, to: since+4m}) bucket starts:
   2026-10-27T06:59:00.000Z
   2026-10-27T07:00:00.000Z
   ...
ccxt forward-pagination loop (pages of 5, up to 3):
  page 1: requested since 2026-10-27T06:59:00.000Z -> got 2026-10-27T09:55:00.000Z .. 2026-10-27T09:59:00.000Z
  page 2: requested since 2026-10-27T10:00:00.000Z -> [] (loop ends; everything between the first since and the newest page was never returned)
```

Suggested fix: when `from` is given (with no `to`), sort ascending (`order_by: {bucketStart: asc}`) so that `limit` keeps the oldest candles in the window. Keep the newest-first behaviour only when there is no lower bound. This mirrors `fetchFundingRateHistory`. Alternatively, document on `fetchPriceOHLCV` and `fetchPriceCandles` that `limit` keeps the newest rows of the window and that callers must paginate backwards with `to`. Note that `fetchPriceOHLCV` cannot pass `to` at all today.

(This is not the `fetchOHLCV` issue where `since` is ignored. There, `since` never reaches the book-candle query. Here, `since` does reach the price-feed query, but the sort order discards the rows it selects.)

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1, Node v20.19.2
- Network: Somnia Tokyo testnet (Hideki 2, chain 50383) client + `SOMNIA_TESTNET_PRICE_FEED` (https://price-feed.dev.oracle.somnia.host/v1/graphql)
- Wallet: none (read-only)
- Run: 2026-10-27 ~09:59 UTC
