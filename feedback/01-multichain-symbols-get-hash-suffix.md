# With the documented two-testnet config, every perp listed on both chains gets a 4-hex suffix on both chains, so the docs' `createOrder("BTC/USDso:USDso", …)` example fails

Severity: normal
Area: SDK

## Steps to reproduce
1. Copy the "One exchange, several chains" example from `docs/EXCHANGE.md` (around lines 230-250): Shannon (`https://dev.smk.somnia.host/v1/graphql`) plus Hideki (`https://hideki-dev.smk.somnia.host/v1/graphql`). Use no account, since this is read-only.
2. `await exchange.loadMarkets()` and list the `:USDso` symbols.
3. Call `market`, `fetchTicker` and `createOrder` with `"BTC/USDso:USDso"`, as the doc example does. Script: `repro/01-multichain-symbols.ts`.

## Expected
The symbol in the doc example resolves. Alternatively, the doc explains which symbol to use and how a suffix is chosen.

## Actual
Every base asset that has a perp on both chains is renamed **on both chains**, with a 4-hex suffix taken from the pool address. Bases without a twin on the other chain keep plain symbols:
```
BTC-E5B6/USDso:USDso   50312 0x3892a5179f8ea0c810c45d1630546c0317b0e5b6
BTC-94C0/USDso:USDso   50383 0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0
ETH-C29E/USDso:USDso   50312 ...   ETH-EDDF/USDso:USDso 50383 ...
(same for TAO, WLD, NEAR, XLM, AVAX, LINK, SUI, ADA, BNB, DOGE, XRP, HYPE, SOL)
ZRO/USDso:USDso 50383 (no twin, no suffix)
has BTC/USDso:USDso? false
market ERR      InvalidInputError ... unknown symbol BTC/USDso:USDso — call loadMarkets() first
fetchTicker ERR InvalidInputError ... unknown symbol BTC/USDso:USDso — call loadMarkets() first
createOrder ERR InvalidInputError ... unknown symbol BTC/USDso:USDso — call loadMarkets() first
```
The docs do not describe this:
- EXCHANGE.md's own example uses `BTC/USDso:USDso`.
- EXCHANGE.md:44 mentions a 4-hex tiebreaker only for binary series symbols.
- MIGRATING.md:1046 says a shared symbol "can gain a *chain* suffix when the second chain loads later". In practice the suffix is a pool-address fragment, it is applied to both chains, and it happens on the first `loadMarkets()`.

Symbol names become unpredictable (`BTC-94C0`) and change whenever a pool is redeployed.

## Evidence
`repro/01-output.txt` (full symbol → chainId → pool table).

Suggested fix: use a deterministic chain-based disambiguator, e.g. `BTC/USDso:USDso@50383`, or keep plain symbols for the first-bound chain. Document it, fix the EXCHANGE.md example, and mention it in the unknown-symbol error.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1 (npm `latest`, the version the docs pin), Node v20.19.2, viem from the SDK peer range
- Network: Somnia Tokyo testnet (Hideki 2, chain 50383), RPC `https://api.hideki2.infra.testnet.somnia.network`, indexer `https://hideki-dev.smk.somnia.host/v1/graphql`
- Wallet: `0xcF15A4f2e6Beac90e2da7bB08df353688c3fD095` (fresh throwaway testnet key, unfunded)
- Reproduced 2026-10-27 UTC
