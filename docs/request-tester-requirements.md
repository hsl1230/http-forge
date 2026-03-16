# HTTP Forge - Request Tester Requirements Document

## Document Information

| Field | Value |
|-------|-------|
| Version | 2.0 |
| Last Updated | December 31, 2024 |
| Status | Implemented |
| Author | HTTP Forge Team |

---

## 1. Executive Summary

HTTP Forge is a Postman-like API testing tool for Visual Studio Code. It enables developers to test HTTP APIs directly from the IDE with support for collections, environments, scripting, and request history.

Key features include:
- **Pre-request & Post-response Scripts**: JavaScript-based automation before/after requests
- **Test Assertions**: Built-in testing framework with `forge.test()` and `forge.expect()` API
- **Console Capture**: Script console output display for debugging
- **Cookie Management**: Automatic cookie handling across requests
- **History Tracking**: Request history with optional grouping
- **Variable Substitution**: Support for `{{variableName}}` syntax

---

## 2. Business Requirements

### 2.1 Problem Statement

Developers currently face several challenges when testing HTTP APIs:

1. **Context Switching**: Must switch between VS Code and external tools (Postman, curl)
2. **Manual Input**: Must manually type endpoint paths, headers, and parameters
3. **Environment Management**: Difficulty managing credentials across environments
4. **History Tracking**: No integration between test history and code changes
5. **Data Flow Disconnect**: Cannot leverage Flow Analyzer's data flow analysis

### 2.2 Business Goals

| ID | Goal | Success Metric |
|----|------|----------------|
| BG-1 | Reduce API testing time | 50% reduction in time to first request |
| BG-2 | Eliminate context switching | Zero external tool usage for basic testing |
| BG-3 | Improve developer experience | Positive feedback from dev team |
| BG-4 | Enable history tracking | 100% of requests tracked with git context |

### 2.3 Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| AGL Developers | Primary Users | Efficient endpoint testing |
| QA Engineers | Secondary Users | Regression testing support |
| Tech Leads | Oversight | Code quality, productivity |

---

## 3. Functional Requirements

### 3.1 Launch & Integration

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-1.1 | Launch from Flow Analyzer via "Test" button | Must | ✅ Done |
| FR-1.2 | Receive pre-analyzed data (params, query, headers, body) | Must | ✅ Done |
| FR-1.3 | Open as separate webview panel | Must | ✅ Done |
| FR-1.4 | Support side-by-side view with Flow Analyzer | Should | ✅ Done |

### 3.2 Environment Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-2.1 | Global environment selector dropdown | Must | ✅ Done |
| FR-2.2 | Support multiple environments (local, dev, sit, preprod, prod) | Must | ✅ Done |
| FR-2.3 | Persist selected environment across sessions | Must | ✅ Done |
| FR-2.4 | Variable substitution with `{{variable}}` syntax | Must | ✅ Done |
| FR-2.5 | Separate local config for secrets (gitignored) | Must | ✅ Done |
| FR-2.6 | Environment-specific headers and credentials | Must | ✅ Done |
| FR-2.7 | Production confirmation dialog | Must | ✅ Done |
| FR-2.8 | Environment editor with Monaco JSON support | Should | ✅ Done |

### 3.3 Request Builder

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-3.1 | Display HTTP method and endpoint path | Must | ✅ Done |
| FR-3.2 | Path parameters input (auto-detected from endpoint) | Must | ✅ Done |
| FR-3.3 | Query parameters with enable/disable checkboxes | Must | ✅ Done |
| FR-3.4 | Custom headers with enable/disable checkboxes | Must | ✅ Done |
| FR-3.5 | Request body editor (Monaco, JSON) | Must | ✅ Done |
| FR-3.6 | Authorization tab (inherit, oauth2, bearer, basic, apikey, none) | Must | ✅ Done |
| FR-3.7 | Add/remove custom parameters and headers | Must | ✅ Done |
| FR-3.8 | Resolved URL preview | Must | ✅ Done |
| FR-3.9 | Settings tab for request configuration | Should | ✅ Done |
| FR-3.10 | Express.js path pattern support (`:paramName`) | Must | ✅ Done |
| FR-3.11 | Dynamic path variable extraction from URL | Must | ✅ Done |
| FR-3.12 | Mustache template highlighting in body/editor (supports sections, partials, comments) | Should | ✅ Done |

### 3.4 Request Settings

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-4.1 | Configurable request timeout | Should | ✅ Done |
| FR-4.2 | Follow redirects toggle | Should | ✅ Done |
| FR-4.3 | Follow original HTTP method on redirect | Should | ✅ Done |
| FR-4.4 | Follow Authorization header on redirect | Should | ✅ Done |
| FR-4.5 | Maximum redirects limit | Should | ✅ Done |
| FR-4.6 | SSL certificate verification toggle | Should | ✅ Done |
| FR-4.7 | Auto-decompress response (gzip/deflate) | Should | ✅ Done |
| FR-4.8 | HTTP/2 support | Could | ❌ Not Implemented |
| FR-4.9 | Automatic URL encoding | Could | ❌ Not Implemented |

### 3.5 Pre-request & Post-response Scripts

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-5.1 | Pre-request script editor (Monaco, JavaScript) | Must | ✅ Done |
| FR-5.2 | Post-response script editor (Monaco, JavaScript) | Must | ✅ Done |
| FR-5.3 | Default script templates with examples | Should | ✅ Done |
| FR-5.4 | Access to request data via `agl.request` | Must | ✅ Done |
| FR-5.5 | Access to response data via `agl.response` | Must | ✅ Done |
| FR-5.6 | Variable management via `agl.variables` | Must | ✅ Done |
| FR-5.7 | Cookie access via `agl.cookies` | Must | ✅ Done |
| FR-5.8 | Console capture (`console.log/warn/error`) | Must | ✅ Done |
| FR-5.9 | Script error handling and display | Must | ✅ Done |

### 3.6 Test Assertions

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-6.1 | Test definition via `agl.test(name, fn)` | Must | ✅ Done |
| FR-6.2 | Fluent assertions via `agl.expect(value)` | Must | ✅ Done |
| FR-6.3 | Common assertions (toBe, toEqual, toContain, etc.) | Must | ✅ Done |
| FR-6.4 | Response status assertions | Must | ✅ Done |
| FR-6.5 | Response body/JSON assertions | Must | ✅ Done |
| FR-6.6 | Response header assertions | Must | ✅ Done |
| FR-6.7 | Test results display with pass/fail summary | Must | ✅ Done |
| FR-6.8 | Test count badge on Tests tab | Should | ✅ Done |
| FR-6.9 | Clear test results button | Should | ✅ Done |

### 3.7 Request Execution

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-7.1 | Send HTTP request to selected environment | Must | ✅ Done |
| FR-7.2 | Display loading state during request | Must | ✅ Done |
| FR-7.3 | Cancel in-progress request | Must | ✅ Done |
| FR-7.4 | Handle request errors gracefully | Must | ✅ Done |
| FR-7.5 | Apply environment headers automatically | Must | ✅ Done |
| FR-7.6 | Execute pre-request script before send | Must | ✅ Done |
| FR-7.7 | Execute post-response script after response | Must | ✅ Done |

### 3.8 Response Display

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-8.1 | Display status code with color coding | Must | ✅ Done |
| FR-8.2 | Display response time | Must | ✅ Done |
| FR-8.3 | Response body viewer (Monaco, read-only) | Must | ✅ Done |
| FR-8.11 | HTML preview for response body (sandboxed rendered view + Raw toggle) | Should | ✅ Done |
| FR-8.4 | Response headers table | Must | ✅ Done |
| FR-8.5 | Response cookies table | Must | ✅ Done |
| FR-8.6 | Auto-format JSON response | Must | ✅ Done |
| FR-8.7 | Clear response when switching history | Should | ✅ Done |
| FR-8.8 | Tests tab with test results display | Must | ✅ Done |
| FR-8.9 | Console tab with script output | Must | ✅ Done |
| FR-8.10 | Clear console button | Should | ✅ Done |

### 3.9 Request History

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-9.1 | Save request to history on send | Must | ✅ Done |
| FR-9.2 | Filter history by selected environment | Must | ✅ Done |
| FR-9.3 | Group history by ticket/branch | Must | ✅ Done |
| FR-9.4 | Extract ticket from git branch name | Must | ✅ Done |
| FR-9.5 | Display request summary (params, status, time) | Must | ✅ Done |
| FR-9.6 | Load history entry into request builder | Must | ✅ Done |
| FR-9.7 | Delete individual history entries | Should | ✅ Done |
| FR-9.8 | Collapsible history groups | Should | ✅ Done |
| FR-9.9 | Highlight current branch group | Should | ✅ Done |
| FR-9.10 | Resizable history sidebar | Should | ✅ Done |
| FR-9.11 | Active entry highlighting | Should | ✅ Done |
| FR-9.12 | Duration formatting with commas | Should | ✅ Done |
| FR-9.13 | Duration color coding by speed | Should | ✅ Done |
| FR-9.14 | Save full response with transaction ID | Could | ✅ Done |
	- Acceptance: When enabled, the full response is saved to a separate `{entryId}.json` file next to the transaction. Sharing the entry moves (or copies) this file into `storage.root/shared-histories` so restoring a shared entry also restores its saved response.
| FR-9.15 | History filtered to current endpoint only | Must | ✅ Done |

### 3.10 Jira Integration

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-10.1 | Clickable ticket links in history | Should | ✅ Done |
| FR-10.2 | Open ticket in default browser | Should | ✅ Done |
| FR-10.3 | Configurable Jira base URL | Should | ✅ Done |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-1.1 | Panel load time | < 500ms | ✅ Met |
| NFR-1.2 | Request send latency (overhead) | < 50ms | ✅ Met |
| NFR-1.3 | History load time | < 200ms | ✅ Met |
| NFR-1.4 | Monaco editor initialization | < 1s | ✅ Met |

### 4.2 Usability

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-2.1 | Keyboard navigation support | Full | ⚠️ Partial |
| NFR-2.2 | Responsive layout | All panel sizes | ✅ Met |
| NFR-2.3 | VS Code theme integration | Dark/Light | ✅ Met |
| NFR-2.4 | Accessible color contrast | WCAG AA | ✅ Met |

### 4.3 Reliability

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-3.1 | Handle network errors gracefully | 100% | ✅ Met |
| NFR-3.2 | Handle malformed JSON in body | 100% | ✅ Met |
| NFR-3.3 | Persist history across sessions | 100% | ✅ Met |
| NFR-3.4 | Recover from extension crashes | Graceful | ✅ Met |

### 4.4 Security

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-4.1 | Local secrets in gitignored file | Enforced | ✅ Met |
| NFR-4.2 | Production confirmation before send | Required | ✅ Met |
| NFR-4.3 | No credential logging | Enforced | ✅ Met |
| NFR-4.4 | Secure variable resolution | No exposure | ✅ Met |

### 4.5 Maintainability

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-5.1 | TypeScript with strict mode | Enforced | ✅ Met |
| NFR-5.2 | Modular service architecture | SOLID | ✅ Met |
| NFR-5.3 | Separation of concerns (webview/extension) | Clean | ✅ Met |

---

## 5. User Stories

### US-1: Test Endpoint from Flow Analyzer
**As a** developer analyzing an endpoint  
**I want to** click "Test" in the Flow Analyzer  
**So that** I can immediately test the endpoint with pre-filled inputs

**Acceptance Criteria:**
- [x] "Test" button visible in Flow Analyzer toolbar
- [x] Opens Endpoint Tester panel with endpoint data
- [x] Path params, query params, headers pre-populated
- [x] Body template pre-filled for POST/PUT/PATCH

### US-2: Switch Environments
**As a** developer  
**I want to** switch between environments (dev, sit, prod)  
**So that** I can test the same endpoint against different servers

**Acceptance Criteria:**
- [x] Environment dropdown in header
- [x] Selection persists across sessions
- [x] Variables resolved per environment
- [x] Production requires confirmation

### US-3: Manage Request History
**As a** developer  
**I want to** see my request history grouped by ticket  
**So that** I can track testing progress and replay requests

**Acceptance Criteria:**
- [x] History filtered by environment
- [x] Grouped by ticket/branch
- [x] Current branch highlighted
- [x] Click to load into request builder
- [x] Collapsible groups
- [x] Delete individual entries

### US-4: Configure Request Settings
**As a** developer  
**I want to** configure timeout, redirects, and SSL settings  
**So that** I can handle edge cases and debugging scenarios

**Acceptance Criteria:**
- [x] Settings tab in request builder
- [x] Timeout configuration
- [x] Redirect behavior options
- [x] SSL verification toggle
- [x] Settings saved in history

### US-5: Store Secrets Securely
**As a** developer  
**I want to** store my tokens in a gitignored file  
**So that** I don't accidentally commit credentials

**Acceptance Criteria:**
- [x] `environments.local.json` for secrets
- [x] File is gitignored by default
- [x] Variables merged at runtime
- [x] Environment editor supports local config

### US-6: Write Pre-request Scripts
**As a** developer  
**I want to** write JavaScript code that runs before each request  
**So that** I can dynamically modify headers, generate timestamps, or prepare data

**Acceptance Criteria:**
- [x] Pre-request script editor with Monaco (JavaScript)
- [x] Access to `agl.request` object
- [x] Access to `agl.variables` for setting/getting variables
- [x] Console output captured and displayed
- [x] Script errors handled gracefully

### US-7: Write Test Assertions
**As a** developer  
**I want to** write test assertions in post-response scripts  
**So that** I can verify API responses meet expectations

**Acceptance Criteria:**
- [x] Post-response script editor with Monaco (JavaScript)
- [x] `agl.test(name, fn)` for defining tests
- [x] `agl.expect(value)` fluent assertion API
- [x] Test results displayed with pass/fail summary
- [x] Test count badge on Tests tab

### US-8: Debug Scripts with Console
**As a** developer  
**I want to** see console.log output from my scripts  
**So that** I can debug and understand script execution

**Acceptance Criteria:**
- [x] Console tab in response section
- [x] Capture console.log, console.warn, console.error
- [x] Color-coded output by log level
- [x] Clear console button

---

## 6. Constraints & Assumptions

### 6.1 Constraints

| ID | Constraint | Impact |
|----|------------|--------|
| C-1 | VS Code webview security restrictions | Cannot use inline scripts, must use nonce |
| C-2 | Node.js http/https modules only | No HTTP/2 without http2 module |
| C-3 | Extension host process for requests | Cannot make requests from webview directly |
| C-4 | File system access via VS Code API | Must use extension for file operations |

### 6.2 Assumptions

| ID | Assumption | Risk if False |
|----|------------|---------------|
| A-1 | Developers have access to environment URLs | Cannot test without access |
| A-2 | Git is used for version control | Ticket extraction won't work |
| A-3 | Jira is the ticket system | Links won't work for other systems |
| A-4 | JSON is the primary body format | Other formats less supported |

---

## 7. Dependencies

### 7.1 Internal Dependencies

| Dependency | Purpose |
|------------|---------|
| Flow Analyzer | Provides endpoint data flow analysis |
| Environment Config Service | Manages environment configurations |
| Git Service | Extracts branch and ticket information |
| HTTP Request Service | Executes HTTP requests |
| Request History Service | Persists request history |
| **http-tester-core** | Shared modules for script runner, test results, console capture, etc. |

### 7.2 http-tester-core Shared Modules

| Module | Purpose |
|--------|---------|
| `console-capture.js` | Capture console output from scripts |
| `test-results.js` | Manage test assertions and results |
| `script-runner.js` | Execute pre/post scripts in sandbox |
| `agl-object.js` | `agl` API object for scripts |
| `expect-chain.js` | Fluent assertion API (`agl.expect()`) |
| `cookie-manager.js` | Manage cookies across requests |
| `variable-resolver.js` | Resolve `{{variables}}` in requests |
| `history-renderer.js` | Render history UI |
| `history-manager.js` | Manage history data |
| `path-variable-extractor.js` | Extract `:param` from Express paths |

### 7.3 External Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| VS Code | ^1.85.0 | Extension host, webview API |
| Monaco Editor | ^0.45.0 | JSON editors for body and response |
| Node.js http/https | Built-in | HTTP request execution |
| Node.js zlib | Built-in | Response decompression |

---

## 8. Out of Scope (v2.0)

The following features are explicitly out of scope for the current version:

| Feature | Reason | Status |
|---------|--------|--------|
| ~~Pre-request scripts~~ | ~~Complexity~~ | ✅ **Implemented in v2.0** |
| ~~Test assertions~~ | ~~Complexity~~ | ✅ **Implemented in v2.0** |
| Request collections | See HTTP API Tester | 🔗 Separate feature |
| Request chaining | See HTTP API Tester | 🔗 Separate feature |
| ~~OAuth2 flow automation~~ | ~~Complexity~~ | ✅ **Implemented in v0.11.0** |
| ~~GraphQL support~~ | ~~Different paradigm~~ | ✅ **Implemented in v0.11.0** (Schema introspection, auto-complete, syntax highlighting, Schema Explorer, operation selector) |
| WebSocket testing | Different protocol | v0.9.0 |
| Import from Postman | See HTTP API Tester | 🔗 Separate feature |
| Export to cURL | Nice-to-have | v0.8.0 |

---

## 9. Glossary

| Term | Definition |
|------|------------|
| AGL | Accenture Gateway Layer - middleware architecture |
| agl object | JavaScript API object available in scripts (`agl.request`, `agl.response`, etc.) |
| Assertion | Test expectation using `agl.expect()` fluent API |
| Console Capture | Mechanism to capture and display `console.log()` output from scripts |
| Endpoint | API route defined in middleware configuration |
| Environment | Target server configuration (dev, sit, prod) |
| Express.js Path Pattern | Route pattern with `:paramName` syntax for path variables |
| Flow Analyzer | Tool for visualizing middleware execution flow |
| History Entry | Record of a sent request with response metadata |
| http-tester-core | Shared module library used by both Endpoint Tester and HTTP API Tester |
| Middleware | Express.js middleware component |
| Path Variable | URL segment parameter defined with `:name` syntax |
| Post-response Script | JavaScript code executed after receiving response |
| Pre-request Script | JavaScript code executed before sending request |
| Test | Named assertion block defined with `agl.test(name, fn)` |
| Transaction ID | `x-avs-transactionid` header for request tracing |
| Variable | Placeholder `{{name}}` resolved at runtime |

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-18 | AGL Team | Initial requirements document |
| 2.0 | 2025-12-19 | AGL Team | Added Scripts, Test Assertions, Console, Cookie Management, Express.js path patterns, shared http-tester-core modules |
| 2.1 | 2025-01-XX | AGL Team | Webview SOLID refactoring - split into 22 modular files |

