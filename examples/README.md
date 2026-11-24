# HTTP Forge Script Examples

Annotated script examples for common HTTP Forge patterns. Use these as reference when writing pre-request and post-response scripts.

## Files

| File | Pattern | Use case |
|---|---|---|
| `auth-flow.js` | Login → extract token → use in subsequent requests | Authentication flows |
| `crud-workflow.js` | Create → Read → Update → Delete with ID passing | Integration/E2E testing |
| `error-handling.js` | 400/401/403/404 assertions + response time SLA | Negative testing |
| `data-driven.js` | Iteration data + CSV + conditional assertions | Data-driven testing |

## Usage

1. Copy the relevant snippet into your request's `post-response.js` or `pre-request.js`.
2. Adapt variable names, field names, and expected values to your API.
3. Run the request or suite to verify.

## Key APIs

- `pm.test(name, fn)` — register a test case
- `pm.response.to.have.status(code)` — assert HTTP status
- `pm.expect(value).to.equal(expected)` — equality check
- `pm.response.json()` — parse response body
- `pm.variables.set(key, value)` / `pm.variables.get(key)` — request-scoped variables
- `pm.environment.set(key, value)` — environment variables (cross-request)
- `pm.iterationData.toObject()` — data-driven row
- `pm.execution.skipRequest()` / `pm.setNextRequest(name)` — flow control

Full API reference: `.http-forge/assets/http-forge-globals.d.ts`
Documentation: https://github.com/hsl1230/http-forge/tree/main/docs/user-guide