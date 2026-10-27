# `exchange.has` leaves out `fetchTicker`, `fetchOrders`, `watchUser`, `fetchDataStatus` and the stop-order verbs, so capability probing turns off methods that work

Severity: normal
Area: SDK

## Steps to reproduce
1. Build a `SomniaMarkets` for Hideki as in the docs (no key needed). Script: `repro/04-has-capability-map.ts`.
2. Print `exchange.has`, then compare it with the public verbs on the instance (`fetch*`, `watch*`, `create*`, `cancel*`).
3. Probe the capability the way ccxt-style bot code does: `if (exchange.has.fetchTicker) …`.

## Expected
`dist/unified/exchange.d.ts:376-380` documents `has` as the "Capability map — which unified verbs this venue supports (the ccxt `exchange.has` convention, for capability-probing bot code)". `docs/EXCHANGE.md:76-82` lists `fetchTicker`, `fetchOrders`, `createStopOrder`, `fetchOpenStopOrders` and `cancelStopOrder` as unified verbs. Every implemented public verb should be in the map, and ideally unsupported ones should be explicitly `false`, which is the ccxt convention.

## Actual
`exchange.has` has 22 keys, all `true`. Its keys even include the non-ccxt pagers `getOrdersPage` and `getOrderHistoryPage`. These public, implemented verbs are missing:

```
fetchTicker, fetchOrders, fetchPortfolioAnalytics, fetchDataStatus,
watchUser, createStopOrder, fetchOpenStopOrders, cancelStopOrder
```

(`setSigner` is missing too, but it is not a verb that ccxt tracks.)

So `has.fetchTicker === undefined` while `typeof exchange.fetchTicker === "function"`, and the same holds for `fetchOrders` and `createStopOrder`. Capability-probing code, which the comment names as the map's purpose, therefore skips the ticker. On perps the ticker is the main read: it carries mark, index, funding and OI. That code also skips order history and `watchUser`. A ccxt port that checks `has.fetchTicker` before calling it never calls it at all.

## Evidence
`repro/04-output.txt`:
```
public verbs (per exchange.d.ts) implemented but absent from exchange.has: [ 'setSigner', 'fetchTicker', 'fetchOrders', 'fetchPortfolioAnalytics', 'fetchDataStatus', 'watchUser', 'createStopOrder', 'fetchOpenStopOrders', 'cancelStopOrder' ]
has.fetchTicker = undefined | typeof exchange.fetchTicker = function
```
The type agrees with the runtime: the `readonly has: { … }` literal type in `exchange.d.ts` has no `fetchTicker` member either, so this is not a build artefact.

Suggested fix: generate `has` from the unified verb list in EXCHANGE.md. Use `true`, `false` or `"emulated"`. For example, `createStopOrder` could be marked as spot only via a per-market-type note, or kept `true` and documented as throwing `NotSupportedError` on perps.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1, Node v20.19.2
- Network: Somnia Tokyo testnet (Hideki 2, chain 50383); `has` is static, so the result is the same on any network
- Wallet: none (read-only)
