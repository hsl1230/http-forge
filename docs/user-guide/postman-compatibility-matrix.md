# Postman to HTTP Forge Compatibility Matrix

This matrix lists commonly used Postman APIs and whether they are currently supported in HTTP Forge.

Status legend:
- Supported: Implemented and available in scripts.
- Partial: Available with differences in behavior or naming.
- Missing: Not currently implemented.

## pm.request

| Postman API | HTTP Forge | Status | Notes |
| --- | --- | --- | --- |
| `pm.request.url` | `pm.request.url` | Supported | URL object behavior is available, including URL helper methods. |
| `pm.request.method` | `pm.request.method` | Supported | Read/write in pre-request scripts. |
| `pm.request.headers` | `pm.request.headers` | Supported | Header list operations available (`get`, `has`, `remove`, `update`, `upsert`, `toObject`, `each`). |
| `pm.request.headers.add({ key, value })` | `pm.request.headers.add({ key, value })` | Supported | Implemented on request headers proxy. |
| `pm.request.addHeader(name, value)` | `pm.request.addHeader(name, value)` | Supported | Postman-compatible alias of `setHeader`. Accepts `(name, value)` or `({ key, value })`. |
| `pm.request.removeHeader(name)` | `pm.request.removeHeader(name)` | Supported | Implemented as legacy helper. |
| `pm.request.body` | `pm.request.body` | Supported | Includes `mode`, `raw`, `formdata`, `urlencoded`, `graphql`, `file`. |
| `pm.request.auth` | `pm.request.auth` | Supported | Getter/setter implemented in script request object. |

## pm.response

| Postman API | HTTP Forge | Status | Notes |
| --- | --- | --- | --- |
| `pm.response.code` | `pm.response.code` | Supported | Mirrors status code. |
| `pm.response.status` | `pm.response.status` | Supported | Numeric status available. |
| `pm.response.reason()` | `pm.response.reason()` | Supported | Implemented. |
| `pm.response.statusText` | `pm.response.statusText` | Supported | Implemented. |
| `pm.response.headers` | `pm.response.headers` | Supported | HeaderList-style API (`get`, `has`, `toObject`, `each`). |
| `pm.response.json()` | `pm.response.json()` | Supported | Implemented with parse fallback. |
| `pm.response.text()` | `pm.response.text()` | Supported | Implemented. |
| `pm.response.responseTime` | `pm.response.responseTime` | Supported | Implemented. |
| `pm.response.responseSize` | `pm.response.responseSize` | Supported | Implemented. |
| `pm.response.to.have.status(code)` | `pm.response.to.have.status(code)` | Supported | Implemented in response assertions. |
| `pm.response.to.have.header(name, value?)` | `pm.response.to.have.header(name, value?)` | Supported | Implemented in response assertions. |
| `pm.response.to.have.body(value?)` | `pm.response.to.have.body(value?)` | Supported | Implemented in response assertions. |
| `pm.response.to.have.jsonBody(value?)` | `pm.response.to.have.jsonBody(value?)` | Supported | Implemented in response assertions. |
| `pm.response.to.have.jsonSchema(schema)` | `pm.response.to.have.jsonSchema(schema)` | Supported | Built-in JSON Schema validator (type, properties, required, items, enum, min/max, length, pattern). |

## pm.expect and chai-like chain

| Postman API | HTTP Forge | Status | Notes |
| --- | --- | --- | --- |
| `pm.expect(value)` | `pm.expect(value)` | Supported | Implemented. |
| `.to.equal()` | `.to.equal()` | Supported | Implemented. |
| `.to.eql()` / `.to.deep.equal()` | `.to.eql()` / `.to.deep.equal()` | Supported | Implemented. |
| `.to.have.property()` | `.to.have.property()` | Supported | Implemented. |
| `.to.include()` | `.to.include()` | Supported | Implemented. |
| `.to.have.string()` | `.to.have.string()` | Supported | Implemented as `string(substr)`. |
| `.to.contain()` | `.to.contain()` | Supported | Implemented as an alias of `include`. |
| `.to.match()` | `.to.match()` | Supported | Implemented. |
| `.to.be.ok` / `.true` / `.false` / `.null` / `.undefined` / `.empty` | Same | Supported | Implemented as getters. |
| `.to.be.a()` / `.to.be.an()` | Same | Supported | Implemented. |
| `.to.have.length()` / `.lengthOf()` | Same | Supported | Implemented. |
| `.to.have.members()` | Same | Supported | Implemented. |
| `.to.have.keys()` | Same | Supported | Implemented. |
| language chains (`and`, `that`, `which`, `is`, etc.) | Same | Supported | Implemented as no-op readability chains. |

## pm.test

| Postman API | HTTP Forge | Status | Notes |
| --- | --- | --- | --- |
| `pm.test(name, fn)` | `pm.test(name, fn)` | Supported | Implemented (sync and async). |
| `pm.test(name, async fn)` | `pm.test(name, async fn)` | Supported | Implemented. |
| `pm.test.skip(...)` | `pm.test.skip(name, fn?)` | Supported | Records a skipped result; `fn` is not executed. |
| `pm.test.index()` | `pm.test.index()` | Supported | Returns the zero-based index of the next test in execution order. |
| `pm.test.fail(...)` | `pm.test.fail(name)` | Supported | Records an immediate failed assertion. |

## pm.execution and flow control

| Postman API | HTTP Forge | Status | Notes |
| --- | --- | --- | --- |
| `pm.execution.setNextRequest(name)` | Same | Supported | Implemented. |
| `pm.setNextRequest(name)` | Same | Supported | Top-level alias implemented. |
| `pm.execution.setNextRequest(null)` | Same | Supported | Stops suite runner flow. |
| `pm.execution.skipRequest()` | Same | Supported | Implemented for pre-request flow control. |
| `pm.execution.runRequest(...)` | `pm.execution.runRequest(urlOrDefinition, callback?)` | Supported | Mirrors `pm.sendRequest` semantics: accepts a URL string or a request-definition object and supports promise/callback styles. Returns a `pm.response`-compatible object. Performs a bare HTTP call (does not execute the target's scripts). |
| `pm.execution.location` | `pm.execution.location` | Supported | Object with `current`, `currentRequestName`, and `eventName`; stringifies to the request name. |

## pm.variables, pm.environment, pm.collectionVariables, pm.globals, pm.iterationData

| Postman API | HTTP Forge | Status | Notes |
| --- | --- | --- | --- |
| `pm.variables.*` | `pm.variables.*` | Supported | Merged scope with `get/set/has/unset/clear/toObject/replaceIn`. |
| `pm.environment.*` | `pm.environment.*` | Supported | Implemented with persistence behavior in HTTP Forge runtime. |
| `pm.collectionVariables.*` | `pm.collectionVariables.*` | Supported | Implemented. |
| `pm.globals.*` | `pm.globals.*` | Supported | Implemented. |
| `pm.iterationData.*` | `pm.iterationData.*` | Supported | Implemented as read-only data scope. |

## pm.cookies

| Postman API | HTTP Forge | Status | Notes |
| --- | --- | --- | --- |
| `pm.cookies.get(name)` | `pm.cookies.get(name)` | Supported | Implemented. |
| `pm.cookies.has(name)` | `pm.cookies.has(name)` | Supported | Implemented. |
| `pm.cookies.toObject()` | `pm.cookies.toObject()` | Supported | Implemented. |
| `pm.cookies.jar()` | `pm.cookies.jar()` | Supported | Cookie jar methods implemented (`getAll`, `get`, `set`, `unset`, `clear`). |

## pm.visualizer

| Postman API | HTTP Forge | Status | Notes |
| --- | --- | --- | --- |
| `pm.visualizer.set(template, data)` | Same | Supported | Implemented. |
| `pm.visualizer.clear()` | Same | Supported | Implemented. |

## pm.sendRequest

| Postman API | HTTP Forge | Status | Notes |
| --- | --- | --- | --- |
| `pm.sendRequest(request, callback)` | `pm.sendRequest(request, callback)` | Supported | Implemented. |
| `await pm.sendRequest(request)` | `await pm.sendRequest(request)` | Supported | Implemented with Promise style support in docs/runtime. |

## Postman platform features outside script runtime

| Postman Feature | HTTP Forge | Status | Notes |
| --- | --- | --- | --- |
| Cloud workspaces and cloud-native team collaboration | Git-based workflow | Missing | HTTP Forge is repository-first and local/VS Code-centric. |
| Monitors | N/A | Missing | Not provided as a hosted monitoring platform feature. |
| Mock servers | N/A | Missing | Not provided as a Postman-style hosted mock service. |
| WebSocket client parity with Postman | Planned | Missing | Marked as planned in HTTP Forge comparison docs. |

## Additional advanced Postman APIs

| Postman API | HTTP Forge | Status | Notes |
| --- | --- | --- | --- |
| `pm.require(...)` | `pm.require(...)` | Supported | Alias of the sandbox `require`, backed by the module loader with the same whitelisting/security boundaries. |
| `pm.vault.*` | `pm.vault.get(key)` | Partial | Read-only `get(key)` resolves `{{secret:<key>}}` via HTTP Forge's secret provider system. `set`/`unset` are intentionally unsupported: secrets are owned by the configured provider/backend (env vars, OS keychain, or an external secret manager) rather than a script-writable local store. This mirrors how Postman's external Vault integrations (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault, etc.) are read-oriented from scripts — `pm.vault.set()` in Postman writes only to its *local* encrypted vault, not to those external backends. To add a secret in HTTP Forge, define it in your secret provider and reference it via `{{secret:...}}`. |

## Gap Mitigation Plan (Excluding Platform Features)

> Implementation status: Phases 1–2 are complete (`.contain()`, `pm.request.addHeader`, structured `pm.execution.location`, `pm.response.to.have.jsonSchema`, `pm.test.fail/skip/index`). Phase 3 is complete: `pm.require`, `pm.vault.get` (read-only), and `pm.execution.runRequest` (mirrors `pm.sendRequest` — accepts a URL string or request-definition object, promise/callback styles).

Scope of this plan:
- Included: all gaps in script/runtime compatibility.
- Excluded: items under "Postman platform features outside script runtime" (cloud workspaces, monitors, mock servers, WebSocket platform parity).

### Delivery principles

- Preserve existing behavior and aliases (`ctx`, `pm`, `hf`).
- Prefer additive compatibility shims before deeper refactors.
- Ship smallest high-value parity items first.
- Add runtime tests for every new API surface.
- Keep docs and matrix in sync with each release.

### Phase 1 (P0): Quick parity wins (low risk, high impact)

1. Add `.contain()` expect alias
- Gap addressed: `.to.contain()` missing.
- Implementation:
	- Add `contain(value: any): ExpectChain` to `ExpectChain` interface.
	- Implement `contain(value)` as alias to existing `include(value)` in chain object.
- Primary files:
	- `http-forge.core/src/infrastructure/script/script-factories.ts`
- Acceptance criteria:
	- `pm.expect('abc').to.contain('b')` passes.
	- `pm.expect([1,2,3]).to.contain(2)` passes.
	- `pm.expect({a:1}).to.contain('a')` passes per existing include semantics.

2. Add request alias `pm.request.addHeader(name, value)`
- Gap addressed: partial parity (`setHeader` exists, Postman name differs).
- Implementation:
	- Add method alias `addHeader(name, value)` that calls `setHeader(name, value)`.
- Primary files:
	- `http-forge.core/src/infrastructure/script/request-script-session.ts`
- Acceptance criteria:
	- Scripts using `pm.request.addHeader('X-Test','1')` mutate request headers as expected.

3. Improve `pm.execution.location` structure
- Gap addressed: currently partial (string only).
- Implementation:
	- Replace string with object shape compatible with common Postman usage.
	- Minimum suggested fields: `current`, `currentRequestName`, `eventName`.
	- No need to Keep backward compatibility.
- Primary files:
	- `http-forge.core/src/infrastructure/script/request-script-session.ts`
- Acceptance criteria:
	- New scripts can safely read `pm.execution.location.currentRequestName`.

### Phase 2 (P1): Core missing test/assert APIs

4. Add response schema assertion helper
- Gap addressed: `pm.response.to.have.jsonSchema(schema)` missing.
- Implementation:
	- Add `jsonSchema(schema: any): void` to response assertion helpers.
	- Validate using existing optional validators (`tv4` and/or `ajv`) from module loader.
	- On validation failure, throw assertion-style error with concise path/message.
- Primary files:
	- `http-forge.core/src/infrastructure/script/script-factories.ts`
	- `http-forge.core/src/infrastructure/script/module-loader.ts`
- Acceptance criteria:
	- Valid schema/data passes.
	- Invalid schema/data fails with readable error.
	- Works in post-response scripts and suite runs.

5. Add `pm.test.fail(...)` and `pm.test.skip(...)`
- Gap addressed: helper methods missing.
- Implementation:
	- Extend test function object with:
		- `fail(message?: string)` -> records failed assertion immediately.
		- `skip(name: string, fn?: Function)` -> records skipped test result.
	- Keep existing `pm.test(name, fn)` behavior unchanged.
- Primary files:
	- `http-forge.core/src/infrastructure/script/script-utils.ts`
	- `http-forge.core/src/infrastructure/script/request-script-session.ts`
	- related types in `http-forge.core/src/infrastructure/script/interfaces.ts` and/or `http-forge.core/src/types/types.ts`
- Acceptance criteria:
	- `pm.test.fail('reason')` marks request test as failed with message.
	- `pm.test.skip('name', fn)` records skipped status without failure.
	- Reporting layer displays skipped distinctly from pass/fail.

6. Decide and implement `pm.test.index()` compatibility behavior
- Gap addressed: helper missing.
- Implementation strategy:
	provide deterministic index from current request-level assertion ordering.
- Primary files:
	- `http-forge.core/src/infrastructure/script/script-utils.ts`
	- `http-forge.core/src/infrastructure/script/request-script-session.ts`
- Acceptance criteria:
	- Returned index is stable and documented.

### Phase 3 (P2): Advanced execution/module APIs

7. Add `pm.execution.runRequest(...)`
- Gap addressed: missing execution helper.
- Implementation:
	- Add safe runtime bridge that can execute another request by identifier/name within current collection context.
	- Return a response object compatible with script `pm.response` usage.
	- Prevent infinite recursion with depth/loop guards.
- Primary files:
	- `http-forge.core/src/infrastructure/script/request-script-session.ts`
	- `http-forge.core/src/infrastructure/execution/collection-request-executor.ts`
	- `http-forge.core/src/runtime/direct-execution.ts`
- Acceptance criteria:
	- Script can call `await pm.execution.runRequest('Request Name')` and assert response.
	- Guard rails prevent circular request loops from hanging suite runs.

8. Add `pm.require(...)` alias to sandbox `require`
- Gap addressed: missing Postman namespace for module import.
- Implementation:
	- Expose `pm.require` and map it to module loader-backed sandbox `require`.
	- Keep current security boundaries/whitelisting from module loader.
- Primary files:
	- `http-forge.core/src/infrastructure/script/script-executor.ts`
	- `http-forge.core/src/infrastructure/script/request-script-session.ts`
	- `http-forge.core/src/infrastructure/script/module-loader.ts`
- Acceptance criteria:
	- `const _ = pm.require('lodash')` works when module is available.
	- Clear error message when module is unavailable.

9. Define `pm.vault.*` compatibility strategy
- Gap addressed: missing Postman vault namespace.
- Implementation options:
	map to HTTP Forge secret provider system with constrained API (`get`, optionally `set` local-only).keep {{secret:...}} as is
- Primary files:
	- `http-forge.core/src/infrastructure/script/request-script-session.ts`
	- `http-forge.core/src/infrastructure/secrets/*`
	- `http-forge/docs/user-guide/secret-providers.md`
- Acceptance criteria:
	- Behavior is deterministic and documented.
	- No secret leakage in console/report persistence.

### Cross-cutting work for every phase

10. Tests
- Add unit/integration coverage for each new API path.
- Suggested test locations:
	- `http-forge.core/src/**/__tests__/*`
	- existing script execution and suite execution test modules.

11. Documentation updates
- Update these docs per delivered item:
	- `http-forge/docs/user-guide/scripts-assertions.md`
	- `http-forge/docs/user-guide/postman-compatibility.md`
	- `http-forge/docs/user-guide/postman-compatibility-matrix.md`

12. Regression guardrails
- Add compatibility fixtures using Postman-style scripts to prevent parity regressions.
- Include fixtures for aliases (`pm`, `ctx`, `agl`) and both request tester + suite runner contexts.

### Suggested rollout and sequencing

Sprint 1:
- P0 items 1-3 (`contain`, `addHeader` alias, `execution.location` upgrade).

Sprint 2:
- P1 items 4-6 (`jsonSchema`, `test.fail`, `test.skip`, `test.index`).

Sprint 3:
- P2 items 7-9 (`execution.runRequest`, `pm.require`, `pm.vault` strategy).

### Success metrics

- Reduce missing/partial script-runtime gaps in this matrix to zero, except intentional non-goals documented with rationale.
- All new compatibility features covered by automated tests.
- No regressions in existing `pm`/`ctx`/`agl` scripts.

## Notes

- This matrix reflects current implementation in HTTP Forge core script runtime and user-guide docs.
- If needed, missing items can be prioritized into a parity roadmap (high-impact first: `.contain`, `jsonSchema`, `pm.execution.runRequest`, `pm.test.skip/fail`).