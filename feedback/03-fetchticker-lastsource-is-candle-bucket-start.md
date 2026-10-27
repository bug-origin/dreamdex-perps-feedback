# fetchTicker `lastSource.timestamp` reports the hourly candle's bucket start, not when the trade behind `last` happened, so a seconds-old price looks up to an hour stale

Severity: normal
Area: SDK

## Steps to reproduce
1. On Hideki: `await exchange.fetchTicker("BTC/USDso:USDso")` a few times, plus `fetchTrades(sym, undefined, 1)`. Script: `repro/03-ticker-freshness.ts`.
2. Compare `lastSource.timestamp` with the time of the latest trade, which has the same price as `last`.

## Expected
Per `dist/unified/structs.d.ts` (UnifiedTicker):
- `lastSource.timestamp` is "When the trade behind `last` happened (ms)".
- Consumers are told to "Read it against statsAsOf" to judge freshness. That only works if the field is the real trade time.

## Actual
At 04:15:48 UTC:
```
now 2026-10-27T04:15:48.527Z timestamp 2026-10-27T04:15:48.526Z statsAsOf 2026-10-27T05:00:00.000Z lastSource 2026-10-27T04:00:00.000Z last 79831
now 2026-10-27T04:15:49.889Z timestamp 2026-10-27T04:15:49.889Z statsAsOf 2026-10-27T05:00:00.000Z lastSource 2026-10-27T04:00:00.000Z last 79848.6
latest trade 2026-10-27T04:15:48.000Z 79848.6
```
- `lastSource.timestamp` is 04:00:00, while the trade behind `last` (79848.6) happened at 04:15:48. The field is up to 59m59s behind the real trade time.
- (`statsAsOf` being in the future is a separate symptom, already reported elsewhere, so it is not claimed here. It appears in the output only for context.)
- I saw the same thing at 04:11 UTC: the trade was at 04:10:25 (tx `0x7095a0250bf299066c2b59c091de2a1d2a4242dd67996a3a2e17d09ddb50f159`, block 34220443), `lastSource` was 04:00, and `statsAsOf` was 05:00.

A bot that gates on price freshness with `lastSource.timestamp` sees a 15-second-old print as 15 minutes old. It sees a 59-minute-old print and a 1-second-old print as equally fresh at :59. The type comments do say "A candle stamps its bucket start", but that conflicts with the field's own summary line ("When the trade behind `last` happened"). It also makes the field useless for freshness, which is what it exists for.

## Evidence
`repro/03-output.txt`; the Hideki trade tx above is viewable at https://explorer.testnet.somnia.network/tokyo/tx/0x7095a0250bf299066c2b59c091de2a1d2a4242dd67996a3a2e17d09ddb50f159

Suggested fix: populate `lastSource.timestamp` from the market row's `lastTradeAt`, which the indexer already has, when it is newer than the bucket start.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1, Node v20.19.2
- Network: Somnia Tokyo testnet (Hideki 2, chain 50383), indexer `https://hideki-dev.smk.somnia.host/v1/graphql`
- Wallet: `0xcF15A4f2e6Beac90e2da7bB08df353688c3fD095` (throwaway; read-only repro)
