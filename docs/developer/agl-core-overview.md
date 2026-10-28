# agl-core Overview

## Purpose
`agl-core` provides the common runtime used by every AGL middleware. It hosts the base Express application, exposes shared middleware, manages configuration/cache lifecycles, and standardizes security flows (cookies, tokens, logging, metrics). Treat it as the platform layer that every feature-specific middleware plugs into.

## High-Level Responsibilities
- Bootstraps the Express server (`app.js`, `server-launcher.js`) and loads middleware-specific routes via `lib/routeBuilder.js`.
- Maintains shared caches (system parameters, route metadata, channel lists) sourced from `agl-config-server`. Helpers like `lib/configurationManager.js` and `lib/channelManager.js` keep those caches warm and react to config changes.
- Normalizes outbound headers and responses (`lib/fix-headers.js`, `middleware/standardResponse.js`) so downstream clients receive consistent payloads regardless of middleware.
- Centralizes telemetry: logging is driven through `@opus/agl-logger`, metrics through `middleware/metricManager.js` and `shared/telemetry/*`, and request tags come from `middleware/tagManager.js`.
- Owns authentication primitives, including AVS cookie handling (`lib/AVSCookies.js`) and encrypted token lifecycle (`lib/token/authTokenManager.js`).
- Provides shared error handling with `lib/AGLError.js` and the async wrapper `lib/middleware-exception-filter.js` to keep route handlers tidy.

## Key Modules
- **Configuration Manager** (`lib/configurationManager.js`): Polls the config server, updates cached app config, refreshes log settings, secure-field rules, and middleware-specific settings. Applies HTTPS settings automatically when `USE_HTTPS=TRUE`.
- **Channel Manager** (`lib/channelManager.js`): Periodically fetches channel/blackout data and seeds `@opus/agl-cache`. Respects keystore and CA env vars when TLS is required.
- **Route Builder** (`lib/routeBuilder.js`): Reads route definitions from cache, stitches together the core middleware chain (tagging, token validation, metrics) plus custom middleware handlers exposed by each feature package, and registers them on the Express router.
- **Inventory Manager** (`lib/inventoryManager.js`): Dynamically `require`s the middleware modules referenced by route config so only the needed feature packages load.
- **Header Normalizer** (`lib/fix-headers.js`): Forces outbound header casing (or overrides via config) before responses leave Node.
- **List Routes Tool** (`lib/listRoutes.js`): CLI helper to print color-coded route maps during development.
- **Token Utilities** (`lib/token/*`): Implements AES/JWT handling, refresh flows, CSRF checks, and DB-backed token validation.

## Integration Points
- Depends on `@opus/agl-cache`, `@opus/agl-logger`, and `@opus/agl-utils`; these packages live as separate repos but are installed by `setup-agl.sh`.
- Reads runtime configuration from `config/appConfig.json` and the `agl-config-*` repositories copied into `agl-config-server`.
- Environment variables (e.g., `USE_HTTPS`, `KEYSTORE_FILE`, `AGL_CONFIGURATION_SERVER_URL`, `AGL_CONFIG_REFRESH_INTERVAL`) drive connectivity and polling cadence.

## Working With agl-core
1. Run `setup-agl.sh` followed by `bootstrap-config-server.sh dev` (or `sit`) to clone the repos and start the config server.
2. Open `agl.code-workspace` in VS Code and use the `Launch agl middleware - dev`/`sit` configs; they start middleware code that embeds `agl-core`.
3. Breakpoints set inside `agl-core/lib` or `middleware` directories trigger when requests flow through shared logic (token validation, caching, metrics).
4. To debug configuration, watch logs from `configurationManager` and `channelManager`; they indicate when cache refreshes succeed or if HTTPS certificates are misconfigured.
5. Custom middleware should expose `panic` and `run` handlers so `routeBuilder` can wrap them correctly; use `lib/middleware-exception-filter.js` when adding async handlers elsewhere.

## When to Modify agl-core
- Add or adjust cross-cutting behavior (logging, telemetry, security, header handling).
- Introduce new shared middleware steps that every feature should adopt.
- Update token or cookie policies required by platform or regulatory changes.
- Avoid embedding feature-specific business logic here—keep that in the individual middleware repositories and surface only the hooks required by `agl-core`.
