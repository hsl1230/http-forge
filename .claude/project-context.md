# HTTP Forge — Project Context

This file indexes the primary documentation for the `http-forge` VS Code extension and provides a short summary of the project's purpose, architecture, and key locations.

Primary docs (in repo):
- [README.md](../README.md)
- [DEVELOPMENT.md](../DEVELOPMENT.md)
- [CHANGELOG.md](../CHANGELOG.md)
- [MIGRATION GUIDE](../MIGRATION-GUIDE.md)
- Docs folder (select important files):
  - [docs/ARCHITECTURE-ANALYSIS.md](docs/ARCHITECTURE-ANALYSIS.md)
  - [docs/HTTP-FORGE-WEB-APP.md](docs/HTTP-FORGE-WEB-APP.md)
  - [docs/IMPLEMENTATION-TEST-SUITE.md](docs/IMPLEMENTATION-TEST-SUITE.md)
  - [docs/REQUEST-TYPE-CONSOLIDATION.md](docs/REQUEST-TYPE-CONSOLIDATION.md)
  - [docs/COPILOT-CHAT-GUIDE.md](docs/COPILOT-CHAT-GUIDE.md)
  - [docs/CUSTOM-INSTRUCTIONS.md](docs/CUSTOM-INSTRUCTIONS.md)
  - [docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)

Project summary
----------------
HTTP Forge is a VS Code extension that provides an API testing and collection management UI inside VS Code. It supports collections, environments, test suites, and an MCP (Micro Command Protocol) server for automation. The extension integrates with `@http-forge/core` for domain logic and provides webview panels and tree providers for interaction.

Key architecture notes:
- Uses a service bootstrap / dependency injection pattern (`infrastructure/services/service-bootstrap.ts`).
- UI parts live under `src/presentation` (tree providers, webview panels, panels managers).
- Core API integration and typed models come from `@http-forge/core` (imported widely in `src/extension.ts`).
- Automation and server tooling: `infrastructure/mcp/*` contains MCP server tooling.

Important directories
- `src/` — extension source. Main entry `src/extension.ts`.
  - `src/presentation/` — Tree providers and webview panels (UI).
  - `src/infrastructure/` — Services, MCP server, tooling, AI helpers (importers/enhancers).
  - `src/api/` — public API wrapper `HttpForgeApi`.
  - `src/shared/` — constants, utils, types shared across modules.

Important files to know
- `package.json` — scripts, dependencies, and `contributes` config.
- `src/extension.ts` — activation, command registration, and bootstrap.
- `tsconfig.json` — TypeScript compiler settings.
- `jest.config.js` — Jest test runner configuration.
- `esbuild.js` — build script used by `npm run compile`.

Where to look for more details
- Start with [DEVELOPMENT.md](../DEVELOPMENT.md) for dev setup and node version notes.
- Read [docs/ARCHITECTURE-ANALYSIS.md](docs/ARCHITECTURE-ANALYSIS.md) for design rationale.
- The codebase is instrumented with `@http-forge/core` interfaces — search for imports of `@http-forge/core` to find typed service usage.

Core repository (local):

- The implementation of `@http-forge/core` lives in the sibling folder `../http-forge.core` (source and docs). See:
  - `../http-forge.core/README.md`
  - `../http-forge.core/docs/core-reference.md`
  - `../http-forge.core/src/` — core runtime, DI container, runtime executors, and service implementations.
- When exploring domain types, prefer reading `http-forge.core` sources in `../http-forge.core/src/` to understand service interfaces and runtime behaviour.

