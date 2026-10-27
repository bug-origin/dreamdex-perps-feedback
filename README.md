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

## Environment
- `@somnia-chain/markets-sdk` 0.32.1 (npm latest at time of testing); Node v20.19.2
- Somnia Tokyo testnet (Hideki 2, chain 50383): RPC `https://api.hideki2.infra.testnet.somnia.network`, indexer `https://hideki-dev.smk.somnia.host/v1/graphql`; price feed `SOMNIA_TESTNET_PRICE_FEED` (`https://price-feed.dev.oracle.somnia.host/v1/graphql`) for issue 05
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
```
