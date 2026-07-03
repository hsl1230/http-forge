<div align="center">

<img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/http-forge-icon.png" alt="HTTP Forge" width="120"/>

# HTTP Forge 🔨

**The AI-native API platform for VS Code.**

Free alternative to Postman, Bruno, Thunder Client & Insomnia — with a built-in MCP server that lets GitHub Copilot, Claude, and Cursor run your API tests autonomously.

[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/henry-huang.http-forge?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=henry-huang.http-forge)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/henry-huang.http-forge)](https://marketplace.visualstudio.com/items?itemName=henry-huang.http-forge)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[📖 Docs](docs/user-guide/index.md) • [🐛 Issues](https://github.com/hsl1230/http-forge/issues) • [📝 Changelog](CHANGELOG.md)

</div>

---

[![AI in action — click to watch](https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/thumbnails/ai-flow-thumb.png)](https://github.com/user-attachments/assets/70a3c4a0-66cd-4340-bfae-c4579c7d410b)

[![Introduction — click to watch](https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/thumbnails/intro-thumb.png)](https://github.com/user-attachments/assets/9a20095c-c5f0-44d9-8677-634e83f82517)

---

## 🤖 AI & MCP
✅ Built-in MCP server — 60+ tools for GitHub Copilot, Claude, Cursor, Continue  
✅ Auto-generate request bodies and test scripts from natural language  
✅ Scan collections for hardcoded values → replace with `{{ENV_VAR}}`  
✅ Analyse test coverage against OpenAPI specs  
✅ Heal broken assertions after API changes  
✅ Generate negative/edge-case test scenarios  
✅ Full agent mode — AI drives the entire test lifecycle autonomously  

### 🔧 Request Builder
✅ All HTTP methods — GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS  
✅ Query params, headers, path variables with enable/disable toggles  
✅ JSON, form-data, raw text, binary, GraphQL body types  
✅ OAuth 2.0 (all 4 grant types + PKCE), Bearer, Basic, API Key  
✅ Pre/post scripts with full `pm.*` Postman API compatibility  
✅ IntelliSense for variables, filters, dynamic vars, and scripting API  

### 📁 Collections
✅ Git-friendly folder structure — one file per request  
✅ Import Postman v2.1, export OpenAPI 3.0  
✅ Drag & drop, duplicate, file-watching auto-reload  
✅ Cross-collection test suites with iterations  
✅ P50/P90/P95/P99 performance statistics  
✅ Self-contained HTML test reports  

### 🌍 Environments & Secrets
✅ Multiple environments with `{{variable}}` substitution  
✅ OS keychain integration (Windows, macOS, Linux)  
✅ Cloud secrets — AWS, Azure, GCP, HashiCorp Vault, 1Password, Doppler  
✅ `pm.environment.set()` persists across requests  

### 🖥️ CLI & CI/CD
✅ Headless collection runner — no VS Code needed  
✅ MCP server lifecycle management (`start`, `stop`, `status`)  
✅ JSON output for pipeline integration  
✅ JUnit XML reports  

---

## 📸 Screenshots

| | |
|---|---|
| <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/send-a-request.png"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/send-a-request.png" width="100%" alt="Send a Request"></a> | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/run-a-collection.png"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/run-a-collection.png" width="100%" alt="Run a Collection"></a> |
| <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/edit-environment.png"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/edit-environment.png" width="100%" alt="Edit Environment"></a> | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/oauth2.0.png"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/oauth2.0.png" width="100%" alt="OAuth 2.0"></a> |
| <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/template-code-completion.png"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/template-code-completion.png" width="100%" alt="Template Completion"></a> | <a href="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/open-api-type.png"><img src="https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/screenshots/open-api-type.png" width="100%" alt="OpenAPI"></a> |

---

## 🔄 Migrate from Postman

Export Postman collection (v2.1) → Import into HTTP Forge → Done. All `pm.*` scripts run unchanged.

| Postman feature | Status |
|---|---|
| Collections v2.1, environments, globals | ✅ Full import |
| `pm.test()`, `pm.expect()`, Chai assertions | ✅ Unchanged |
| `pm.environment`, `pm.globals`, `pm.collectionVariables` | ✅ Unchanged |
| `pm.sendRequest()`, `pm.setNextRequest()`, `pm.execution.skipRequest()` | ✅ Unchanged |
| CryptoJS, lodash, moment, uuid | ✅ Built-in |
| All body modes — raw, urlencoded, form-data, GraphQL, binary | ✅ Unchanged |

---

## 🆚 vs Postman / Bruno / Thunder Client / Insomnia

| | HTTP Forge | Postman | Bruno | Thunder Client | Insomnia |
|---|---|---|---|---|---|
| Price | ✅ Free | ❌ Paid tiers | ✅ Free | ⚠️ Limited free | ⚠️ Limited free |
| No account required | ✅ | ❌ Mandatory | ✅ | ✅ | ❌ |
| Local / offline | ✅ | ❌ Cloud | ✅ | ✅ | ❌ |
| Git-friendly storage | ✅ | ❌ | ✅ | ⚠️ Paid | ❌ |
| MCP server for AI agents | ✅ 60+ tools | ❌ | ❌ | ❌ | ❌ |
| GitHub Copilot native | ✅ | ❌ Postbot | ❌ | ❌ | ❌ |
| OpenAPI import + export | ✅ | ✅ import only | ❌ | ❌ | ✅ import only |
| TypeScript codegen | ✅ | ❌ | ❌ | ❌ | ❌ |
| Playwright integration | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cloud secrets (AWS/Azure/GCP…) | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 📚 Documentation

- [Extension guide](docs/user-guide/extension.md)
- [CLI & CI/CD](docs/user-guide/cli-standalone.md)
- [MCP Server](docs/user-guide/mcp-server.md)
- [Secret Providers](docs/user-guide/secret-providers.md)
- [TypeScript Codegen](docs/user-guide/codegen.md)
- [Playwright Integration](docs/user-guide/playwright.md)

---

## 📄 License

[MIT](LICENSE)

**Enjoy HTTP Forge!** 🔨✨

