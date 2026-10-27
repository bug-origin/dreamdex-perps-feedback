# `watchMyTrades` returns `side: undefined` (and no `txHash`) on every spot/perp fill, while `fetchMyTrades` returns `buy`/`sell` for the same fill ids

Severity: minor
Area: SDK, docs

## Steps to reproduce
1. Build a read-only `SomniaMarkets` on Hideki, with `account` set to an address that has recent perp fills. Script: `repro/08-watchmytrades-side.ts`. It picks the most active taker from the latest indexer fills; at run time that was `0x5ad3…3817` on `ETH/USDso:USDso`.
2. Call `fetchMyTrades(symbol, undefined, 20)` and `watchMyTrades(symbol, 20)`. As a control on the same watch, call `watchTrades(symbol, 20)`.
3. Compare `side` and `txHash` for fill ids that both calls return.

## Expected
`watchMyTrades` is the streaming counterpart of `fetchMyTrades` (`docs/how-to/detect-fills.md`: "Use it when you care about executions … for example to update inventory"). For the same fill it should report the same `side`, the account's direction, which is what an inventory update needs. It should also carry the `txHash` that `UnifiedTrade` documents, as `fetchMyTrades` and `watchTrades` do.

## Actual
Every spot/perp row from `watchMyTrades` has `side: undefined` and `txHash: undefined`. For the same fill ids, `fetchMyTrades` returns `buy`/`sell` and a tx hash. `watchTrades` on the same live store also resolves `side` for spot/perp.

The cause is in `src/unified/exchange.ts:4247-4280`. `watchMyTrades` derives the side only from `f.takerSide` / `f.makerSide` (via `sideView`). These are binary-only `BinarySide` fields, and they are `null` on every spot/perp `Fill` row (see the indexer rows below), and `undefined` for live events (`src/reducer.ts:403`). The method has no spot/perp branch, although the same file already contains two:
- `watchTrades` (exchange.ts:4122-4123): `else if (f.takerIsBid !== undefined) side = f.takerIsBid ? "buy" : "sell"`
- `fetchMyTrades` → `takerSideView(row, asMaker)` (exchange.ts:3806-3810): `asMaker ? !row.takerIsBid : row.takerIsBid`, which gives the account's own direction.

The returned object literal also omits `txHash`. The sibling `watchTrades` literal includes `txHash: f.txHash`.

`docs/how-to/detect-fills.md` does say: "On spot and perp markets `side` is absent: the pools do not attribute a fill to a side in a way the SDK can map to you. Read `t.info.takerIsBid` and compare `t.info.maker` with your address instead." The behaviour is therefore known, but the reason given is not correct. The SDK already maps exactly those two fields to the account's side in `fetchMyTrades`, so the same `UnifiedTrade` shape means different things depending on which of the two sibling verbs produced it. A bot that seeds inventory with `fetchMyTrades` and then follows it with `watchMyTrades`, as the how-to suggests, has to special-case `side` on the streaming path. The same how-to's own example loop prints `t.side` for `"SOMI/USDso"`, a spot market, where it is always `undefined`.

## Evidence
`repro/08-output.txt` (Hideki, 2026-10-27 18:10 Asia/Shanghai):
```
account 0x5ad3f981bc477868844f1c925a82c6c0f5a33817 
symbol  ETH/USDso:USDso | marketType PERP

indexer Fill rows: [{"id":"34436630_155","takerIsBid":false,"makerSide":null,"takerSide":null},{"id":"34436629_76","takerIsBid":false,"makerSide":null,"takerSide":null},{"id":"34436596_17","takerIsBid":true,"makerSide":null,"takerSide":null}]

fetchMyTrades(ETH/USDso:USDso) -> 20 rows, side counts {"sell":13,"buy":7}
watchMyTrades(ETH/USDso:USDso) -> 20 rows, side counts {"undefined":20}
watchTrades(ETH/USDso:USDso)   -> 20 rows, side counts {"sell":11,"buy":9}  (control: public tape on the same watch)

same fill ids, fetchMyTrades.side vs watchMyTrades.side:
   34436630_155 fetch: sell | watch: undefined | watch txHash: undefined | fetch txHash: 0x65a383f7e9…
   34436629_76 fetch: sell | watch: undefined | watch txHash: undefined | fetch txHash: 0x597ad19d52…
   34436596_17 fetch: buy | watch: undefined | watch txHash: undefined | fetch txHash: 0xbfea311dda…
   34436569_5 fetch: sell | watch: undefined | watch txHash: undefined | fetch txHash: 0x469cd4247f…
   34436533_10 fetch: buy | watch: undefined | watch txHash: undefined | fetch txHash: 0xf6cc7ff332…
```

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1, Node v20.19.2
- Hideki testnet (chain 50383), indexer `https://hideki-dev.smk.somnia.host/v1/graphql`, chain WebSocket from the `hidekiTestnet` preset
- Read-only (`account` address only, no key)

Suggested fix: in `watchMyTrades`, for non-binary markets use `asMaker = f.maker?.toLowerCase() === lcAddr` and `side = asMaker ? !f.takerIsBid : f.takerIsBid` (the `takerSideView` logic), add `txHash: f.txHash`, and drop the "absent on spot and perp" paragraph from `detect-fills.md`.
