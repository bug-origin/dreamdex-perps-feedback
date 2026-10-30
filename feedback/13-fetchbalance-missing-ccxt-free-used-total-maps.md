# `fetchBalance` has no ccxt top-level `free`/`used`/`total`/`info` maps, so the standard `balance.total.USDso` idiom throws `TypeError`

Severity: normal
Area: SDK, docs

## Steps to reproduce
1. Build `SomniaMarkets` for Hideki (chain 50383) with any testnet signer (`export PRIVATE_KEY=0x…`). No funds are needed. Then call `loadMarkets()`.
2. Run `const b = await exchange.fetchBalance()` and read it the ccxt way: `b.total.USDso`, `b.free["USDso"]`, `Object.entries(b.total)`.
   Script: `repro/13-fetchbalance-ccxt-shape.ts`.

## Expected
`docs/EXCHANGE.md` (lines 3-6) says that for a ccxt user "nothing here will surprise you, down to the field names". A ccxt balance structure has both:
- per-currency entries, `b.USDso = {free, used, total}`, and
- top-level maps `b.free`, `b.used`, `b.total` (currency → amount), plus `b.info`.

Portfolio and risk code very commonly iterates `balance.total` or reads `balance.free[quote]` before sizing an order.

## Actual
Only the per-currency entries exist. The top-level `free`/`used`/`total`/`info` keys are absent:
```
top-level keys: STT,tUSDC,ZRO,USDso,PUMP,LIT,1000PEPE,…
typeof b.free / b.used / b.total / b.info: undefined undefined undefined undefined
balance.total.USDso -> throws TypeError: Cannot read properties of undefined (reading 'USDso')
balance.free['USDso'] -> throws TypeError: Cannot read properties of undefined (reading 'USDso')
Object.entries(balance.total) -> throws TypeError: Cannot convert undefined or null to object
```
The `UnifiedBalances` type is just `{ [code: string]: UnifiedBalance }` (`src/unified/structs.ts:356`). A ccxt-ported bot crashes on its first balance check. The EXCHANGE.md verb table only says "wallet balances by currency code" and never mentions that this departs from ccxt.

There is also a design hazard if this gets fixed naively: because the map is keyed by arbitrary currency codes, adding top-level `free`/`total` keys could collide with a token whose symbol is `free` or `total`. ccxt avoids this by reserving those keys.

## Evidence
- Output: `repro/13-output.txt`. Fresh testnet wallet `0x14532294996feA672ff2e05BFFfEE055302526Db`, all balances 0. The shape is the same regardless of balance.
- Source: `src/unified/structs.ts:356-358`. Docs: `docs/EXCHANGE.md:3-6`, `:64`, `:247-249`.

Suggested fix: add the ccxt `free`/`used`/`total` maps and `info`, or state in EXCHANGE.md that `fetchBalance` is per-currency only.

## Environment
- `@somnia-chain/markets-sdk` 0.32.1 (npm latest), Node v20.19.2
- Somnia Tokyo testnet (Hideki 2, chain 50383), RPC `https://api.hideki2.infra.testnet.somnia.network`
- Signer: throwaway, unfunded testnet key, read-only (no transactions). Reproduced 2026-10-30 UTC
