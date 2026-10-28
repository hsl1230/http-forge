# Getting Started

Get from zero to your first API test in under 60 seconds, then learn the full lifecycle.

## Prerequisites

- Node.js 20+ (the CLI installs VS Code, HTTP Forge, and GitHub Copilot automatically)
- GitHub Copilot sign-in (optional, for AI features)

## 1. Install

```bash
npm install -g @http-forge/cli
http-forge launch
```

`http-forge launch` will download and install VS Code, the HTTP Forge extension, and GitHub Copilot (with Copilot Chat) automatically if they are not already present, then open the workspace. Sign in to GitHub via the Accounts menu to enable AI features.

Launch modes:
- `--test` (default) — isolated profile with only HTTP Forge + Copilot (clean, reproducible)
- `--dev` — your default VS Code profile (all your existing extensions)
- `--both` — launch both profiles side by side

```bash
http-forge launch --dev          # use your existing VS Code setup
http-forge launch --test         # isolated profile (default)
http-forge launch --both         # both side by side
http-forge launch ./my-project   # open a specific workspace
```

> Already have VS Code installed? You can also install HTTP Forge from the VS Code Marketplace: search **HTTP Forge** in the Extensions panel.

## 2. Create a request

1. Open the HTTP Forge panel in the sidebar.
2. Click **New Collection** and give it a name (e.g., `My API`).
3. Inside the collection, click **New Request** to create a new request and name it.
4. Set the method to **GET** and the URL to `https://jsonplaceholder.typicode.com/posts/1`.
5. Hit **Send** — you'll see the JSON response instantly.

## 3. Let AI write your tests

Click **Suggest Assertions** in the Request Tester (or use the `suggest_assertions` MCP tool). Copilot reads the response schema and generates `pm.test()` assertions automatically.

## 4. Design or discover

**Design from intent:**
- Command Palette: **HTTP Forge: Design an API from Intent (AI)** — describe your API in plain English.
- CLI: `http-forge architect "I need a shopping cart" --apply`
- MCP: `design_api_from_intent`

**Discover from source code:**
- Command Palette: **HTTP Forge: Discover APIs** — scans the workspace with six framework providers (Express, Nest, Fastify, Lambda, Spring, FastAPI).
- CLI: `http-forge discover --path ./backend`
- MCP: `create_request_from_endpoint`, `generate_test_suite`

## 5. Generate tests

- CLI: `http-forge generate-collection --path ./backend --collection "My API"` (requests only)
- CLI: `http-forge generate-suite --path ./backend --collection "My API"` (requests + suite)
- MCP: `generate_test_suite`, `generate_workflow`

Provide acceptance criteria (ACs), E2E workflows, and edge-case inputs when available. Some can be inferred from source code, workspace docs, or Confluence/Jira pages via MCP.

## 6. Run

```bash
# Collection run
http-forge run collection "My Collection" --env dev

# Suite run
http-forge run suite "Regression" --env prod --exit-code

# Single request
http-forge run request "Login" --collection "Auth" --env dev
```

Or use the MCP tools: `run_collection`, `run_suite`, `run_request`, `run_folder`.

WebSocket and Socket.IO requests run headlessly with the same transcript and assertion pipeline.

## 7. Report

- CLI: add `--include report` for a self-contained HTML report, `--reporter junit` for CI.
- MCP: pass `include: ["report"]` in run options; open `report.uri`.
- Reports include full response details, timing stats, and pass/fail summaries.

## 8. Fix and re-run

If something fails:
- Use `explain_failure` or `heal_assertions` MCP tools.
- Ask Copilot/Claude to analyze failures and propose fixes.
- Re-run until green.

## Next steps

- [Request Tester](request-tester.md) — full UI guide
- [Test Suites](test-suites.md) — orchestration, flow nodes, iterations
- [Scripts & Assertions](scripts-assertions.md) — `pm.*` API reference
- [MCP Server](mcp-server.md) — AI agent integration
- [CLI Reference](../cli/docs/cli-reference.md) — all CLI commands
- [WebSocket Examples](../reference/websocket-examples.md) — sample WebSocket/Socket.IO requests

## Troubleshooting

See [Troubleshooting & FAQs](troubleshooting.md).