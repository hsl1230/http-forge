# Codebase index — http-forge

This document maps major source files and patterns so Claude Code can quickly locate implementation points.

Major source file map
- `src/extension.ts` — Extension entrypoint. Activates extension, bootstraps services, registers tree providers and commands. Primary place to look for `vscode.commands.registerCommand` calls.
- `src/api/` — Public API wrapper and typed API surface (`HttpForgeApi`).
- `src/presentation/` — UI code: tree providers and webview panels.
  - `presentation/components/tree-providers/` — collections, environments, test suites, history providers.
  - `presentation/webview/panels/` — webview panel implementations (`collection-editor`, `request-tester`, `test-suite`, etc.).
- `src/infrastructure/` — Services, MCP server tooling (`mcp-server`, `mcp-executor`), AI helpers (`ai-collection-enhancer`, `ai-env-suggester`).
- `src/shared/` — constants, utils, shared types (e.g., `COMMAND_IDS`, `EXTENSION_ID`).

Registered commands (representative list)
- MCP server control: `COMMAND_IDS.mcpStartServer`, `mcpStopServer`, `mcpToggleServer`.
- Collection/environment commands: `refreshCollections`, `refreshEnvironments`, `newEnvironment`, `deleteEnvironment`, `duplicateEnvironment`, `renameEnvironment`.
- Collection management: `newCollection`, `editCollection`, `deleteCollection`, `generateCollectionFromCurl`, `exportCollection`, `importCollection`, `newFolder`, `deleteFolder`, `newRequest`, `openRequest`, `openRequestInNewPanel`, `closeAllRequestPanels`, `deleteRequest`, `duplicateCollection`, `duplicateFolder`, `duplicateRequest`.
- Test suite commands: `runCollection`, `runFolder`, `runPerformanceTest`.

Providers and UI hooks
- Tree providers: `CollectionsTreeProvider`, `EnvironmentsTreeProvider`, `TestSuitesTreeProvider`, `RequestGitHistoryProvider`.
- Webviews: `RequestTesterPanel`, `CollectionEditorPanel`, `TestSuitePanel`, `EnvironmentEditorPanel`.

How `@http-forge/core` is used
- `@http-forge/core` provides typed domain models and utilities used across the extension (`CollectionService`, `TestSuiteService`, `OpenApiImporter/Exporter`, `SchemaInferenceService`). Many services are retrieved from the DI container and used by UI and infrastructure code.

Core repository (local)
- The full implementation of `@http-forge/core` is available in the sibling repository folder `../http-forge.core`.
  - `../http-forge.core/src/` contains the runtime, DI container, executors, MCP runtime, and service implementations.
  - `../http-forge.core/docs/` contains core design docs such as `core-reference.md` and runtime API docs.
- When investigating domain types, constructors, or runtime behaviour prefer opening files under `../http-forge.core/src/` (e.g. `di/service-container.ts`, `runtime/mcp-runtime.ts`).

Key types and interfaces to be aware of
- `Collection`, `CollectionRequestItem`, `CollectionService` (from `@http-forge/core`).
- `ConfigService`, `EnvironmentConfigService`, `HttpRequestService`, `RequestHistoryService` — service interfaces used by the extension.
- `RequestContext` — shape passed into request panels.

Integration with @http-forge/core
- Major commands rely on the core library for their domain logic and service interfaces:
  - `newCollection`, `deleteCollection`, `duplicateCollection`, `renameItem` use collection services from the core library.
  - `newEnvironment`, `deleteEnvironment`, `duplicateEnvironment`, `renameEnvironment` use environment configuration services from the core library.
  - `runCollection`, `runFolder`, `runPerformanceTest` use `TestSuiteService` and suite execution logic from the core library.
  - `generateCollectionFromCurl` and `importCollection` use import/export and schema inference services from the core library.
- The authoritative core source is in `../http-forge.core/src/`; use the generated analysis file `.claude/core-lib-analysis.json` for a quick inventory of exported classes and interfaces.

Search tips for Claude Code
- Search for `import .* from '@http-forge/core'` to find where core types are used.
- Search `../http-forge.core/src` for implementations of interfaces and runtime behaviour.
- Search for `registerCommand(` to locate command registration points.
- Search for `TreeDataProvider` implementations to find tree view behaviour.
