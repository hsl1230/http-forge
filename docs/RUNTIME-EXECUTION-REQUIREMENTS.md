# Runtime Execution Requirements

## Document Information

| Field | Value |
|---|---|
| Version | 1.0 |
| Last Updated | 2026-06-17 |
| Status | Approved for implementation |
| Audience | HTTP Forge maintainers, contributors, integrators |

---

## 1. Executive Summary

This document defines the requirements for expanding HTTP Forge runtime usage beyond VS Code-hosted MCP execution.

The target capability set is:

1. Run MCP server from terminal (without VS Code host process).
2. Run request/collection/suite directly from terminal.
3. Embed HTTP Forge runtime in third-party Node.js apps.
4. Expose direct request/collection/suite APIs that do not require MCP server startup.
5. Preserve behavior correctness for typed template/filter arguments (including filter argument variable deserialization).

---

## 2. Problem Statement

Current implementation is extension-centric and MCP runtime wiring is effectively coupled to extension bootstrap/runtime lifecycle.

This creates these gaps:

1. No first-class terminal CLI for MCP server lifecycle.
2. No first-class terminal commands for request/collection/suite execution.
3. No embeddable Node runtime API for external integrators.
4. No direct execution API surface for consumers that do not want MCP protocol overhead.
5. Typed variable marker values can fail in filter argument variable lookup unless deserialized before coercion.

---

## 3. Goals and Non-Goals

### 3.1 Goals

1. Provide one shared runtime path used by VS Code, CLI, and embeddable APIs.
2. Keep request execution behavior parity across all entry points.
3. Provide stable command/API contracts for external adoption.
4. Keep compatibility with existing collection/suite/script behaviors.
5. Ensure typed marker values resolve correctly in filter argument variable lookup.

### 3.2 Non-Goals

1. Redesigning Request Tester UI.
2. Changing existing extension command IDs/workflows.
3. Rewriting core execution engines.
4. Introducing behavior that weakens security controls.

---

## 4. Functional Requirements

### 4.1 CLI Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-CLI-1 | System SHALL provide a dedicated CLI package with executable entry point. | Must |
| FR-CLI-2 | CLI SHALL support `mcp-server` subcommand to start MCP server from terminal. | Must |
| FR-CLI-3 | CLI SHALL support `run-request` subcommand. | Must |
| FR-CLI-4 | CLI SHALL support `run-collection` subcommand. | Must |
| FR-CLI-5 | CLI SHALL support `run-suite` subcommand. | Must |
| FR-CLI-6 | CLI SHALL support `--output json|table`. | Must |
| FR-CLI-7 | CLI SHALL return non-zero exit code on execution failure. | Must |

### 4.2 Embeddable Runtime Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-EMBED-1 | Core SHALL expose `createMcpRuntime(options)` for Node consumers. | Must |
| FR-EMBED-2 | Runtime handle SHALL expose `start()`, `stop()`, `isRunning()`, `getPort()`. | Must |
| FR-EMBED-3 | Runtime handle SHALL expose `executeTool(name, args)` for in-process tool execution. | Should |
| FR-EMBED-4 | Runtime SHALL use host-agnostic adapters and shared DI bootstrap path. | Must |

### 4.3 Direct Execution API Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-DIRECT-1 | Core SHALL expose `runRequest(options)` with no MCP server requirement. | Must |
| FR-DIRECT-2 | Core SHALL expose `runCollection(options)` with no MCP server requirement. | Must |
| FR-DIRECT-3 | Core SHALL expose `runSuite(options)` with no MCP server requirement. | Must |
| FR-DIRECT-4 | Direct API options SHALL support environment and variables injection. | Must |
| FR-DIRECT-5 | Direct API options SHALL support iterations/stopOnError/delay where applicable. | Must |
| FR-DIRECT-6 | Direct APIs SHALL return typed results (no process exits in library mode). | Must |

### 4.4 Compatibility and Behavior Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-COMPAT-1 | Extension MCP behavior SHALL remain backward compatible. | Must |
| FR-COMPAT-2 | Report URI behavior SHALL remain usable from non-extension paths. | Must |
| FR-COMPAT-3 | Request/collection/suite execution semantics SHALL match existing executor flow. | Must |

---

## 5. Non-Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| NFR-1 | Shared runtime implementation SHALL avoid logic duplication across entry points. | Must |
| NFR-2 | API contracts SHALL be deterministic and strongly typed. | Must |
| NFR-3 | CLI output SHALL be machine-readable in JSON mode. | Must |
| NFR-4 | CLI output SHALL be human-readable in table mode. | Should |
| NFR-5 | Security-sensitive behavior SHALL not weaken existing protections. | Must |

---

## 6. Acceptance Criteria

### 6.1 Runtime/CLI

1. Starting MCP server from CLI succeeds without VS Code process.
2. `run-request` executes a saved request and prints result.
3. `run-collection` executes collection and supports iterations.
4. `run-suite` executes suite with stop-on-error and delay options.
5. JSON output is valid JSON and includes summary/result details.
6. Failed command returns non-zero exit code.

### 6.2 Embeddable API

1. Third-party Node app can construct runtime via exported API.
2. Runtime can start/stop and report running state/port.
3. Runtime can execute tools/direct API calls in process.

### 6.3 Direct APIs

1. `runRequest` works without MCP startup.
2. `runCollection` works without MCP startup.
3. `runSuite` works without MCP startup.
4. Returned object shape is typed and does not terminate process.

---

## 7. Requirement Traceability Matrix

| Requirement ID | Primary Implementation Surface | Verification |
|---|---|---|
| FR-CLI-1..7 | Planned CLI package entry points and command handlers | CLI integration tests + manual terminal runs |
| FR-EMBED-1..4 | Core runtime factory and lifecycle handle | Node embedding smoke test |
| FR-DIRECT-1..6 | Core direct execution exported APIs | API unit/integration tests |
| FR-COMPAT-1..3 | Existing extension MCP wiring and shared executors | Extension compile + parity checks |

---

## 8. Related Artifacts

- Session planning baseline: `/memories/session/plan.md`
- Existing extension MCP wiring: `http-forge/src/infrastructure/mcp/`
- Core bootstrap and contracts: `http-forge.core/src/di/`, `http-forge.core/src/types/`

---

## 9. Open Decisions

1. Whether direct API surface is marked experimental in first release.
2. Whether CLI is released as standalone npm package or workspace-local first.
3. Whether result output schema is versioned from v1 for long-term stability.
