# Phase 3: Code Flows - Detailed Implementation Solution

## 1. Overview

Phase 3 introduces **programmatic API testing** through a modular, multi-package architecture. This design supports:

1. **Standalone mode** - Simple `.flow.js` files for teams new to testing
2. **Playwright integration** - For teams already using Playwright
3. **Multi-format collections** - HTTP Forge, Postman, Insomnia (pluggable parsers)
4. **Future adapters** - Jest, Vitest, etc.

> **Implementation Note:** We already have a working VS Code extension with `CollectionService`, `EnvironmentConfigService`, `HttpRequestService`, and full request resolution. Phase 3 **extracts** this proven code into `@http-forge/core` rather than building from scratch. The extension will then consume the core package as a dependency.

### 1.1 Product Positioning: Execution Engine

**HTTP Forge is an API Test Execution Engine**, not a collection editor.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     HTTP Forge = Execution Engine                            │
│                                                                             │
│   Collections come FROM:              Execute collections WITH:              │
│   ┌─────────────────────────┐        ┌─────────────────────────────────┐   │
│   │ • VS Code Extension     │        │ • @http-forge/standalone (CLI)  │   │
│   │ • CLI scaffolding       │   →    │ • @http-forge/playwright        │   │
│   │ • Manual JSON editing   │        │ • VS Code Extension (Quick Send)│   │
│   │ • Postman import        │        │ • CI/CD pipelines               │   │
│   │ • Insomnia import       │        └─────────────────────────────────┘   │
│   │ • OpenAPI generation    │                                               │
│   └─────────────────────────┘                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**This positioning means:**
- VS Code extension is **one of many** ways to create collections, not the only way
- Teams with existing Postman collections can migrate without rebuilding
- CI/CD environments work without any IDE
- Framework and plugin are **loosely coupled**

### 1.2 Collection Creation Methods

| Method | Best For | Availability |
|--------|----------|--------------|
| **VS Code Extension** | Visual editing, exploration | ✅ Phase 1-2 |
| **Manual JSON/YAML** | Simple cases, version control | ✅ Always |
| **CLI scaffolding** | Quick setup, scripting | 🔜 Phase 3 |
| **Postman import** | Migration from Postman | 🔜 Phase 4 |
| **Insomnia import** | Migration from Insomnia | 💡 Future |
| **OpenAPI generation** | API-first teams | 💡 Future |

#### CLI Scaffolding Commands (Phase 3)

```bash
# Initialize .forge directory structure
http-forge init

# Create a new collection (interactive)
http-forge new collection
http-forge new collection --name "my-api"

# Add request to collection
http-forge add request --collection "my-api" --name "login" \
    --method POST --url "{{baseUrl}}/auth/login"

# Add environment
http-forge add env --name "dev" --var "baseUrl=http://localhost:3000"

# Import from Postman (Phase 4)
http-forge import postman ./my-collection.postman.json

# Import from Insomnia (Future)
http-forge import insomnia ./insomnia-export.json
```

### 1.3 Framework Independence

The npm packages are **completely IDE-independent**:

```
┌─────────────────────────────────────────────────────────────┐
│       HTTP FORGE FRAMEWORK (npm packages)                   │
│                                                             │
│   @http-forge/core        ← Pure Node.js, no IDE deps       │
│   @http-forge/standalone  ← CLI runner, works in terminal   │
│   @http-forge/playwright  ← Playwright fixture              │
│                                                             │
│   Works in:                                                 │
│   • CI/CD pipelines (GitHub Actions, Jenkins, GitLab)       │
│   • Terminal / command line                                 │
│   • Any Node.js environment                                 │
│   • Any IDE (VS Code, WebStorm, Vim, etc.)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                    Optional: VS Code users get GUI
                              ▼
┌─────────────────────────────────────────────────────────────┐
│       VS CODE EXTENSION (optional GUI)                      │
│                                                             │
│   • Visual collection/request builder                       │
│   • One-click environment switching                         │
│   • Click-to-run flows with results panel                   │
│   • Tree view for collections & flows                       │
│                                                             │
│   Consumes @http-forge/core as dependency                   │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Package Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        http-forge (VS Code Extension)                    │
│   Collections UI │ Environments UI │ Quick Send │ Explorer               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ Uses
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      @http-forge/core (npm package)                      │
│   • CollectionLoader      - Load/parse collection JSON                   │
│   • EnvironmentResolver   - Variable substitution                        │
│   • RequestResolver       - Path to request resolution                   │
│   • HttpClient            - Execute HTTP requests                        │
└─────────────────────────────────────────────────────────────────────────┘
                          │                    │
              ┌───────────┘                    └───────────┐
              ▼                                            ▼
┌──────────────────────────────┐          ┌──────────────────────────────┐
│  @http-forge/standalone       │          │  @http-forge/playwright       │
│                              │          │                              │
│  • FlowRuntime (f object)    │          │  • Playwright fixture         │
│  • Jest-like expectations    │          │  • Uses Playwright's expect   │
│  • CLI runner                │          │  • Full Playwright features   │
│                              │          │                              │
│  For: Teams without          │          │  For: Teams already using     │
│       existing test framework│          │       Playwright              │
└──────────────────────────────┘          └──────────────────────────────┘
              │                                            │
              ▼                                            ▼
┌──────────────────────────────┐          ┌──────────────────────────────┐
│  flows/login.flow.js          │          │  tests/api/login.spec.ts      │
│                              │          │                              │
│  export default async (f) => {│          │  test('login', async ({forge})│
│    const res = await          │          │    => {                       │
│      f.send('auth/login');   │          │    const res = await          │
│    f.expect(res.status)       │          │      forge.send('auth/login');│
│      .toBe(200);             │          │    expect(res.status)         │
│  }                           │          │      .toBe(200);              │
└──────────────────────────────┘          └──────────────────────────────┘
```

### 1.5 User Personas & Recommendations

| User Type | Recommended Package | Why |
|-----------|---------------------|-----|
| Solo dev / Small team | `@http-forge/standalone` | Simple, no extra deps |
| Team new to API testing | `@http-forge/standalone` | Lower learning curve |
| Teams using Playwright | `@http-forge/playwright` | Leverage existing infra |
| Enterprise CI/CD | `@http-forge/playwright` | Mature reporting |

### 1.6 Feature Comparison

| Feature | Standalone | Playwright |
|---------|------------|------------|
| Learning curve | ⭐ Easiest | Medium |
| Extra dependencies | None | `@playwright/test` |
| File format | `.flow.js` | `.spec.ts` |
| Parallel execution | ❌ (v1) | ✅ Built-in |
| Retries | ❌ (v1) | ✅ Built-in |
| HTML reports | Basic | ✅ Rich |
| Trace viewer | ❌ | ✅ Built-in |
| TypeScript | Optional | Native |
| Best for | Exploration, simple tests | Full test suites |

---

## 2. Why Collections + Flows? (vs Pure Code Frameworks)

### 2.1 Target Audience: Mixed QA/Dev Teams

HTTP Forge is designed for teams where **developers and QA engineers collaborate** on API testing. Pure code frameworks (Jest, Supertest, Playwright) work well for developer-only teams, but create barriers for QA:

| Pure Code Approach | HTTP Forge Approach |
|--------------------|---------------------|
| QA must understand fetch/axios config | QA uses visual request builder |
| QA must know environment setup | One-click environment switching |
| Auth complexity exposed in tests | Auth hidden in collection pre-scripts |
| Steep learning curve | Progressive: explore → automate |

### 2.2 Collections as Abstraction Layer

**The key insight:** Collections hide HTTP complexity so tests focus on **business logic**.

**Without HTTP Forge (QA has to understand):**
```typescript
const response = await fetch(`${process.env.BASE_URL}/api/v2/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Version': '2.1.0',
    'X-Request-ID': uuid()
  },
  body: JSON.stringify({
    username: credentials.user,
    password: credentials.pass,
    mfaToken: await getMfaToken()
  })
});
```

**With HTTP Forge (either standalone or Playwright):**
```javascript
// Standalone (.flow.js)
const res = await f.send('auth-api/login');
f.expect(res.status).toBe(200);

// Playwright (.spec.ts)
const res = await forge.send('auth-api/login');
expect(res.status).toBe(200);
```

The complexity (headers, auth, environment URLs) lives in the **collection**, not the test.

### 2.3 Team Workflow

| Actor | Activity | Tool |
|-------|----------|------|
| **Dev** | Defines complex auth, headers, dynamic values | Collection UI |
| **Dev** | Sets up environments (dev/staging/prod) | Environment UI |
| **QA** | Explores API, sees real responses | Collection UI |
| **QA** | Writes test scenarios | Standalone flows or Playwright |
| **Both** | Reviews changes | Git diff on JSON/JS/TS |

---

## 3. Shared Design Decisions (All Adapters)

These decisions apply to **both** standalone and Playwright adapters (where applicable).

### 3.1 Summary Table

| Decision | Choice | Applies To |
|----------|--------|------------|
| Request reference | Path string + ID fallback | All adapters |
| Request overrides | Second param object | All adapters |
| Variable scope | 2 layers: `set/get` + `env` | All adapters |
| File format | ES Module (`.flow.js`) | Standalone only |
| Assertions | Jest-like | Standalone only |
| Error handling | Fail fast + soft assertions | Standalone only |

*Note: Playwright adapter uses Playwright's native `expect()` and test structure.*

### 3.2 Request Reference: Path String + ID Fallback

```javascript
// Primary: Path string (readable, matches folder structure)
await f.send('forgerock-login/auth/login');

// Fallback: ID reference (stable, won't break on rename)
await f.send('#req_abc123');
```

**Why**:
- Path string is human-readable and matches what you see in the tree
- ID reference provides stability if you rename things
- Simple string interface, no complex object syntax

### 3.3 Request Overrides

The collection defines the **base request**, but tests can override any part:

```javascript
// Override body (most common)
const res = await f.send('user-api/auth/login', {
    body: {
        username: 'testuser',
        password: 'secret123'
    }
});

// Override headers
const res = await f.send('user-api/profile', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'X-Custom-Header': 'value'
    }
});

// Override query parameters (?page=2&limit=10)
const res = await f.send('user-api/list-users', {
    query: {
        page: '2',
        limit: '10',
        filter: 'active'
    }
});

// Override path parameters (e.g., /users/:userId -> /users/123)
const res = await f.send('user-api/get-user', {
    params: {
        userId: '123'
    }
});

// Override multiple things at once
const res = await f.send('user-api/update-user', {
    params: { userId: '123' },
    headers: { 'Authorization': `Bearer ${token}` },
    body: { name: 'New Name', email: 'new@example.com' }
});

// Even override method or URL entirely (rare)
const res = await f.send('user-api/resource', {
    method: 'PATCH',  // Override POST to PATCH
    url: 'https://different-server.com/api'  // Override entire URL
});
```

**Why**:
- Collection defines the "template" (URL structure, default headers, auth)
- Flow provides the **test-specific data**
- Separation of concerns: infra vs test logic

### 3.4 Assertion Style: Jest-like

```javascript
f.expect(res.status).toBe(200);
f.expect(res.body).toHaveProperty('token');
f.expect(res.time).toBeLessThan(1000);
```

**Why**:
- Most developers already know Jest
- Chainable, expressive, easy to read
- Good error messages built-in
- Industry standard

### 3.5 Variable Scope: Two Layers Only

```javascript
// Layer 1: Flow variables (temporary, this flow only)
f.set('token', response.body.token);
const token = f.get('token');

// Layer 2: Environment variables (persistent, shared)
f.env.get('baseUrl');
f.env.set('lastToken', token); // Saves to environment file
```

**Why**:
- Three layers (flow/session/env) is confusing
- "Session" concept is unclear - when does it start/end?
- Two layers are sufficient:
  - Temporary (within flow) → `f.set/get`
  - Persistent (shared) → `f.env.set/get`

### 3.6 Error Handling: Fail Fast with Escape Hatch

```javascript
// Default: Assertion failure stops the flow
f.expect(res.status).toBe(200); // Stops here if fails

// Escape hatch: Soft assertion (logs but continues)
f.expect.soft(res.body.name).toBe('John'); // Logs failure, continues

// Manual control with try-catch
try {
    const res = await f.send('risky/request');
} catch (e) {
    f.log('Request failed, trying fallback...');
}
```

**Why**:
- Fail-fast catches bugs early
- `expect.soft()` for when you want to collect all failures
- Users can use standard try-catch for full control

### 3.7 Script Execution: Default On, Optional Skip

`f.send()` **默认执行** collection/folder/request 三层 scripts，与 VS Code Quick Send 行为一致。

**Script 继承层次：**

```
┌─────────────────────────────────────────────────────────────┐
│                      Collection                              │
│   pre-request: "添加 API Key header"                         │
│   post-response: "检查 rate limit"                           │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                    Folder: /auth                     │   │
│   │   pre-request: "添加 timestamp"                      │   │
│   │   post-response: "保存 token"                        │   │
│   │                                                     │   │
│   │   ┌─────────────────────────────────────────────┐   │   │
│   │   │              Request: login                  │   │   │
│   │   │   pre-request: "生成 nonce"                  │   │   │
│   │   │   post-response: "验证 response schema"      │   │   │
│   │   └─────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**执行顺序：**

| Phase | Order | Example |
|-------|-------|---------|
| Pre-request | Collection → Folder → Request | API Key → timestamp → nonce |
| HTTP Request | - | `POST /auth/login` |
| Post-response | Request → Folder → Collection | schema验证 → 保存token → rate limit |

**API 设计：**

```javascript
// 默认：执行所有 scripts（与 VS Code 行为一致）
const res = await f.send('auth/login');

// 跳过所有 scripts
const res = await f.send('auth/login', { 
    skipScripts: true 
});

// 细粒度控制
const res = await f.send('auth/login', { 
    skipPreScripts: true,   // 跳过 pre-request scripts
    skipPostScripts: true   // 跳过 post-response scripts
});

// 跳过特定层级（高级用法）
const res = await f.send('auth/login', { 
    skipScripts: ['collection', 'folder']  // 只执行 request 级别 scripts
});
```

**Why**:
- **一致性**：与 VS Code Quick Send、Postman 行为一致
- **DRY**：Auth 逻辑在 collection 定义一次，所有 flows 复用
- **灵活性**：测试 script 本身时可跳过
- **可调试**：跳过 scripts 可隔离问题

---

## 4. SOLID Implementation Plan

> **详细的 SOLID 架构设计已移至单独文档**
>
> 请参阅 [PHASE-3-IMPLEMENTATION.md](./PHASE-3-IMPLEMENTATION.md) 了解：
> - 核心接口定义（`ICollectionParser`, `IEnvironmentStore`, `IHttpClient`, 等）
> - 服务实现（`ParserRegistry`, `CollectionLoader`, `ScriptPipeline`, 等）
> - 依赖注入容器（`ForgeContainer`）
> - 文件结构和测试策略
> - 扩展点汇总

---

# Part I: Framework Packages (IDE-Independent)

> **Sections 5-7** describe the npm packages that work in any environment - CI/CD, terminal, any IDE. No VS Code required.

---

## 5. Package: @http-forge/core

The **core package** provides shared functionality used by all adapters and the VS Code extension.

> **Note:** The SOLID architecture design in Section 4 defines the interfaces and patterns. This section provides quick reference for the core package structure.

> **Source:** Extract from existing VS Code extension services:
> - `CollectionService` → `CollectionLoader`
> - `EnvironmentConfigService` → `EnvironmentResolver`
> - `HttpRequestService` → `HttpClient`
> - Request path resolution logic → `RequestResolver`

### 5.1 Multi-Format Collection Support

See **Section 4.1-4.4** for detailed architecture. Key point: pluggable `ICollectionParser` interface.

| Format | File Pattern | Status |
|--------|--------------|--------|
| HTTP Forge | `*.forge.json` | ✅ Phase 3 |
| Postman v2.1 | `*.postman_collection.json` | 💡 Future |
| Insomnia | `*.insomnia.json` | 💡 Future |

### 5.2 Key Components

| Component | Interface | Implementation |
|-----------|-----------|----------------|
| `CollectionLoader` | N/A (Facade) | Orchestrates parsers |
| `ParserRegistry` | `ICollectionParser` | Register/find parsers |
| `EnvironmentResolver` | `IEnvironmentStore` | Load/resolve variables |
| `RequestExecutor` | N/A (Facade) | Execute with scripts |
| `ScriptPipeline` | `IScriptRunner` | Pre/post script execution |

### 5.3 Public API

```typescript
// packages/core/src/index.ts - Public exports

// Interfaces (for extension)
export * from './interfaces';

// Main classes
export { ForgeContainer } from './container';
export { CollectionLoader } from './services/collection-loader';
export { EnvironmentResolver } from './services/environment-resolver';
export { RequestExecutor } from './services/request-executor';
export { ParserRegistry } from './services/parser-registry';

// Parsers
export { HttpForgeParser } from './parsers/http-forge-parser';

// Factory function (recommended)
export function createForge(forgeRoot: string): RequestExecutor {
    const container = ForgeContainer.createDefault(forgeRoot);
    return container.resolve('requestExecutor');
}
```

---

## 6. Package: @http-forge/standalone

The **standalone package** provides the `.flow.js` execution environment for teams without an existing test framework.

### 6.1 Features

- ES Module `.flow.js` files
- Jest-like assertion library (`f.expect()`)
- Flow-scoped variables (`f.set/get`)
- CLI runner for CI/CD
- VS Code integration (tree view, results panel)

### 6.2 File Structure

```
packages/standalone/
├── src/
│   ├── index.ts                    # Public exports
│   ├── flow-runtime.ts             # The 'f' object
│   ├── flow-executor.ts            # Execute flows
│   ├── flow-discovery.ts           # Find .flow.js files
│   ├── expectation.ts              # Jest-like assertions
│   └── cli.ts                      # CLI runner
├── package.json                    # depends on @http-forge/core
└── tsconfig.json

# User's project
flows/
├── login.flow.js
├── checkout.flow.js
└── user-profile.flow.js
```

### 6.3 FlowAPI Interface (Standalone)

```typescript
// packages/standalone/src/interfaces.ts

import { RequestOverrides, ForgeResponse } from '@http-forge/core';

/**
 * Metadata about a discovered Flow file
 */
export interface FlowInfo {
    id: string;
    name: string;
    filePath: string;
    relativePath: string;
    lastModified: number;
}

/**
 * Flow function signature - what user exports
 */
export type FlowFunction = (f: FlowAPI) => Promise<void>;

/**
 * The 'f' object passed to flow functions
 */
export interface FlowAPI {
    // ===== Environment =====
    use(environmentName: string): void;
    env: {
        get(key: string): string | undefined;
        set(key: string, value: string): void;
        all(): Record<string, string>;
    };

    // ===== Request Execution =====
    send(pathOrId: string, overrides?: RequestOverrides): Promise<ForgeResponse>;

    // ===== Flow Variables =====
    set(key: string, value: any): void;
    get(key: string): any;

    // ===== Assertions (standalone only) =====
    expect(value: any): Expectation;
    expect: {
        (value: any): Expectation;
        soft(value: any): Expectation;
    };
    
    // ===== Utilities =====
    log(...args: any[]): void;
    sleep(ms: number): Promise<void>;
    info: FlowInfo;
}

/**
 * Jest-like expectation chain
 */
export interface Expectation {
    not: Expectation;
    toBe(expected: any): void;
    toEqual(expected: any): void;
    toContain(item: any): void;
    toBeLessThan(max: number): void;
    toBeGreaterThan(min: number): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeNull(): void;
    toMatch(pattern: RegExp | string): void;
    toHaveLength(length: number): void;
    toHaveProperty(path: string, value?: any): void;
}
```

### 6.4 Example Standalone Flow

```javascript
// flows/login-test.flow.js

export default async function(f) {
    f.use('staging');
    f.log('Starting login test...');
    
    // Login
    const login = await f.send('auth-api/login', {
        body: { username: 'testuser', password: 'secret123' }
    });
    
    f.expect(login.status).toBe(200);
    f.expect(login.body).toHaveProperty('accessToken');
    
    // Store token for subsequent requests
    f.set('token', login.body.accessToken);
    
    // Get profile with auth
    const profile = await f.send('auth-api/profile', {
        headers: { Authorization: `Bearer ${f.get('token')}` }
    });
    
    f.expect(profile.status).toBe(200);
    f.expect(profile.body.email).toContain('@');
    
    // Soft assertions (continue even if fail)
    f.expect.soft(profile.body.avatar).toBeDefined();
    
    f.log('Login test completed!');
}
```

### 6.5 CLI Runner

```bash
# Install
npm install @http-forge/standalone

# Run all flows
npx http-forge run

# Run specific flow
npx http-forge run flows/login-test.flow.js

# Run with environment
npx http-forge run --env production

# Output formats
npx http-forge run --format json > results.json
npx http-forge run --format junit > results.xml
```

```typescript
// packages/standalone/src/cli.ts

import { program } from 'commander';
import { FlowExecutor } from './flow-executor';
import { FlowDiscovery } from './flow-discovery';

program
    .name('http-forge')
    .description('Run HTTP Forge flows')
    .version('1.0.0');

program
    .command('run [patterns...]')
    .description('Run flows matching patterns')
    .option('-e, --env <environment>', 'Environment to use')
    .option('-f, --format <format>', 'Output format: text, json, junit', 'text')
    .option('--fail-fast', 'Stop on first failure')
    .action(async (patterns, options) => {
        const discovery = new FlowDiscovery('./http-forge');
        const executor = new FlowExecutor('./http-forge');
        
        const flows = discovery.findFlows(patterns);
        const results = [];
        
        for (const flow of flows) {
            const result = await executor.run(flow, {
                environment: options.env,
                stopOnError: options.failFast
            });
            results.push(result);
            
            if (!result.passed && options.failFast) break;
        }
        
        outputResults(results, options.format);
        process.exit(results.every(r => r.passed) ? 0 : 1);
    });

program.parse();
```

---

## 7. Package: @http-forge/playwright

The **Playwright package** provides a fixture for teams already using Playwright.

### 7.1 Features

- Playwright fixture (`forge`)
- Uses Playwright's native `expect()`
- Uses Playwright's `request` context
- Full Playwright features: parallel, retries, reporters
- TypeScript native

### 7.2 File Structure

```
packages/playwright/
├── src/
│   ├── index.ts                    # Exports test, expect, forge
│   └── fixture.ts                  # Playwright fixture definition
├── package.json                    # depends on @http-forge/core, @playwright/test
└── tsconfig.json

# User's project
tests/api/
├── auth.spec.ts
├── users.spec.ts
└── orders.spec.ts
```

### 7.3 Fixture Implementation

```typescript
// packages/playwright/src/fixture.ts

import { test as base, expect, APIRequestContext } from '@playwright/test';
import { 
    CollectionLoader, 
    EnvironmentResolver, 
    RequestOverrides,
    ForgeResponse 
} from '@http-forge/core';

interface ForgeAPI {
    use(environment: string): void;
    send(pathOrId: string, overrides?: RequestOverrides): Promise<ForgeResponse>;
    env: {
        get(key: string): string | undefined;
        set(key: string, value: string): void;
        all(): Record<string, string>;
    };
    set(key: string, value: any): void;
    get(key: string): any;
}

interface ForgeFixtures {
    forge: ForgeAPI;
}

export const test = base.extend<ForgeFixtures>({
    forge: async ({ request }, use) => {
        const forgeRoot = process.env.FORGE_ROOT || './http-forge';
        const loader = new CollectionLoader(forgeRoot);
        const resolver = new EnvironmentResolver(forgeRoot);
        const variables = new Map<string, any>();

        const api: ForgeAPI = {
            use(environment: string) {
                resolver.use(environment);
            },

            async send(pathOrId: string, overrides?: RequestOverrides) {
                const startTime = Date.now();
                
                // Resolve request from collection
                const reqDef = pathOrId.startsWith('#')
                    ? loader.getRequestById(pathOrId)
                    : loader.getRequestByPath(pathOrId);
                    
                if (!reqDef) {
                    throw new Error(`Request not found: ${pathOrId}`);
                }

                // Merge with overrides
                const finalReq = {
                    method: overrides?.method || reqDef.method,
                    url: resolver.resolveString(overrides?.url || reqDef.url),
                    headers: { ...reqDef.headers, ...overrides?.headers },
                    body: overrides?.body !== undefined ? overrides.body : reqDef.body
                };

                // Apply path params
                if (overrides?.params) {
                    for (const [key, value] of Object.entries(overrides.params)) {
                        finalReq.url = finalReq.url.replace(`:${key}`, value);
                    }
                }

                // Apply query params
                if (overrides?.query) {
                    const url = new URL(finalReq.url);
                    for (const [key, value] of Object.entries(overrides.query)) {
                        url.searchParams.set(key, value);
                    }
                    finalReq.url = url.toString();
                }

                // Execute with Playwright's request context
                const response = await request.fetch(finalReq.url, {
                    method: finalReq.method,
                    headers: finalReq.headers,
                    data: finalReq.body
                });

                const body = await response.json().catch(() => response.text());

                return {
                    status: response.status(),
                    statusText: response.statusText(),
                    headers: response.headers(),
                    body,
                    time: Date.now() - startTime,
                    cookies: {},  // Playwright handles cookies automatically
                    request: {
                        method: finalReq.method,
                        url: finalReq.url,
                        headers: finalReq.headers,
                        body: finalReq.body
                    }
                };
            },

            env: {
                get: (key) => resolver.get(key),
                set: (key, value) => resolver.set(key, value),
                all: () => resolver.all()
            },

            set(key: string, value: any) {
                variables.set(key, value);
            },

            get(key: string) {
                return variables.get(key);
            }
        };

        await use(api);
    }
});

export { expect } from '@playwright/test';
```

### 7.4 Example Playwright Test

```typescript
// tests/api/auth.spec.ts

import { test, expect } from '@http-forge/playwright';

test.describe('Auth API', () => {
    test.beforeEach(async ({ forge }) => {
        forge.use('staging');
    });

    test('login with valid credentials', async ({ forge }) => {
        const res = await forge.send('auth-api/login', {
            body: { username: 'testuser', password: 'secret123' }
        });

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        expect(res.time).toBeLessThan(2000);
    });

    test('login with invalid credentials', async ({ forge }) => {
        const res = await forge.send('auth-api/login', {
            body: { username: 'wrong', password: 'wrong' }
        });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid credentials');
    });

    test('profile requires authentication', async ({ forge }) => {
        // First login
        const login = await forge.send('auth-api/login', {
            body: { username: 'testuser', password: 'secret123' }
        });
        
        forge.set('token', login.body.accessToken);

        // Then get profile
        const profile = await forge.send('auth-api/profile', {
            headers: { Authorization: `Bearer ${forge.get('token')}` }
        });

        expect(profile.status).toBe(200);
        expect(profile.body.username).toBe('testuser');
    });

    test('CRUD operations', async ({ forge }) => {
        // Create
        const created = await forge.send('users-api/create-user', {
            body: { name: 'Test User', email: 'test@example.com' }
        });
        expect(created.status).toBe(201);
        
        const userId = created.body.id;
        forge.set('userId', userId);

        // Read
        const fetched = await forge.send('users-api/get-user', {
            params: { userId }
        });
        expect(fetched.status).toBe(200);
        expect(fetched.body.name).toBe('Test User');

        // Update
        const updated = await forge.send('users-api/update-user', {
            params: { userId },
            body: { name: 'Updated User' }
        });
        expect(updated.status).toBe(200);

        // Delete
        const deleted = await forge.send('users-api/delete-user', {
            params: { userId }
        });
        expect(deleted.status).toBe(204);
    });
});
```

### 7.5 Running Playwright Tests

```bash
# Install
npm install @http-forge/playwright @playwright/test

# Run all API tests
npx playwright test tests/api/

# Run specific test
npx playwright test tests/api/auth.spec.ts

# With environment variable
FORGE_ENV=production npx playwright test

# Generate HTML report
npx playwright test --reporter=html

# Run in parallel
npx playwright test --workers=4
```

### 7.6 Playwright Configuration

```typescript
// playwright.config.ts

import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/api',
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 4 : undefined,
    reporter: [
        ['html'],
        ['json', { outputFile: 'test-results.json' }]
    ],
    use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
        extraHTTPHeaders: {
            'Accept': 'application/json'
        }
    },
    projects: [
        {
            name: 'api-tests',
            testMatch: '**/*.spec.ts'
        }
    ]
});
```

---

# Part II: VS Code Extension (Optional GUI)

> **Section 8** describes the optional VS Code extension. Users who prefer CLI or other IDEs can skip this section entirely.

---

## 8. VS Code Extension Integration

After extraction, the VS Code extension is **refactored** to consume `@http-forge/core` as a dependency instead of containing the logic directly. This eliminates code duplication and ensures consistency across all packages.

> **Note:** The VS Code extension is **optional**. All framework functionality is available via CLI and npm packages. The extension provides a GUI for users who prefer visual tools.

> **Refactoring Strategy:**
> 1. Move core logic to `@http-forge/core` package
> 2. Replace `CollectionService` with thin wrapper around `CollectionLoader`
> 3. Replace `EnvironmentConfigService` with thin wrapper around `EnvironmentResolver`
> 4. VS Code-specific features (tree providers, panels) remain in extension
> 5. Extension adds VS Code workspace awareness to core classes

### 8.1 Components

```
packages/vscode/
├── src/
│   ├── extension.ts
│   ├── services/
│   │   └── flow-service.ts          # Uses @http-forge/standalone
│   ├── providers/
│   │   └── flows-tree-provider.ts   # Tree view for flows
│   ├── panels/
│   │   └── flow-results-panel.ts    # WebView for results
│   └── commands/
│       └── flow-commands.ts
└── package.json
```

### 8.2 FlowsTreeProvider

```typescript
// packages/vscode/src/providers/flows-tree-provider.ts

import * as vscode from 'vscode';
import { FlowDiscovery } from '@http-forge/standalone';

export class FlowTreeItem extends vscode.TreeItem {
    constructor(
        public readonly flow: FlowInfo,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(flow.name, collapsibleState);
        this.tooltip = flow.relativePath;
        this.contextValue = 'flow';
        this.iconPath = new vscode.ThemeIcon('beaker');
        this.command = {
            command: 'vscode.open',
            title: 'Open Flow',
            arguments: [vscode.Uri.file(flow.filePath)]
        };
    }
}

export class FlowsTreeProvider implements vscode.TreeDataProvider<FlowTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<FlowTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private flowDiscovery: FlowDiscovery) {
        flowDiscovery.watch(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: FlowTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<FlowTreeItem[]> {
        const flows = this.flowDiscovery.findFlows();
        return Promise.resolve(
            flows.map(flow => new FlowTreeItem(flow, vscode.TreeItemCollapsibleState.None))
        );
    }
}
```

### 8.3 Commands

```typescript
// packages/vscode/src/commands/flow-commands.ts

import * as vscode from 'vscode';
import { FlowExecutor } from '@http-forge/standalone';
import { FlowResultsPanel } from '../panels/flow-results-panel';

export function registerFlowCommands(
    context: vscode.ExtensionContext,
    executor: FlowExecutor
): void {
    // Run Flow
    context.subscriptions.push(
        vscode.commands.registerCommand('httpForge.runFlow', async (item?: FlowTreeItem) => {
            const flowPath = item?.flow.filePath || await selectFlow();
            if (!flowPath) return;

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Running Flow...',
                cancellable: true
            }, async (progress) => {
                const result = await executor.run(flowPath, {
                    onProgress: (step) => {
                        progress.report({ message: `${step.type}: ${step.name}` });
                    }
                });
                FlowResultsPanel.show(context.extensionUri, result);
            });
        })
    );

    // Run Flow with Environment
    context.subscriptions.push(
        vscode.commands.registerCommand('httpForge.runFlowWithEnv', async (item?: FlowTreeItem) => {
            const env = await vscode.window.showQuickPick(
                environmentService.getNames(),
                { placeHolder: 'Select environment' }
            );
            if (!env) return;

            // ... similar to above with environment option
        })
    );

    // New Flow
    context.subscriptions.push(
        vscode.commands.registerCommand('httpForge.newFlow', async () => {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter flow name',
                placeHolder: 'my-test'
            });
            if (!name) return;

            const template = `// ${name} Flow
export default async function(f) {
    f.use('dev');
    
    // const res = await f.send('collection/request');
    // f.expect(res.status).toBe(200);
    
    f.log('Flow completed!');
}
`;
            const flowPath = path.join(flowsDir, `${name}.flow.js`);
            fs.writeFileSync(flowPath, template);
            
            const doc = await vscode.workspace.openTextDocument(flowPath);
            await vscode.window.showTextDocument(doc);
        })
    );
}
```

### 8.4 Package.json Contributions

```json
{
  "contributes": {
    "views": {
      "httpForge": [
        {
          "id": "httpForge.flows",
          "name": "Flows",
          "icon": "$(beaker)"
        }
      ]
    },
    "commands": [
      {
        "command": "httpForge.runFlow",
        "title": "Run Flow",
        "icon": "$(play)"
      },
      {
        "command": "httpForge.runFlowWithEnv",
        "title": "Run Flow with Environment...",
        "icon": "$(server-environment)"
      },
      {
        "command": "httpForge.newFlow",
        "title": "New Flow",
        "icon": "$(add)"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "httpForge.newFlow",
          "when": "view == httpForge.flows",
          "group": "navigation"
        }
      ],
      "view/item/context": [
        {
          "command": "httpForge.runFlow",
          "when": "view == httpForge.flows && viewItem == flow",
          "group": "1_run@1"
        },
        {
          "command": "httpForge.runFlowWithEnv",
          "when": "view == httpForge.flows && viewItem == flow",
          "group": "1_run@2"
        }
      ],
      "editor/context": [
        {
          "command": "httpForge.runFlow",
          "when": "resourceExtname == .flow.js",
          "group": "httpforge@1"
        }
      ]
    }
  }
}
```

---

## 9. Monorepo Structure

### 8.1 Directory Layout

```
http-forge/
├── packages/
│   ├── core/                        # @http-forge/core
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── standalone/                  # @http-forge/standalone
│   │   ├── src/
│   │   ├── package.json             # depends on @http-forge/core
│   │   └── tsconfig.json
│   │
│   ├── playwright/                  # @http-forge/playwright
│   │   ├── src/
│   │   ├── package.json             # depends on @http-forge/core, @playwright/test
│   │   └── tsconfig.json
│   │
│   └── vscode/                      # http-forge (VS Code extension)
│       ├── src/
│       ├── package.json             # depends on @http-forge/core, @http-forge/standalone
│       └── tsconfig.json
│
├── package.json                     # Workspace root
├── pnpm-workspace.yaml              # or npm workspaces
└── tsconfig.base.json
```

### 8.2 Package Dependencies

```
┌─────────────────┐
│ @http-forge/core │◄────────────────────────────────────┐
└────────┬────────┘                                      │
         │                                               │
    ┌────┴────┐                                          │
    │         │                                          │
    ▼         ▼                                          │
┌───────────────────┐    ┌───────────────────┐    ┌─────┴─────────┐
│@http-forge/       │    │@http-forge/       │    │ http-forge    │
│standalone         │    │playwright         │    │ (VS Code)     │
└───────────────────┘    └───────────────────┘    └───────────────┘
         │                        │
         │                        │
         ▼                        ▼
   @playwright/test          User's project
   (peer dependency)
```

### 8.3 Root package.json

```json
{
  "name": "http-forge-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "publish:all": "pnpm -r publish --access public"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## 10. Implementation Checklist

### Phase 3a: Extract @http-forge/core

| Task | Source → Target | Priority |
|------|-----------------|----------|
| Create monorepo structure | N/A → `packages/` | P0 |
| Extract CollectionLoader | `src/services/collection-service.ts` → `packages/core/src/collection-loader.ts` | P0 |
| Extract EnvironmentResolver | `src/services/environment-config-service.ts` → `packages/core/src/environment-resolver.ts` | P0 |
| Extract RequestResolver | `src/services/collection-service.ts` (path resolution) → `packages/core/src/request-resolver.ts` | P0 |
| Extract HttpClient | `src/services/http-request-service.ts` → `packages/core/src/http-client.ts` | P0 |
| Extract shared interfaces | `src/interfaces/` → `packages/core/src/interfaces.ts` | P0 |
| Add tests for core | Port existing tests → `packages/core/src/__tests__/` | P1 |

### Phase 3b: Build @http-forge/standalone

| Task | File | Priority |
|------|------|----------|
| Implement FlowRuntime | `packages/standalone/src/flow-runtime.ts` | P0 |
| Implement FlowExecutor | `packages/standalone/src/flow-executor.ts` | P0 |
| Implement Expectation library | `packages/standalone/src/expectation.ts` | P0 |
| Implement CLI | `packages/standalone/src/cli.ts` | P1 |
| Add tests | `packages/standalone/src/__tests__/` | P1 |

### Phase 3c: Build @http-forge/playwright

| Task | File | Priority |
|------|------|----------|
| Implement Playwright fixture | `packages/playwright/src/fixture.ts` | P0 |
| Export test/expect | `packages/playwright/src/index.ts` | P0 |
| Add example tests | `packages/playwright/examples/` | P1 |
| Write documentation | `packages/playwright/README.md` | P1 |

### Phase 3d: Refactor VS Code Extension

| Task | Change | Priority |
|------|--------|----------|
| Add @http-forge/core dependency | `package.json` | P0 |
| Replace CollectionService internals | Import from `@http-forge/core`, wrap with VS Code workspace awareness | P0 |
| Replace EnvironmentConfigService internals | Import from `@http-forge/core`, add VS Code file watchers | P0 |
| Replace HttpRequestService internals | Import from `@http-forge/core`, add response panel integration | P0 |
| Add @http-forge/standalone dependency | `package.json` | P1 |
| Add FlowsTreeProvider | New tree provider using `FlowDiscovery` from standalone | P1 |
| Add flow commands | `src/commands/flow-commands.ts` (run, debug, create) | P1 |
| Add FlowResultsPanel | WebView for displaying flow results | P1 |

---

## 11. Documentation (README samples)

### 10.1 Main README

```markdown
# HTTP Forge

A VS Code extension and npm packages for API testing.

## Quick Start

### Option 1: VS Code Extension (Recommended for beginners)

1. Install "HTTP Forge" from VS Code marketplace
2. Create collections and environments visually
3. Write `.flow.js` files for test automation

### Option 2: Standalone CLI

\`\`\`bash
npm install @http-forge/standalone
npx http-forge run flows/
\`\`\`

### Option 3: Playwright Integration

\`\`\`bash
npm install @http-forge/playwright
\`\`\`

\`\`\`typescript
import { test, expect } from '@http-forge/playwright';

test('my api test', async ({ forge }) => {
    const res = await forge.send('auth-api/login');
    expect(res.status).toBe(200);
});
\`\`\`
```

### 10.2 Standalone README

```markdown
# @http-forge/standalone

Run HTTP Forge flows without external test frameworks.

## Installation

\`\`\`bash
npm install @http-forge/standalone
\`\`\`

## Usage

\`\`\`javascript
// flows/my-test.flow.js
export default async function(f) {
    f.use('staging');
    
    const res = await f.send('auth-api/login', {
        body: { username: 'test', password: 'secret' }
    });
    
    f.expect(res.status).toBe(200);
}
\`\`\`

\`\`\`bash
npx http-forge run flows/my-test.flow.js
\`\`\`
```

### 10.3 Playwright README

```markdown
# @http-forge/playwright

Playwright fixture for HTTP Forge collections.

## Installation

\`\`\`bash
npm install @http-forge/playwright @playwright/test
\`\`\`

## Usage

\`\`\`typescript
import { test, expect } from '@http-forge/playwright';

test('login flow', async ({ forge }) => {
    forge.use('staging');
    
    const res = await forge.send('auth-api/login', {
        body: { username: 'test', password: 'secret' }
    });
    
    expect(res.status).toBe(200);
});
\`\`\`
```

---

## 12. Technical Considerations

### 11.1 ES Module Support

Both standalone and Playwright adapters use ES modules:
- `@http-forge/standalone`: Dynamic `import()` for `.flow.js` files
- `@http-forge/playwright`: Native TypeScript/ESM support

### 11.2 Environment Variables

```bash
# Shared across all adapters
FORGE_ROOT=./http-forge          # Path to http-forge folder
FORGE_ENV=staging                # Default environment

# Playwright specific
API_BASE_URL=http://localhost:3000
```

### 11.3 Workspace Module Imports

For standalone flows that import workspace modules:

```javascript
// flows/test.flow.js
import { generateUser } from '../src/test-utils/generators.js';

export default async function(f) {
    const user = generateUser();
    await f.send('users-api/create', { body: user });
}
```

---

## 13. Future Enhancements

| Feature | Package | Priority | Notes |
|---------|---------|----------|-------|
| **Postman collection parser** | core | 🔥 High | Architecture ready, implement `CollectionParser` |
| **Data-driven flows (CSV/JSON)** | standalone | 🔥 High | Common testing need |
| Insomnia collection parser | core | Medium | Same pattern as Postman |
| OpenAPI import | core | Medium | Generate collections from spec |
| Flow debugging (breakpoints) | standalone, vscode | Medium | VS Code debugger integration |
| Parallel flow execution | standalone | Medium | Performance for large suites |
| HTML report generator | standalone | Medium | CI/CD reporting |
| `@http-forge/jest` adapter | New package | Low | For Jest users |
| `@http-forge/vitest` adapter | New package | Low | For Vitest users |
