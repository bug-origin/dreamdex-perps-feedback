# dreamDEX Perps Builder Bounty: Feedback track

These are feedback reports on the dreamDEX perps developer surface: the `@somnia-chain/markets-sdk` unified exchange API and its bundled docs. Everything was tested on the **Somnia Tokyo testnet (Hideki 2, chain 50383)**.

Every issue below was reproduced by me. The exact script and its captured output are in [`repro/`](repro).

## Issues

| # | Severity | Area | Summary |
|---|----------|------|---------|
| [01](feedback/01-multichain-symbols-get-hash-suffix.md) | normal | SDK | With the documented Shannon+Hideki config, every shared perp gets a pool-hash suffix on both chains (`BTC-94C0/USDso:USDso`), so the docs' example `createOrder("BTC/USDso:USDso")` fails |
| [02](feedback/02-exchange-md-says-hideki-has-no-hosted-indexer.md) | normal | docs | EXCHANGE.md says Hideki has no hosted indexer; the networks reference lists one, and it works |
| [03](feedback/03-fetchticker-lastsource-is-candle-bucket-start.md) | normal | SDK | `fetchTicker`'s `lastSource.timestamp` is the hourly candle's bucket start, not the time of the trade behind `last`, so freshness checks are off by up to an hour |
| [04](feedback/04-has-capability-map-omits-implemented-verbs.md) | normal | SDK | `exchange.has` (the documented ccxt capability map) omits implemented verbs such as `fetchTicker`, `fetchOrders`, `watchUser`, `fetchDataStatus` and the stop-order verbs |
| [05](feedback/05-fetchpriceohlcv-since-limit-returns-newest-page.md) | major | SDK | `fetchPriceOHLCV(asset, tf, since, limit)` returns the newest `limit` candles rather than the ones starting at `since`, so ccxt forward pagination skips all history between `since` and now |
| [06](feedback/06-signer-required-error-names-wrong-operation.md) | minor | SDK | `fetchOpenStopOrders` and `getOrderHistoryPage` throw errors whose `operation`/message name another method (`fetchOrders` / `getOrdersPage`) |
| [07](feedback/07-fetchorders-since-is-post-filter-on-newest-page.md) | normal | SDK | `fetchOrders(ref, since, limit)` filters `since` client-side after fetching the newest `limit` orders, so it never returns the orders that start at `since` and can't page forward (unlike `fetchMyTrades`, which sends `since` to the indexer) |
| [08](feedback/08-watchmytrades-side-undefined-on-spot-perp.md) | minor | SDK, docs | `watchMyTrades` returns `side: undefined` and no `txHash` on spot/perp fills, while `fetchMyTrades`/`watchTrades` resolve the side for the same fills |
| [09](feedback/09-watchprice-fabricates-zero-price-for-unknown-asset.md) | normal | SDK | `watchPrice` resolves a made-up `{price: 0, ema: 0, timestamp: now}` for assets with no feed (7 listed Hideki markets, or a typo) where `fetchPrice` returns `null`, and the next await hangs |
| [10](feedback/10-fetchohlcv-fetchtrades-since-ignored.md) | major | SDK | `fetchOHLCV` and `fetchTrades` treat `since` as a client-side post-filter on the newest `limit` rows (it is never sent to the indexer), so ccxt backfill of market candles and trades can't page forward |

## Environment
- `@somnia-chain/markets-sdk` 0.32.1 (npm latest at time of testing); Node v20.19.2
- Somnia Tokyo testnet (Hideki 2, chain 50383): RPC `https://api.hideki2.infra.testnet.somnia.network`, indexer `https://hideki-dev.smk.somnia.host/v1/graphql`; price feed `SOMNIA_TESTNET_PRICE_FEED` (`https://price-feed.dev.oracle.somnia.host/v1/graphql`) for issues 05 and 09
- All repros are read-only. No key or funds are needed, and no transactions were sent. Tx hashes cited are existing Hideki trades, used as evidence.

## Reproducing
```bash
npm install
cd repro
npx tsx 01-multichain-symbols.ts      # issue 01
npx tsx 02-hosted-indexer.ts          # issue 02
npx tsx 03-ticker-freshness.ts        # issue 03
npx tsx 04-has-capability-map.ts      # issue 04
npx tsx 05-price-ohlcv-since.ts       # issue 05
npx tsx 06-signer-required-wrong-method.ts  # issue 06
npx tsx 07-fetchorders-since.ts       # issue 07
npx tsx 08-watchmytrades-side.ts      # issue 08
npx tsx 09-watchprice-unknown-asset.ts  # issue 09
npx tsx 10-fetchohlcv-fetchtrades-since.ts  # issue 10
```
