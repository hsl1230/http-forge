---
marp: true
theme: default
paginate: true
style: |
  section {
    font-family: 'Segoe UI', sans-serif;
  }
  h1 {
    color: #1e3a5f;
  }
  h2 {
    color: #2c5282;
  }
  table {
    font-size: 0.75em;
  }
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1em;
  }
---

<!-- _class: lead -->

# 🔨 HTTP Forge

### What if Postman was **free**, **offline**, and lived in **your IDE**?

---

# The Postman Problem

Things we all deal with daily:

- 🔑 **Mandatory sign-in** — Can't test an API without logging in
- ☁️ **Cloud dependency** — Collections stored on Postman's servers
- 💸 **Paid features creeping in** — Collaboration, mock servers, monitors
- 🔀 **No real Git integration** — Can't PR your API tests
- 🐌 **Heavy Electron app** — Another 500MB app running alongside VS Code
- 🔒 **Network restrictions** — Doesn't work in air-gapped/VPN environments
- 🤝 **Merge conflicts** — Team syncing is painful

> *Sound familiar?*

---

# What is HTTP Forge?

**A full Postman replacement that lives inside VS Code.**

✅ Free forever — no account, no tiers, no limits
✅ 100% offline — works in air-gapped networks
✅ Git-native — collections are files, not cloud blobs
✅ Postman-compatible — import your collections in one click
✅ Same scripting model — `pm.*` API, Chai assertions, pre/post scripts
✅ Better template engine — filters, JS expressions, IntelliSense

**You already know how to use it.**

---

# Demo: From Postman to HTTP Forge in 60 Seconds

### 1. Export from Postman (Collection v2.1)
### 2. Import into HTTP Forge (right-click → Import)
### 3. Import your Environment
### 4. Send your first request

> **That's it. Your entire workflow migrates in under a minute.**

---

# Demo: Key Workflows

| Workflow | What to show |
|----------|-------------|
| **Send a Request** | Method, URL, params, headers, body → Ctrl+Enter |
| **Environment Switching** | Dev / Staging / Prod with variable resolution |
| **Template Engine** | `{{baseUrl}}/users/{{userId \| upper}}` |
| **Pre/Post Scripts** | Token extraction, response assertions |
| **Collection Runner** | Run full suite, see P50/P90/P95/P99 stats |
| **OAuth 2.0** | Authorization Code + PKCE flow |
| **GraphQL** | Schema introspection + auto-complete |

---

# Feature Comparison: HTTP Forge vs Postman

| Capability | HTTP Forge | Postman |
|-----------|:----------:|:-------:|
| **Price** | ✅ Free forever | ❌ Paid tiers |
| **Account required** | ✅ No | ❌ Mandatory |
| **Works offline** | ✅ Full | ❌ Needs internet |
| **Storage** | ✅ Local filesystem | ❌ Cloud-only |
| **Git version control** | ✅ Native | ❌ No |
| **Team collaboration** | ✅ Git PR workflow | ❌ Sync conflicts |
| **IntelliSense** | ✅ Variables, filters, API | ❌ None |
| **Template filters** | ✅ 25+ chainable | ❌ Script-only |
| **JS in templates** | ✅ `{{price * qty}}` | ❌ No |
| **Collection runner** | ✅ Cross-collection, stats | ⚠️ Single collection |
| **OpenAPI export** | ✅ Full round-trip | ❌ Import only |
| **Code generation** | ✅ TypeScript clients | ❌ No |
| **Playwright integration** | ✅ Built-in | ❌ No |

---

# Feature Comparison (continued)

| Capability | HTTP Forge | Postman |
|-----------|:----------:|:-------:|
| **Script API** | ✅ `pm.*` compatible | ✅ `pm.*` |
| **Assertions** | ✅ Chai expect | ✅ Chai expect |
| **OAuth 2.0 + PKCE** | ✅ All 4 grant types | ✅ All grant types |
| **Cookie management** | ✅ Auto-persist | ✅ Auto-persist |
| **Request history** | ✅ Grouped by branch/ticket | ❌ Flat list |
| **Custom modules in scripts** | ✅ Configurable | ❌ Sandboxed only |
| **Data stays on machine** | ✅ Always | ❌ Synced to cloud |
| **Extension size** | ✅ Lightweight | ❌ Separate 500MB app |
| **GraphQL** | ✅ Full support | ✅ Full support |
| **WebSocket** | 🔜 Planned | ✅ Available |
| **Mock servers** | 🔜 Planned (local) | ✅ Cloud-based |

---

# What HTTP Forge Does Better

### 🧠 Smart Template Engine
```
{{token | substring(0,10)}}          — filter pipes
{{price * 1.13}}                     — JS expressions
{{firstName + ' ' + lastName}}       — string concat
{{users | filter(age>25) | map("name")}}  — array ops
```
*All with IntelliSense autocomplete!*

### 📂 Git-Native Storage
```
collections/
  my-api/
    collection.json
    login/
      request.json
      pre-request.js
      post-response.js
```
Every request is a file. PRs, diffs, blame — it all works.

---

# What HTTP Forge Does Better (continued)

### 🏃 Cross-Collection Runner
- Pick requests from **multiple** collections
- Get **P50 / P90 / P95 / P99** response time stats
- Track **error rates** by type
- Save as reusable **Test Suites** for QA

### 🔗 Developer Integrations
- **Code Generation**: Collections → TypeScript API clients
- **Playwright**: Run collections as E2E tests with built-in fixtures
- **OpenAPI**: Import specs → collections → export back to OpenAPI
- **Extension API**: Other extensions can push schemas/requests

---

# Migration Path

### Step 1: Export from Postman
File → Export → Collection v2.1

### Step 2: Import into HTTP Forge
Right-click Collections → Import Postman Collection

### Step 3: Import Environments
Right-click Environments → Import Postman Environment

### ✅ Done!
- All requests preserved
- All folders/structure preserved
- Scripts, tests, and variables work as-is
- `pm.*` API is compatible

---

# Team Workflow: How We'll Collaborate

### Before (Postman)
```
❌ Everyone has their own copy
❌ "Did you update the collection?"
❌ Sync conflicts when 2 people edit
❌ No review process for API changes
```

### After (HTTP Forge)
```
✅ Collections in Git repo (shared)
✅ PR reviews for API test changes
✅ Branch per feature/ticket
✅ History grouped by ticket/branch
✅ Shared histories for the team
✅ No merge conflicts (file-per-request)
```

---

# Security & Compliance

| Concern | HTTP Forge |
|---------|-----------|
| **Data residency** | All data stays on your machine / your Git repo |
| **Network access** | Zero — fully offline capable |
| **Air-gapped environments** | ✅ Works perfectly |
| **VPN/restricted networks** | ✅ No external calls |
| **Account/telemetry** | None — no sign-up, no tracking |
| **Secrets** | Local files, gitignored, never leaves disk |
| **Audit trail** | Git history IS the audit trail |

> No API keys, tokens, or request bodies ever leave your machine.

---

# Getting Started

### Install (2 ways)

**Option A — Inside your existing VS Code:**
```
ext install henry-huang.http-forge
```

**Option B — Standalone launcher (isolated profile):**
```bash
# Linux/macOS
./http-forge.sh --test .

# Windows
http-forge.bat --test .
```

---

# Resources for the Team

| Resource | Description |
|----------|-------------|
| 📖 [User Guide](docs/user-guide/index.md) | Complete documentation |
| 🔧 [Configuration](docs/configuration.md) | Settings & custom modules |
| 📦 Shared Collections repo | Team collections in Git |
| 🧪 Test Suites | Pre-built QA suites |
| ❓ [Q&A](https://marketplace.visualstudio.com/items?itemName=henry-huang.http-forge&ssr=false#qna) | Ask questions on Marketplace |
| 🐛 [GitHub Issues](https://github.com/hsl1230/http-forge/issues) | Report bugs & request features |
| ⭐ [Reviews](https://marketplace.visualstudio.com/items?itemName=henry-huang.http-forge&ssr=false#review-details) | Share your feedback |
| 🎥 This recording | Reference for today's demo |
| 🚀 Standalone Launcher | For QA without full VS Code setup |

---

# FAQ

**Q: Can I still use Postman alongside it?**
A: Yes! They don't conflict. Migrate at your own pace.

**Q: What about Postman features we use daily?**
A: Requests, collections, environments, scripts, assertions, OAuth — all supported.

**Q: What about WebSocket / Mock servers?**
A: On the roadmap. For now, use existing tools for those specific cases.

**Q: Is it stable for production use?**
A: v0.11.27, actively maintained, used by our team daily.

**Q: What if I find a bug?**
A: File on GitHub — fixes are typically same-day.

---

# HTTP Forge vs Postman vs Insomnia vs Bruno

| Capability | HTTP Forge | Postman | Insomnia | Bruno |
|-----------|:----------:|:-------:|:--------:|:-----:|
| **Price** | ✅ Free, all features | ❌ Paid tiers | ⚠️ Free tier limited, sync is paid | ⚠️ Open-source core, paid "Golden/Ultimate" |
| **Account required** | ✅ No | ❌ Mandatory | ⚠️ Mandatory for sync (backlash in v8) | ✅ No |
| **Form factor** | ✅ VS Code extension | ❌ Separate app (500MB) | ❌ Separate Electron app | ❌ Separate Electron app |
| **Works offline** | ✅ Full | ❌ Needs internet | ⚠️ Scratch Pad only (local-only tier) | ✅ Full |
| **Git version control** | ✅ Native (file-per-request) | ❌ No | ⚠️ Paid plan or manual export | ✅ Built-in Git GUI |
| **Data residency** | ✅ 100% local | ❌ Synced to cloud | ⚠️ Cloud account required for sync | ✅ 100% local |
| **IntelliSense** | ✅ Variables, filters, API | ❌ None | ❌ None | ❌ None |
| **Template filters** | ✅ 25+ chainable | ❌ Script-only | ⚠️ Nunjucks (different syntax) | ❌ Basic interpolation only |
| **JS in templates** | ✅ `{{price * qty}}` | ❌ No | ✅ Nunjucks expressions | ❌ Not supported |
| **Postman `pm.*` API** | ✅ Works as-is | ✅ Native | ❌ Needs rewriting | ❌ Different API (`bru.*`) |
| **Collection runner** | ✅ Cross-collection, P50/P90/P95/P99 | ⚠️ Single collection | ⚠️ Basic, no percentile metrics | ⚠️ Single collection, basic pass/fail |
| **OpenAPI export** | ✅ Full round-trip | ❌ Import only | ⚠️ Partial | ⚠️ Partial |
| **Code generation** | ✅ Full TypeScript clients | ❌ No | ⚠️ Snippets only | ⚠️ Snippets only |
| **Playwright integration** | ✅ Built-in | ❌ No | ❌ No | ❌ No |
| **Schema editor** | ✅ Body + Response with inference | ❌ No | ❌ No | ❌ No |
| **OAuth 2.0 + PKCE** | ✅ Auto-refresh | ✅ All grant types | ✅ Full OAuth 2.0 | ⚠️ Basic, manual refresh |
| **gRPC / WebSocket** | 🔜 Planned | ✅ Available | ✅ gRPC + WebSocket | ❌ No |
| **CLI for CI/CD** | ⚠️ Via Playwright | ❌ No first-class CLI | ✅ `inso run test` | ✅ `bru run` |
| **Secret managers** | ❌ Local only | ⚠️ Vault (paid) | ❌ No | ✅ AWS/Azure/HashiCorp (paid) |
| **Auth breadth** | OAuth2, Bearer, Basic, API Key | +OAuth1, NTLM, Digest, AWS Sig | +NTLM, Digest, Hawk, AWS Sig | +OAuth1, AWS Sig, Digest, NTLM |
| **Custom script modules** | ✅ Configurable | ❌ Sandboxed only | ❌ Sandboxed only | ⚠️ Limited |

---

# Tool Comparison — Summary

### HTTP Forge wins on:
- **Developer experience** — lives inside VS Code, zero context-switch
- **Postman migration** — `pm.*` scripts run as-is, no rewriting
- **Smart templates** — filter pipes + JS expressions + IntelliSense
- **Metrics** — P50/P90/P95/P99 latency, not just pass/fail
- **Privacy** — no account, no cloud, 100% local
- **TypeScript codegen + Playwright** — unique in this category
- **Truly free** — no "Golden Edition" or paid sync tier

### Where others have an edge:
- **Postman** — most mature, widest auth support, WebSocket/mocks
- **Insomnia** — `inso` CLI, gRPC + WebSocket, Nunjucks templates
- **Bruno** — `bru run` CLI, enterprise secret managers, Git GUI

---

<!-- _class: lead -->

# Let's Try It Together

### 🔨 Open VS Code → Install HTTP Forge → Import your Postman Collection

**5 minutes from now, you'll never open Postman again.**

---

# Next Steps

1. ✅ Install HTTP Forge today
2. 📦 Export your most-used Postman collection
3. 📥 Import it into HTTP Forge
4. 🧪 Run your first request
5. ⭐ Leave a review or file an issue

### Questions?
