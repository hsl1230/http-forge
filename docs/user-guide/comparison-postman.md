# HTTP Forge vs Postman vs Thunder Client

This document compares HTTP Forge (VS Code‑native) with Postman (standalone app) and Thunder Client (VS Code extension) from a practical user perspective.

## Summary
- **HTTP Forge** is optimized for developer workflows inside VS Code, with collections as files in your repo, strong scripting compatibility, Thunder Client-compatible template engine, and test suites integrated with your codebase.
- **Postman** is a standalone platform with broader collaboration, cloud sync, and enterprise tooling.
- **Thunder Client** is a lightweight VS Code extension with a clean UI, filter pipes, and paid Git sync.

## Feature comparison
| Area | HTTP Forge | Postman | Thunder Client |
| --- | --- | --- | --- |
| Editor integration | Native VS Code extension | Separate desktop/web app | Native VS Code extension |
| Price | Free forever | Free tier + paid plans | Free tier + paid plans |
| Collections storage | Files in repo (`storage.root/collections`) | Cloud storage (Postman servers) | SQLite DB (paid: Git sync) |
| Environments | Folder-based JSON files in repo | App environments + cloud sync | Local + paid Git sync |
| History | Local history + shared history in repo | Local + cloud history | Local history |
| Scripts | Postman‑compatible (`ctx`/`pm`/`agl`) — full `pm.*` API parity | Native Postman scripting | Script tabs |
| Script assertions | Full Chai expect chain (`.deep.equal`, `.a`, `.lengthOf`, `.exist`, `.members`, `.keys`, `.string`, etc.) | Full Chai expect | Basic assertions |
| Async tests | ✅ `pm.test(name, async fn)` | ✅ Async callbacks | ❌ |
| Execution flow | ✅ `pm.setNextRequest()`, `pm.execution.skipRequest()` | ✅ `postman.setNextRequest()` | ❌ |
| Visualizer | ✅ `pm.visualizer.set(template, data)` + Visualize tab | ✅ Visualize tab | ❌ |
| CryptoJS | ✅ Full (hash/HMAC/AES/DES/TripleDES/PBKDF2) | ✅ Full CryptoJS | ❌ |
| Sandbox globals | ✅ `xml2Json`, `jsonStringify`, `jsonParse` | ✅ Same | ❌ |
| Cookie API | ✅ `pm.cookies.jar()`, `.toObject()` | ✅ Full cookie jar | Basic cookies |
| Iteration data | ✅ `pm.iterationData.*` | ✅ Data-driven testing | ❌ |
| Authentication | OAuth 2.0 (4 grant types + PKCE), Bearer, Basic, API Key | OAuth 2.0, Bearer, Basic, API Key | OAuth 2.0, Bearer, Basic, API Key |
| Template engine | 25+ filters, JS expressions, string concat, dynamic vars, nested paths | Variable lookup only; JS in script tab | Filter pipes, system variables; no JS in templates |
| IntelliSense | ✅ Variables, filters, dynamic vars, script API chain completion | ❌ No template IntelliSense in VS Code | ❌ No template IntelliSense |
| Filter pipes | ✅ `{{var \| filter1 \| filter2(args)}}` | ❌ | ✅ `{{var \| filter}}` |
| JS expressions in `{{ }}` | ✅ `{{price * quantity}}` | ❌ | ❌ |
| String concat in `{{ }}` | ✅ `{{a + ' ' + b}}` | ❌ | ❌ |
| Nested property paths | ✅ `prop("a.b.c")`, `map("x.y")` | ❌ | ❌ |
| Env vars in filter/dynamic args | ✅ `add(tax)` resolves from env | ❌ | ❌ |
| Script template pre-resolution | ✅ `{{var}}` auto-resolves in script source | ❌ Requires `replaceIn()` | ❌ Requires manual resolution |
| Request builder | Params/headers/body/auth/tabs | Params/headers/body/auth/tabs | Params/headers/body/auth/tabs |
| Path params | Express.js patterns + `{{var}}` | Path variables | Path variables |
| Import/Export | Postman v2.1 + OpenAPI 3.0 | Native Postman format | Thunder Client + Postman import |
| OpenAPI 3.0 | ✅ Full import/export + schema inference | Import only | ❌ |
| Schema editor | ✅ Body + Response schema tabs | ❌ | ❌ |
| Public API | VS Code extension API | Limited platform integrations | ❌ |
| Test suites | Suite runner + stats (P50/P90/P95/P99) | Collection runner + monitors | Collection runner |
| Codegen | Built‑in codegen package | Codegen via Postman tools | ❌ |
| Playwright | First‑class integration packages | External integration required | ❌ |
| CI usage | CLI/standalone runner | Newman / Postman CLI | CLI (paid) |
| Collaboration | Git‑based workflows | Cloud workspaces, team features | Paid Git sync |
| GraphQL | ✅ Introspection, auto-complete, schema explorer | ✅ Schema introspection | ✅ GraphQL support |
| WebSocket | 🔜 Planned | ✅ Full WebSocket support | ✅ WebSocket support |

## Workflow differences
### HTTP Forge
- Collections and environments are versioned alongside code.
- Fits git‑based reviews and branch workflows.
- Uses VS Code UI with Request Tester and history sidebar.
- Template engine supports filters, JS expressions, and string concatenation inline.
- Scripts auto-resolve `{{variable}}` templates before execution — no `replaceIn()` boilerplate needed.

### Postman
- Collections live in Postman workspaces with cloud sync.
- Strong UI for sharing and collaboration outside git.
- JS expressions only available in script tabs, not in `{{ }}` templates.

### Thunder Client
- Lightweight VS Code extension with clean UI.
- Filter pipes in templates, but no JS expressions or string concatenation.
- Paid tier required for Git sync and advanced features.

## When to choose HTTP Forge
- You want requests, environments, and suites versioned in git.
- You prefer working inside VS Code.
- You need tight integration with Playwright or codegen.
- You want Thunder Client-style filters **plus** inline JS expressions and string concatenation.
- You need OpenAPI 3.0 round-trip with schema inference.

## When to choose Postman
- You need extensive collaboration features out of the box.
- You want cloud workspaces, monitors, and API hubs.
- Your team is already standardized on Postman.

## When to choose Thunder Client
- You want a minimal, lightweight HTTP client in VS Code.
- You don't need OpenAPI, codegen, Playwright, or advanced scripting.
- Your team uses Thunder Client's paid Git sync.

## Compatibility notes
- HTTP Forge provides full Postman‑compatible scripting including the complete `pm.*` API (variables, assertions, execution flow, visualizer, CryptoJS, sandbox globals).
- HTTP Forge's filter syntax is compatible with Thunder Client's filter pipes.
- HTTP Forge supports Postman collection import and round-trip with OpenAPI 3.0.
- Some Postman platform features (monitors, mock servers, cloud workspaces) are not in HTTP Forge — by design, HTTP Forge focuses on git‑based developer workflows.
