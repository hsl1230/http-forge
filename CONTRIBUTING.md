# Contributing to HTTP Forge

Thank you for your interest in contributing! This guide covers the development workflow, coding conventions, and how to submit changes.

## Repository structure

HTTP Forge is a multi-repo workspace. Some repos are **public** (open to external contributors); others are **private** (maintainer-only).

| Repo | Purpose | Visibility |
|---|---|---|
| `http-forge` | VS Code extension (UI, webviews, commands) | Public |
| `http-forge.cli` | CLI and headless runner | Public |
| `http-forge.codegen` | TypeScript client generation | Public |
| `http-forge.flow` | Standalone `.flow.js` runner | Public |
| `http-forge.playwright` | Playwright integration | Public |
| `http-forge.core` | Runtime engine (execution, collections, MCP, AI, OpenAPI) | **Private** (maintainer-only) |
| `http-forge.ai` | MCP config dashboard | Public |

## Prerequisites

- **Node.js 20.19.5** (required — Node 18.x breaks Vitest)
  ```bash
  export PATH=/home/henry/.nvm/versions/node/v20.19.5/bin:$PATH
  ```
- Git

## Getting started

> **Note:** `http-forge.core` is a private repository. External contributors can work on the public repos (`http-forge`, `http-forge.cli`, `http-forge.codegen`, `http-forge.flow`, `http-forge.playwright`). Core changes require maintainer access.

1. Clone the public repos you need into a common parent directory.
2. Install dependencies:
   ```bash
   cd http-forge && npm install
   cd ../http-forge.cli && npm install
   ```

## Development workflow

### Core changes (`http-forge.core`) — maintainer-only

Core is the engine. Changes here affect the extension and CLI. Since this repo is private, core changes are made by maintainers. If you need a core change, open an issue describing the requirement.

1. Make your changes in `http-forge.core/src/`.
2. Typecheck:
   ```bash
   npx tsc --noEmit
   npx tsc -p tsconfig.test.json   # test typing
   ```
3. Run tests:
   ```bash
   npx vitest run
   ```
4. Build (has a 786 KB bundle budget check):
   ```bash
   npm run build:prod
   ```
5. Copy dist to consumers (required — consumers use installed copies, not symlinks):
   ```bash
   cp -r dist/* ../http-forge/node_modules/@http-forge/core/dist/
   cp -r dist/* ../http-forge.cli/node_modules/@http-forge/core/dist/
   ```
6. Typecheck consumers:
   ```bash
   cd ../http-forge && npx tsc --noEmit
   cd ../http-forge.cli && npx tsc --noEmit
   ```

### Extension changes (`http-forge`)

1. Make your changes in `http-forge/src/` or `http-forge/resources/`.
2. Typecheck:
   ```bash
   npx tsc --noEmit   # ignore errors under src/__tests__/
   ```
3. Run tests:
   ```bash
   npm test
   ```
4. Rebuild webview bundles (if you changed webview source):
   ```bash
   npm run build:prod
   ```

### CLI changes (`http-forge.cli`)

1. Make your changes in `http-forge.cli/src/`.
2. Typecheck:
   ```bash
   npx tsc --noEmit
   ```
3. Build:
   ```bash
   npm run build
   ```

## Coding conventions

### SOLID principles (mandatory)

- **S — Single Responsibility**: one module = one reason to change.
- **O — Open/Closed**: extend via new modules/registration, not in-place edits.
- **L — Liskov Substitution**: implementations must be drop-in replacements.
- **I — Interface Segregation**: depend on the narrowest interface.
- **D — Dependency Inversion**: depend on abstractions, not concretions. Services are injected — never constructed or looked up via globals.

### Architecture rules

- **Core is VS Code-free.** Never import `vscode` in `http-forge.core/src/`. Grep guard: `rg "from 'vscode'" src/` must be clean.
- **Use ports and dependency injection.** Services are registered in `core-bootstrap.ts` and resolved via `ServiceContainer`.
- **No `as any` casts.** Use proper types or `unknown` with narrowing.
- **Business logic in core.** Consumers (extension, CLI) are thin adapters.

### Naming conventions

- Files named `XxxCommands.ts` register only commands for `Xxx`.
- One import format = one command module (curl/Postman/OpenAPI/HAR each have their own).
- New parsers/importers/providers are new files that plug into a registry/interface — not new `if` branches.

### Determinism

- Providers return endpoints sorted (method asc, path asc, file asc).
- No timestamps inside endpoint records.
- Golden fixture files are locked — regenerate only on deliberate, recorded changes.

### Testing

- Tests must assert outputs/contracts (the *why*), not implementation details.
- Core: Vitest. Extension: Jest. CLI: manual verification.
- Behavior-focused: tests should survive a pure refactor.

## Commit conventions

Follow conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.

Examples:
```
feat(websocket): add Socket.IO support for WebSocket requests
fix: correct NodeWebSocketClient wasClean close reporting
docs: update README with WebSocket examples
```

## Pull request process

1. Create a feature branch from `main`.
2. Make your changes following the conventions above.
3. Run the full verification workflow for your change type (see above).
4. Ensure all tests pass and typechecks are clean.
5. Open a PR with a clear description of what changed and why.

## What NOT to do

- Do not commit generated `dist/` output (it's gitignored).
- Do not hand-edit webview bundles (`bundle.js`, `bundle.js.map`) — rebuild with `npm run build:prod`.
- Do not modify golden fixture files without a deliberate, recorded reason.
- Do not use destructive Git commands (`reset --hard`, `push --force`, etc.).
- Do not commit secrets, histories, reports, coverage, or generated runtime data.

## Getting help

- Read `AGENTS.md` (workspace root) for full developer context.
- Read `DECISIONS.md` and `IMPLEMENTATION-BRIEF.md` (core) for API discovery conventions.
- Check `http-forge/docs/` for architecture and design documents.