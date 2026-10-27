# `fetchOrders(ref, since, limit)` applies `since` only after fetching the newest `limit` orders, so it never returns the orders starting at `since`

Severity: normal
Area: SDK

## Steps to reproduce
1. Build a read-only `SomniaMarkets` on Hideki, with `account` set to an address that places orders often. Script: `repro/07-fetchorders-since.ts`. It defaults to `0x4753…8bff`, which was the busiest order placer on the public indexer at the time of the run.
2. Set `since` to one hour ago, in milliseconds (the ccxt convention, and the clock of `UnifiedOrder.timestamp`).
3. As a control, query the public indexer directly for this owner's first orders with `placedAtTimestamp >= since`.
4. Call `fetchOrders(undefined, since, 5)` and `fetchOrders(undefined, since, 100)`, then compare with `fetchOrders(undefined, undefined, 5)`.

## Expected
ccxt semantics for `fetchOrders(symbol, since, limit)` are: up to `limit` orders placed at or after `since`. A bot that calls `fetchOrders(sym, lastSeen, N)` to catch up on order history should get the N orders that follow `lastSeen`. At the very least, `since` should be a server-side bound, so that `limit` counts rows that satisfy it. The sibling verb `fetchMyTrades` does this. Its docs (`src/unified/exchange.ts:3655-3657`) say the time window and the limit "are applied by the INDEXER rather than to an already-truncated page", and `fetchMyTradesOn` forwards `since` to the query (`since: sinceSec`).

## Actual
`fetchOrders` (`src/unified/exchange.ts:3045-3090`) never sends `since` to the indexer. It requests `getOrders(addr, { limit, offset })`, which is ordered `placedAtTimestamp desc`, so it gets the newest `limit` rows. It then drops rows client-side:

```ts
const tsMs = Number(o.placedAtTimestamp) * 1000;
if (since !== undefined && tsMs < since) continue;   // exchange.ts:3086
```

As a result:
- When `since` is older than the newest page, `since` does nothing. The call returns exactly what it returns without `since`: the newest orders from the last few seconds, and none of the orders from the hour that follows `since`.
- When `since` falls inside the newest page, the page is truncated silently. You get fewer than `limit` rows even when many more matching orders exist, so a caller can't tell "no more orders" from "filtered away".
- `since` and `limit` together can't be used to page forward through history. The only way to page is `params.offset` from the newest end, and the docs don't say this.

`OrdersQuery` already takes an `Order_bool_exp` `where` (`src/orders.ts:375-384`, `src/gql/gql.ts:126`). Pushing down `placedAtTimestamp: {_gte: since/1000}` would be a one-line change. Ascending order would also be needed when `since` is set, so that `limit` counts forward from `since`.

The docs also list `fetchOrders(symbol?, since?, limit?, { offset? })` in `docs/EXCHANGE.md:77`, but the JSDoc on `fetchOrders` never mentions `since`. The units table in `docs/reference/units-and-scales.md:87` lists the ms `since` of `fetchTrades`, `fetchMyTrades` and `fetchOHLCV`, but not `fetchOrders`.

This is a different verb and code path from the reported `fetchTrades`/`fetchOHLCV` `since` issues, which concern public market-data reads. Here the bug is in the authenticated order-history read, where it is also inconsistent with the sibling `fetchMyTrades`, which sends `since` to the indexer.

## Evidence
`repro/07-output.txt` (Hideki, 2026-10-27 18:05 Asia/Shanghai):
```
account 0x47537e3a3ea6e9391f3b26ea45618db6828c8bff
now   2026-10-27T10:05:07.709Z
since 2026-10-27T09:05:07.000Z

indexer: first 5 orders at/after since:
   2026-10-27T09:05:07.000Z orderId 36893488147424263846
   2026-10-27T09:05:07.000Z orderId 110680464442267371471
   2026-10-27T09:05:07.000Z orderId 202914184810810228393
   2026-10-27T09:05:07.000Z orderId 110680464442262470312
   2026-10-27T09:05:07.000Z orderId 18446744073719833729

fetchOrders(undefined, since, 5) -> 5 rows, oldest 2026-10-27T10:05:08.000Z (60.0 min after since), newest 2026-10-27T10:05:08.000Z

fetchOrders(undefined, since, 100) -> 100 rows, oldest 2026-10-27T10:05:03.000Z (59.9 min after since), newest 2026-10-27T10:05:08.000Z

same call without since -> newest 2026-10-27T10:05:08.000Z, 2026-10-27T10:05:08.000Z, 2026-10-27T10:05:08.000Z, 2026-10-27T10:05:08.000Z, 2026-10-27T10:05:08.000Z
with since (1h ago)     ->        2026-10-27T10:05:08.000Z, 2026-10-27T10:05:08.000Z, 2026-10-27T10:05:08.000Z, 2026-10-27T10:05:08.000Z, 2026-10-27T10:05:08.000Z
```

## Environment
`@somnia-chain/markets-sdk` 0.32.1, Node 20.19, Hideki testnet (chain 50383), indexer `https://hideki-dev.smk.somnia.host/v1/graphql`. Read-only (`account` address only, no key).

Suggested fix: when `since` is given, add `placedAtTimestamp: {_gte: floor(since/1000)}` to the `where` as `fetchMyTrades` does, and order ascending when `since` is set so that `limit` counts forward from it. Then document `since` (ms) in the JSDoc and in the units table.
