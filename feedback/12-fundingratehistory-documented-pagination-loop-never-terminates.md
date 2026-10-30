# `fetchFundingRateHistory`: the documented `since = last.timestamp + 1` pagination loop never terminates, because `since` is floored to seconds and `+1 ms` re-selects the last row

Severity: major
Area: SDK, docs

## Steps to reproduce
1. Build a read-only `SomniaMarkets` for Hideki (chain 50383) and call `loadMarkets()`.
2. Run the paging loop exactly as the `fetchFundingRateHistory` JSDoc gives it (`src/unified/exchange.ts` ~5683):
   ```ts
   for (;;) {
     const page = await exchange.fetchFundingRateHistory(sym, since, limit);
     if (page.length === 0) break;
     consume(page);
     since = page[page.length - 1].timestamp + 1;   // advances
   }
   ```
   Script: `repro/12-funding-history-cursor-stuck.ts`. It runs three cases: the middle of history with limit 3, limit 1, and starting at the newest row.

## Expected
The JSDoc says `since` "is a CURSOR … so the ccxt pagination idiom terminates" and that `since` is "inclusive", in milliseconds. Each page should start strictly after the previous page's last row, and the loop should end with `[]` once it passes the newest row.

## Actual
`since` is converted with `Math.floor(since / 1000)` and sent as an inclusive `from`. Row timestamps are whole seconds (`…000`), so `last.timestamp + 1` floors back to the same second, and the last row of every page comes back again:
```
A. limit=3: page 1 since=18:11:43.001Z -> 18:11:43Z (dup), 19:11:46Z, 20:11:43Z
            page 2 since=20:11:43.001Z -> 20:11:43Z (dup), 21:11:43Z, 22:11:43Z
B. limit=1: page 1..5 since=16:11:43.001Z -> 16:11:43Z   (same row forever)
C. at tail: page 0..5 since=15:11:44.001Z -> 15:11:44Z   (same row forever)
```
As a result:
- **Every full backfill hangs.** Case C shows that once the loop reaches the newest row, each later page is `[that row]`, never `[]`, so the documented loop spins forever (hitting the indexer in a tight loop) for **any** `limit`.
- With `limit = 1` it never advances at all, not even mid-history.
- Mid-history, every page boundary duplicates one funding row. Summing `fundingRate` over the pages (e.g. for funding-PnL) double-counts.

## Evidence
- Output: `repro/12-output.txt` (raw ms timestamps shown: `since=…703001` returns the row `…703000`).
- Source: `src/unified/exchange.ts` `fetchFundingRateHistory`: `from: Math.floor(since / 1000), order: "asc"`.

Suggested fix: use `Math.ceil(since / 1000)` for the inclusive `from` (or send an exclusive cursor), or filter `timestamp >= since` client-side after the read. Also fix the example's symbol, which uses `BTC/USDSO:USDSO`. `fetchMyTrades` converts `since` the same way (`Math.floor(since / 1000)`), so it likely has the same boundary duplicate. That needs a key, so I didn't verify it.

## Environment
- `@somnia-chain/markets-sdk` 0.32.1 (npm latest), Node v20.19.2
- Somnia Tokyo testnet (Hideki 2, chain 50383), indexer `https://hideki-dev.smk.somnia.host/v1/graphql`
- Read-only, no key. Reproduced 2026-10-30 UTC
