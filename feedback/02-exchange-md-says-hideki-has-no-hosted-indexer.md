# EXCHANGE.md says "Hideki has no hosted indexer", contradicting the networks reference and the working hosted Hideki indexer

Severity: normal
Area: docs

## Steps to reproduce
1. Read `docs/EXCHANGE.md:240` (multi-chain example): `// Hideki has no hosted indexer. Indexed reads need an indexer you operate.`, with the example using an undefined `hidekiIndexerUrl`.
2. Read `docs/reference/networks-and-endpoints.md:40`: `Hideki testnet (50383) | https://hideki-dev.smk.somnia.host/v1/graphql (development-grade)`.
3. Use that URL: `loadMarkets()`, `fetchTicker` and `listPerpMarkets` all work (`repro/02-hosted-indexer.ts`). The dreamdex-bot-kit perp config and the dreamDEX perps-testnet docs use it too.

## Expected
One consistent statement, with the hosted indexer URL in the example.

## Actual
The two SDK docs contradict each other. A reader of EXCHANGE.md concludes they must run their own indexer before they can use Hideki.

## Evidence
`repro/02-output.txt` (all reads went through `https://hideki-dev.smk.somnia.host/v1/graphql`, plus the two doc lines quoted from the installed package).

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1
- Network: Somnia Tokyo testnet (Hideki 2, chain 50383)
- Wallet: `0xcF15A4f2e6Beac90e2da7bB08df353688c3fD095` (throwaway, unfunded)
