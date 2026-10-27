# `fetchOpenStopOrders` and `getOrderHistoryPage` throw errors that name a different method (`operation: "fetchOrders"` / `"getOrdersPage"`)

Severity: minor
Area: SDK

## Steps to reproduce
1. Build a `SomniaMarkets` for Hideki with no `privateKey` / `account`. Script: `repro/06-signer-required-wrong-method.ts`.
2. Call `fetchOpenStopOrders()` and `getOrderHistoryPage()`. As a control, call `fetchOrders()` and `fetchPositions()`.
3. With a read-only `account`, call `getOrderHistoryPage({ limit: 0 })`.

## Expected
`src/errors.ts:290` documents `SignerRequiredError.operation` as "The method that needs a signer". Error messages should name the method the caller invoked, as they do for every other authenticated verb (`fetchOrders`, `fetchPositions`, `fetchBalance` and so on).

## Actual
- `fetchOpenStopOrders()` throws `operation: "fetchOrders"` and the message "fetchOrders is authenticated". The cause is `src/unified/exchange.ts:5525`, which reads `this.requireAddress("fetchOrders")`, a copy-paste from `fetchOrders`.
- `getOrderHistoryPage()` (the documented name; `getOrdersPage` is described as the "compatibility name") delegates to `getOrdersPage`. Its signer error and all its validation errors therefore say `getOrdersPage`, for example "getOrdersPage: limit must be a positive safe integer".

A bot that logs or branches on `err.operation` (the field exists so that callers "can branch on it without parsing the message") attributes a stop-order failure to order history. Someone reading the log will look for a `fetchOrders` call that their code never makes.

## Evidence
`repro/06-output.txt`:
```
fetchOpenStopOrders()        -> SignerRequiredError | operation: "fetchOrders" | @somnia-chain/markets-sdk: fetchOrders is authenticated — construct SomniaMarkets with a privateKey / account / walletClient
getOrderHistoryPage()        -> SignerRequiredError | operation: "getOrdersPage" | @somnia-chain/markets-sdk: getOrdersPage is authenticated — construct SomniaMarkets with a privateKey / account / walletClient
fetchOrders()  (control)     -> SignerRequiredError | operation: "fetchOrders" | @somnia-chain/markets-sdk: fetchOrders is authenticated — construct SomniaMarkets with a privateKey / account / walletClient
fetchPositions()  (control)  -> SignerRequiredError | operation: "fetchPositions" | @somnia-chain/markets-sdk: fetchPositions is authenticated — construct SomniaMarkets with a privateKey / account / walletClient
getOrderHistoryPage({limit:0}) -> InvalidInputError | @somnia-chain/markets-sdk: getOrdersPage: limit must be a positive safe integer
```

Suggested fix: use `requireAddress("fetchOpenStopOrders")`. Have `getOrderHistoryPage` pass its own name into a shared implementation (for example a private `ordersPage(options, op)`) that is used in both the signer and validation messages.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1, Node v20.19.2
- Network: Somnia Tokyo testnet (Hideki 2, chain 50383)
- Wallet: none (no signer), and a read-only placeholder `account` for the validation case
