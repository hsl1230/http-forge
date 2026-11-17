# Debugging Collection Runs & Test Suites

This guide covers how to debug a collection run or test suite in HTTP Forge, including script-level debugging with breakpoints and `debugger;` statements.

## Overview

HTTP Forge runs collection and suite requests inside the VS Code extension host (Node.js). Scripts (pre-request and post-response) execute in a Node.js VM context. You can debug them with the standard VS Code Node debugger, or fall back to console logging and MCP tools when no debugger is attached.

## Debugging scripts

HTTP Forge runs scripts in a Node.js VM context inside the VS Code extension host.

### Option A — Launch VS Code with inspection (recommended)

1. Launch VS Code with extension inspection enabled:
   ```bash
   code --inspect-extensions=9229
   ```
2. Open the **Run & Debug** panel and attach via **Node.js: Attach** on port `9229` (press F5).
3. Open your script file (e.g. `scripts/post-response.js`) and set a breakpoint (F9), or insert a `debugger;` statement.
4. Run a collection or suite. The debugger pauses at the breakpoint. Inspect variables and step through code.

### Option B — Attach to a running VS Code

1. Press `Ctrl+Shift+P` → **Debug: Attach to Node Process** → select `extensionHost`.
2. Set breakpoints, then run a collection or suite.

### Option C — No debugger (console logging)

1. Insert `console.log('debug:', JSON.stringify(pm.response.json()))` in your script.
2. View output in **Help → Toggle Developer Tools → Console**.
3. Or click a result row in the Test Suite panel, or use the MCP `explain_failure` tool.

### Notes

- Breakpoints only work on **script files on disk** (`scripts/pre-request.js`, `scripts/post-response.js`), not on webview-edited scripts. Save first.
- Each script level (collection, folder, request) runs as a separate VM script with the file path it was loaded from, so breakpoints map to the correct file.
- Flow-node scripts and other inline scripts (e.g. a script typed into a webview without saving) use a synthetic filename — use `debugger;` statements for precise placement.
- Without a debugger attached, `debugger;` statements are silently ignored.

## Debugging a collection run / test suite

### Reading results

After a run, open the suite runner's **Results** tab. Each request shows status, duration, and response. Failed requests surface assertion errors and the response body.

### Fix Errors (AI-assisted)

When a run contains failures, the **Fix Errors** button opens GitHub Copilot Chat with a structured failure-analysis prompt for the current run. If `run-summary.md` exists for the run, HTTP Forge attaches that file directly; otherwise it falls back to an inline summary of failed requests. The prompt can be edited before opening Copilot Chat.

### MCP tools for debugging

The MCP server exposes tools for AI-assisted debugging:

- `explain_failure` — explain why a request failed.
- `suggest_assertions` — propose assertions for a request.
- `get_failed_requests` / `get_request_result` — inspect run results.
- `get_run_summary` — high-level run outcome.

Example prompt to an AI agent:

> "Run the full checkout flow step by step — login, add to cart, place order — and show me where it fails"

### Common pitfalls

- **Variables not resolving** — check environment selection and variable names. See [Environments & Variables](environments-variables.md).
- **Scripts failing** — validate syntax and available globals; review script console output in the Response panel. See [Scripts & Assertions](scripts-assertions.md).
- **History or results not showing** — verify `storage.history` and `storage.results` paths are writable.
- **Expected error statuses** — without assertions, pass/fail is based on HTTP status (200–302 = pass). Add assertions to define expected error behavior. See [Test Suites](test-suites.md).

## Related

- [Test Suites](test-suites.md) — running suites, pass/fail logic, results and statistics.
- [Scripts & Assertions](scripts-assertions.md) — scripting API and assertions.
- [MCP Server](mcp-server.md) — AI-assisted debugging workflows.
- [Troubleshooting & FAQs](troubleshooting.md) — general issues.
