# Playwright Integration Guide

Use HTTP Forge with Playwright in two ways: generated clients or collection-based fixtures.

## Packages
- `@http-forge/playwright` (runtime for generated clients)
- `@http-forge/playwright-fixture` (collection-based fixture)

## Use cases
- API tests alongside UI tests
- Reuse HTTP Forge collections in Playwright
- Generate typed clients and use them in tests

## Option A: Generated clients + runtime
1. Generate clients with `@http-forge/codegen`.
2. Install `@http-forge/playwright`.
3. Create a `ForgeEnv` and call generated request functions.

Key features:
- `ForgeEnv` variable resolution
- URL building with params and query
- Shared request types

For package details, see the package README in this repo.

## Option B: Collection-based fixture
1. Install `@http-forge/playwright-fixture`.
2. Configure `forgeOptions` in Playwright config.
3. Use `forge.send()` inside tests.

Fixture supports:
- Params, query, headers, body overrides
- Script execution control
- Environment switching

For fixture setup details, see the package README in this repo.

## Codegen integration
Use `@http-forge/codegen` for typed clients and run them with `@http-forge/playwright`.

## Reference
- Codegen guide: codegen.md
- Collections and requests: collections-requests.md
