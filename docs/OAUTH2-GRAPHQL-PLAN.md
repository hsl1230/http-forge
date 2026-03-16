# OAuth 2.0 完整支持 & GraphQL 增强 — 实施方案

> **Status:** Phase 1 (OAuth 2.0) — ✅ Implemented in v0.11.0 | Phase 2 (GraphQL Enhancement) — ✅ Implemented in v0.11.0  
> **Date:** 2026-03-03  
> **Goal:** 补齐 Thunder Client 的 OAuth 2.0 和 GraphQL 功能差距，使 HTTP Forge 成为完整的 API 开发平台

---

## 现状评估

### OAuth 2.0 — 半实现状态

| 层级 | 现状 | 差距 |
|------|------|------|
| **类型定义** | ✅ `OAuth2Config` 已有 4 种 grant type | ✅ Implemented |
| **后端执行** | ✅ 所有 4 种 grant type 完整实现（含浏览器交互式授权流） | ✅ Implemented |
| **前端 UI** | ✅ Auth tab 完整 OAuth2 表单（动态 grant type 切换、高级选项） | ✅ Implemented |
| **Token 管理** | ✅ 内存缓存 + SecretStorage 持久化 + 自动刷新 | ✅ Implemented |
| **PKCE** | ✅ S256 和 plain 方法 | ✅ Implemented |

### GraphQL — 完整实现 ✅

| 层级 | 现状 | 差距 |
|------|------|------|
| **Body 类型** | ✅ `graphql` body type 完整支持 | — |
| **Query 编辑器** | ✅ Monaco editor (query + variables) + Monarch 语法高亮 | ✅ Implemented |
| **发送执行** | ✅ `application/json`，`encodeGraphQLBody()` | — |
| **Schema Introspection** | ✅ 一键获取 + 缓存 per endpoint URL | ✅ Implemented |
| **自动补全** | ✅ 7 种上下文 (fields/args/enums/directives/fragments/variables/root) + 本地参数补全 | ✅ Implemented |
| **Schema Explorer** | ✅ 类型树 + 搜索 + 展开/折叠 + 点击插入 | ✅ Implemented |
| **Operation 选择** | ✅ 多操作下拉 + `operationName` | ✅ Implemented |

---

## 方案设计

### 整体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                     Request Tester Webview                        │
│                                                                  │
│  Auth Tab:                     Body Tab → GraphQL:               │
│  ┌────────────────────────┐   ┌────────────────────────────────┐ │
│  │ Type: [OAuth 2.0    ▼] │   │ Toolbar: [⟳ Fetch] [🔍] [Op▼] │ │
│  │                        │   │ ┌──────┬───────────────────┐   │ │
│  │ Grant: [Auth Code+PKCE]│   │ │Query │ query {  ← 补全   │   │ │
│  │ Auth URL: [...]        │   │ │  ⟩   │   users { ← 高亮  │   │ │
│  │ Token URL: [...]       │   │ │      │     id             │   │ │
│  │ Client ID: [...]       │   │ │──────│     name           │   │ │
│  │ Scope: [...]           │   │ │Vars  │   }               │   │ │
│  │ PKCE: ✅               │   │ │  {}  │ }                  │   │ │
│  │                        │   │ └──────┴───────────────────┘   │ │
│  │ [Get New Token]        │   │                                │ │
│  │ Token: eyJhbGci...     │   │ (Explorer inside Query tab)    │ │
│  │ Expires: 3600s         │   │ (Auth sent with Fetch Schema)  │ │
│  │ [Use Token] [Refresh]  │   │                                │ │
│  └────────────────────────┘   │                                │ │
│                                └────────────────────────────────┘ │
│                                                                  │
│  Behind the scenes:                                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  OAuth2TokenManager        GraphQLSchemaService           │   │
│  │  - Token cache per key     - Introspection query          │   │
│  │  - Auto refresh            - Schema → CompletionProvider  │   │
│  │  - PKCE S256               - Operation extraction         │   │
│  │  - Secure storage          - Schema file cache            │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 — OAuth 2.0 完整实现 (预计 4-5 天)

### 1.1 OAuth2 Token Manager 服务

**新建文件:** `src/services/auth/oauth2-token-manager.ts`

```typescript
export interface TokenInfo {
    accessToken: string;
    tokenType: string;        // "Bearer"
    expiresAt?: number;       // Unix timestamp
    refreshToken?: string;
    scope?: string;
    raw: Record<string, any>; // 原始 token response
}

export interface TokenCacheKey {
    tokenUrl: string;
    clientId: string;
    scope?: string;
    grantType: string;
}

export class OAuth2TokenManager {
    private tokenCache = new Map<string, TokenInfo>();

    /**
     * 获取 token (优先缓存，过期则 refresh，无 refresh 则重新获取)
     */
    async getToken(config: OAuth2Config, environment: string): Promise<TokenInfo>;

    /**
     * 刷新 token (用 refresh_token)
     */
    async refreshToken(config: OAuth2Config, refreshToken: string, environment: string): Promise<TokenInfo>;

    /**
     * Authorization Code + PKCE 流程
     * 1. 生成 code_verifier + code_challenge (S256)
     * 2. 打开浏览器/嵌入式 webview 进行授权
     * 3. 通过 localhost callback 接收 authorization_code
     * 4. 用 code + code_verifier 换取 token
     */
    async authorizationCodeFlow(config: OAuth2Config, environment: string): Promise<TokenInfo>;

    /**
     * Implicit 流程 (不推荐但部分旧系统还在用)
     * 打开浏览器，从 redirect URI fragment 中提取 token
     */
    async implicitFlow(config: OAuth2Config, environment: string): Promise<TokenInfo>;

    /**
     * 手动清除缓存的 token
     */
    clearToken(cacheKey: TokenCacheKey): void;
    clearAllTokens(): void;

    /**
     * PKCE 辅助
     */
    private generateCodeVerifier(): string;     // 43-128 chars random
    private generateCodeChallenge(verifier: string): string;  // SHA256 + base64url
}
```

**关键实现细节:**

| 功能 | 实现方式 |
|------|----------|
| **PKCE S256** | `crypto.randomBytes(32)` → base64url 作为 `code_verifier`；SHA256 hash → base64url 作为 `code_challenge` |
| **浏览器授权** | 使用 `vscode.env.openExternal()` 打开系统浏览器 + `vscode.env.asExternalUri()` 创建本地 callback URI |
| **Callback 接收** | 通过 `vscode.window.registerUriHandler()` 注册 `httpForge` URI scheme，接收 `vscode://henry-huang.http-forge/oauth2/callback?code=xxx` |
| **Token 缓存** | 内存 Map，key = `${tokenUrl}|${clientId}|${scope}|${grantType}`，检查 `expiresAt` 判断过期 |
| **Token 刷新** | 过期前 30s 自动尝试 refresh；失败则清除缓存、重新获取 |
| **安全存储** | Refresh token 使用 `vscode.SecretStorage` 持久化存储 |

### 1.2 扩展 OAuth2Config 类型

**修改文件:** `src/shared/types/index.ts`

```typescript
export interface OAuth2Config {
    // 已有字段
    grantType: 'client_credentials' | 'authorization_code' | 'password' | 'implicit';
    tokenUrl?: string;
    authUrl?: string;
    clientId?: string;
    clientSecret?: string;
    scope?: string;
    username?: string;
    password?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenPrefix?: string;
    tokenField?: string;

    // 新增字段
    callbackUrl?: string;         // 自定义回调 URL (默认 vscode:// URI)
    usePkce?: boolean;            // 启用 PKCE (authorization_code 默认 true)
    pkceMethod?: 'S256' | 'plain'; // PKCE challenge method
    audience?: string;            // Auth0 等要求的 audience 参数
    resource?: string;            // Azure AD 的 resource 参数
    extraParams?: Record<string, string>; // 额外的自定义参数 (provider-specific)
    clientAuthentication?: 'body' | 'header'; // client credentials 发送方式
    state?: string;                // 自定义 state 参数
}
```

### 1.3 更新 Request Preparer

**修改文件:** `src/services/request-preparer.ts`

```typescript
// 原来:
case 'authorization_code':
case 'implicit':
    throw new Error(`... not supported ...`);

// 改为:
case 'authorization_code':
    const tokenInfo = await this.tokenManager.authorizationCodeFlow(oauth2, environment);
    headers['Authorization'] = `${tokenInfo.tokenType} ${tokenInfo.accessToken}`;
    break;
case 'implicit':
    const implicitToken = await this.tokenManager.implicitFlow(oauth2, environment);
    headers['Authorization'] = `${implicitToken.tokenType} ${implicitToken.accessToken}`;
    break;
```

同时，`client_credentials` 和 `password` 流程也改为通过 `tokenManager`，享受缓存和自动刷新能力。

### 1.4 Auth Tab UI — OAuth2 面板

**修改文件:** `resources/features/request-tester/index.html`

在 Auth tab 的 `<select id="auth-type">` 中增加 `oauth2` 选项，并添加 OAuth2 配置面板:

```html
<option value="oauth2">OAuth 2.0</option>

<div id="oauth2-section" class="auth-section hidden">
    <div class="oauth2-form">
        <label>Grant Type:</label>
        <select id="oauth2-grant-type">
            <option value="authorization_code">Authorization Code (PKCE)</option>
            <option value="client_credentials">Client Credentials</option>
            <option value="password">Password</option>
            <option value="implicit">Implicit (Legacy)</option>
        </select>

        <!-- Auth Code specific fields -->
        <div id="oauth2-authcode-fields">
            <label>Auth URL:</label>
            <input type="text" id="oauth2-auth-url" placeholder="https://auth.example.com/authorize">
            <label>Callback URL:</label>
            <input type="text" id="oauth2-callback-url" placeholder="Auto (VS Code URI handler)" disabled>
            <div class="setting-toggle">
                <input type="checkbox" id="oauth2-pkce" checked>
                <label for="oauth2-pkce">Use PKCE (recommended)</label>
            </div>
        </div>

        <!-- Common fields -->
        <label>Token URL:</label>
        <input type="text" id="oauth2-token-url" placeholder="https://auth.example.com/token">
        <label>Client ID:</label>
        <input type="text" id="oauth2-client-id" placeholder="{{clientId}}">
        <label>Client Secret:</label>
        <input type="password" id="oauth2-client-secret" placeholder="{{clientSecret}}">
        <label>Scope:</label>
        <input type="text" id="oauth2-scope" placeholder="openid profile email">

        <!-- Password grant specific -->
        <div id="oauth2-password-fields" class="hidden">
            <label>Username:</label>
            <input type="text" id="oauth2-username" placeholder="{{username}}">
            <label>Password:</label>
            <input type="password" id="oauth2-password" placeholder="{{password}}">
        </div>

        <!-- Advanced -->
        <details class="oauth2-advanced">
            <summary>Advanced Options</summary>
            <label>Audience:</label>
            <input type="text" id="oauth2-audience" placeholder="https://api.example.com">
            <label>Token Prefix:</label>
            <input type="text" id="oauth2-token-prefix" placeholder="Bearer">
            <label>Token Field:</label>
            <input type="text" id="oauth2-token-field" placeholder="access_token">
            <label>Client Auth:</label>
            <select id="oauth2-client-auth">
                <option value="body">Send in body</option>
                <option value="header">Send as Basic Auth header</option>
            </select>
        </details>

        <!-- Token status -->
        <div class="oauth2-token-status">
            <button id="oauth2-get-token" class="primary">Get New Token</button>
            <button id="oauth2-refresh-token" class="secondary hidden">Refresh</button>
            <button id="oauth2-clear-token" class="secondary hidden">Clear</button>
            <div id="oauth2-token-info" class="hidden">
                <span class="token-label">Token:</span>
                <code id="oauth2-token-preview">eyJhbGci...</code>
                <span id="oauth2-token-expires" class="token-expires"></span>
            </div>
        </div>
    </div>
</div>
```

### 1.5 前端 OAuth2 模块

**新建文件:** `resources/features/request-tester/modules/oauth2-manager.js`

```javascript
export function createOAuth2Manager({ state, elements, vscode, markDirty }) {
    return {
        // 根据 grant type 显示/隐藏对应字段
        switchGrantType(grantType),

        // 从 UI 收集 OAuth2 配置
        getConfig() → OAuth2Config,

        // 从保存数据填充 UI
        loadConfig(oauth2Config),

        // 点击 "Get New Token" → 发消息给 extension
        requestToken(),

        // 收到 token 回调 → 更新 UI
        onTokenReceived(tokenInfo),

        // 收到 token 错误 → 显示错误
        onTokenError(error),

        // 清除 token
        clearToken(),

        // 返回用于 message handler 的 commands
        getMessageHandlers() → { oauth2TokenReceived, oauth2TokenError }
    };
}
```

### 1.6 后端 OAuth2 Handler

**新建文件:** `src/webview-panels/request-tester/handlers/oauth2-handler.ts`

处理来自 webview 的 OAuth2 消息:

| Command | 方向 | 说明 |
|---------|------|------|
| `oauth2GetToken` | webview → ext | 手动触发获取 token |
| `oauth2RefreshToken` | webview → ext | 手动触发刷新 |
| `oauth2ClearToken` | webview → ext | 清除缓存的 token |
| `oauth2TokenReceived` | ext → webview | token 获取成功 |
| `oauth2TokenError` | ext → webview | token 获取失败 |

### 1.7 URI Handler 注册

**修改文件:** `src/extension.ts`

```typescript
// 注册 OAuth2 callback URI handler
vscode.window.registerUriHandler({
    handleUri(uri: vscode.Uri) {
        // uri: vscode://henry-huang.http-forge/oauth2/callback?code=xxx&state=yyy
        if (uri.path === '/oauth2/callback') {
            const code = uri.query.match(/code=([^&]+)/)?.[1];
            const state = uri.query.match(/state=([^&]+)/)?.[1];
            tokenManager.handleAuthorizationCallback(code, state);
        }
    }
});
```

### 1.8 文件清单

| 操作 | 文件 |
|------|------|
| **新建** | `src/services/auth/oauth2-token-manager.ts` |
| **新建** | `src/webview-panels/request-tester/handlers/oauth2-handler.ts` |
| **新建** | `resources/features/request-tester/modules/oauth2-manager.js` |
| **修改** | `src/shared/types/index.ts` — 扩展 `OAuth2Config` |
| **修改** | `src/services/request-preparer.ts` — 使用 TokenManager |
| **修改** | `src/services/service-bootstrap.ts` — 注册 TokenManager |
| **修改** | `src/extension.ts` — URI handler |
| **修改** | `resources/features/request-tester/index.html` — OAuth2 面板 |
| **修改** | `resources/features/request-tester/style.css` — OAuth2 样式 |
| **修改** | `resources/features/request-tester/modules/main.js` — 注册 OAuth2 模块 |
| **修改** | `resources/features/request-tester/modules/request-builder.js` — OAuth2 auth 构建 |
| **修改** | `resources/features/request-tester/modules/request-loader.js` — 加载 OAuth2 配置 |
| **修改** | `resources/features/request-tester/modules/state.js` — OAuth2 state |

---

## Phase 2 — GraphQL 增强 ✅ Implemented in v0.11.0

### 2.1 GraphQL Schema Service

**新建文件:** `src/services/graphql/graphql-schema-service.ts`

```typescript
export interface GraphQLField {
    name: string;
    type: string;            // "String", "Int", "[User]", "User!", etc.
    args?: GraphQLArg[];
    description?: string;
    isDeprecated?: boolean;
    deprecationReason?: string;
}

export interface GraphQLArg {
    name: string;
    type: string;
    defaultValue?: string;
    description?: string;
}

export interface GraphQLType {
    name: string;
    kind: 'OBJECT' | 'INPUT_OBJECT' | 'ENUM' | 'SCALAR' | 'INTERFACE' | 'UNION' | 'LIST' | 'NON_NULL';
    fields?: GraphQLField[];
    inputFields?: GraphQLArg[];    // for INPUT_OBJECT
    enumValues?: { name: string; description?: string }[];
    interfaces?: string[];
    possibleTypes?: string[];      // for INTERFACE/UNION
    description?: string;
}

export interface GraphQLSchema {
    queryType: string;            // root type name, e.g. "Query"
    mutationType?: string;        // e.g. "Mutation"
    subscriptionType?: string;    // e.g. "Subscription"
    types: Map<string, GraphQLType>;
    directives: any[];
    fetchedAt: number;            // timestamp
    endpointUrl: string;          // 来源 URL
}

export class GraphQLSchemaService {
    private schemaCache = new Map<string, GraphQLSchema>();

    /**
     * 执行 introspection query 获取 schema
     */
    async fetchSchema(
        endpointUrl: string,
        headers?: Record<string, string>
    ): Promise<GraphQLSchema>;

    /**
     * 从缓存获取 schema
     */
    getCachedSchema(endpointUrl: string): GraphQLSchema | undefined;

    /**
     * 根据当前光标位置，提供补全建议
     */
    getCompletions(
        schema: GraphQLSchema,
        document: string,
        position: { line: number; column: number }
    ): CompletionItem[];

    /**
     * 提取 document 中所有 operation name
     */
    extractOperations(document: string): Array<{
        name: string;
        type: 'query' | 'mutation' | 'subscription';
        line: number;
    }>;

    /**
     * 为 operation 生成 variables 类型提示
     */
    getVariableTypes(
        schema: GraphQLSchema,
        document: string,
        operationName?: string
    ): Record<string, string>;

    /**
     * 清除缓存
     */
    clearCache(endpointUrl?: string): void;
}
```

**Introspection Query:**

```graphql
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      kind name description
      fields(includeDeprecated: true) {
        name description isDeprecated deprecationReason
        args { name description type { ...TypeRef } defaultValue }
        type { ...TypeRef }
      }
      inputFields { name description type { ...TypeRef } defaultValue }
      interfaces { ...TypeRef }
      enumValues(includeDeprecated: true) { name description isDeprecated deprecationReason }
      possibleTypes { ...TypeRef }
    }
    directives { name description locations args { name description type { ...TypeRef } defaultValue } }
  }
}
fragment TypeRef on __Type {
  kind name
  ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
}
```

### 2.2 GraphQL 补全提供器

**新建文件:** `src/services/graphql/graphql-completion-provider.ts`

核心逻辑是一个轻量级 GraphQL 文档解析器，不依赖 `graphql-js`:

```typescript
export class GraphQLCompletionProvider {
    /**
     * 解析 GraphQL document 到简化 AST
     * 使用正则 + 状态机，不需要完整的 GraphQL parser
     */
    private parseContext(document: string, offset: number): QueryContext;

    /**
     * 根据上下文生成补全项
     */
    getCompletions(schema: GraphQLSchema, context: QueryContext): CompletionItem[];
}

interface QueryContext {
    /** 当前所在位置类型 */
    contextType:
        | 'root'              // query/mutation/subscription 关键字
        | 'operation_name'    // operation 名称处
        | 'selection_set'     // { } 内部 — 可选字段
        | 'argument'          // ( ) 内部 — 可选参数
        | 'argument_value'    // 参数的值 (enum 补全)
        | 'directive'         // @ 后面 — 可选指令
        | 'fragment_type'     // on TypeName
        | 'variable_def';     // ($var: Type) — 可选类型

    /** 当前字段路径: ["query", "users", "posts"] */
    fieldPath: string[];

    /** 当前作用域的 GraphQL 类型名 */
    parentType?: string;

    /** 是否在 fragment 内 */
    inFragment?: boolean;

    /** 不完整的输入 (用于前缀过滤) */
    prefix?: string;
}
```

**补全触发场景:**

| 场景 | 触发条件 | 补全内容 |
|------|----------|----------|
| **Root level** | 空文档 或 新行首 | `query`, `mutation`, `subscription`, `fragment` |
| **Selection set** | `{` 后或字段后换行 | 当前类型的可选字段 + `__typename` |
| **Arguments** | `(` 后或 `,` 后 | 字段的参数列表 |
| **Argument value (enum)** | `argName:` 后 | enum 类型的可选值 |
| **Fragment spread** | `...` 后 | 已定义的 fragment name + `on TypeName` |
| **Directive** | `@` 后 | 可用的 directive (`@skip`, `@include`, 自定义) |
| **Variable type** | `$var:` 后 | schema 中的 input types + scalars |

### 2.3 GraphQL 语法高亮

**新建文件:** `resources/shared/graphql-language.js`

注册 Monaco GraphQL 语言:

```javascript
export function registerGraphQLLanguage(monaco) {
    // 注册语言 ID
    monaco.languages.register({ id: 'graphql' });

    // Monarch tokenizer
    monaco.languages.setMonarchTokensProvider('graphql', {
        keywords: ['query', 'mutation', 'subscription', 'fragment', 'on', 'type',
                   'interface', 'union', 'enum', 'input', 'scalar', 'extend',
                   'implements', 'directive', 'schema', 'true', 'false', 'null'],
        typeKeywords: ['Int', 'Float', 'String', 'Boolean', 'ID'],
        operators: ['!', '=', '...', ':', '@', '|', '&'],

        tokenizer: {
            root: [
                // Comments
                [/#.*$/, 'comment'],

                // Strings
                [/"""/, 'string', '@blockString'],
                [/"/, 'string', '@string'],

                // Numbers
                [/-?\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'],

                // Variables
                [/\$[a-zA-Z_]\w*/, 'variable'],

                // Directives
                [/@[a-zA-Z_]\w*/, 'annotation'],

                // Type references (PascalCase)
                [/[A-Z][a-zA-Z_0-9]*/, {
                    cases: {
                        '@typeKeywords': 'type',
                        '@default': 'type.identifier'
                    }
                }],

                // Keywords and fields
                [/[a-z_]\w*/, {
                    cases: {
                        '@keywords': 'keyword',
                        '@default': 'identifier'
                    }
                }],

                // Punctuation
                [/[{}()\[\]]/, '@brackets'],
                [/[!:=|&]/, 'delimiter'],
                [/\.\.\./, 'delimiter'],
            ],
            string: [
                [/[^"\\]+/, 'string'],
                [/\\./, 'string.escape'],
                [/"/, 'string', '@pop'],
            ],
            blockString: [
                [/"""/, 'string', '@pop'],
                [/./, 'string'],
            ],
        }
    });

    // 语言配置 (括号匹配、注释等)
    monaco.languages.setLanguageConfiguration('graphql', {
        comments: { lineComment: '#' },
        brackets: [['{', '}'], ['(', ')'], ['[', ']']],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '(', close: ')' },
            { open: '[', close: ']' },
            { open: '"', close: '"' },
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '(', close: ')' },
            { open: '[', close: ']' },
            { open: '"', close: '"' },
        ],
    });
}
```

### 2.4 GraphQL Schema Explorer 面板

在 GraphQL body 区域增加一个 Schema Explorer 侧面板:

**修改文件:** `resources/features/request-tester/index.html`

```html
<!-- GraphQL toolbar — in .body-type-selector bar, hidden when body type ≠ GraphQL -->
<div id="graphql-toolbar" class="graphql-toolbar hidden">
    <button id="graphql-fetch-schema" class="secondary" title="Fetch schema via introspection">
        ⟳ Fetch Schema
    </button>
    <select id="graphql-operation-select" class="hidden" title="Select operation">
        <option value="">All operations</option>
    </select>
    <span id="graphql-schema-status" class="graphql-status"></span>
    <button id="graphql-toggle-explorer" class="secondary icon-btn" title="Toggle Schema Explorer">
        🔍
    </button>
</div>

<!-- GraphQL body panel — tabbed Query/Variables editors -->
<div id="body-graphql" class="body-panel hidden">
    <div class="graphql-content">
        <div class="graphql-tabs-vertical">
            <button class="graphql-tab-vertical active" data-graphql-tab="query">
                <span class="graphql-tab-icon">⟩</span>
                <span class="graphql-tab-label">Query</span>
            </button>
            <button class="graphql-tab-vertical" data-graphql-tab="variables">
                <span class="graphql-tab-icon">{}</span>
                <span class="graphql-tab-label">Variables</span>
            </button>
        </div>
        <div class="graphql-panels">
            <div id="graphql-query-panel" class="graphql-tab-panel active">
                <div id="graphql-query-editor" class="monaco-editor-wrapper graphql-editor"></div>
                <div id="graphql-explorer" class="graphql-explorer hidden">
                    <div class="explorer-header">
                        <h4>Schema Explorer</h4>
                        <input type="text" id="graphql-type-search" placeholder="Search types...">
                    </div>
                    <div id="graphql-type-tree" class="explorer-tree"></div>
                </div>
            </div>
            <div id="graphql-variables-panel" class="graphql-tab-panel">
                <div id="graphql-variables-editor" class="monaco-editor-wrapper graphql-editor"></div>
            </div>
        </div>
    </div>
</div>
```

### 2.5 GraphQL 前端模块

**新建文件:** `resources/features/request-tester/modules/graphql-manager.js`

```javascript
export function createGraphQLManager({ state, elements, vscode, monacoManager }) {
    let schema = null;           // 缓存的 schema
    let completionDisposable;    // Monaco completion provider disposable

    return {
        // 初始化: 注册语言、设置编辑器
        initialize(),

        // 获取 schema → 发消息给 extension → 注册补全
        fetchSchema(),

        // 收到 schema 数据 → 解析 → 注册补全 → 更新 explorer
        onSchemaReceived(schemaData),

        // 注册 Monaco CompletionItemProvider
        registerCompletions(schema),

        // 渲染 Schema Explorer tree
        renderExplorer(schema),

        // 提取并更新 operation 选择下拉框
        updateOperationSelector(),

        // 点击 explorer 中的字段 → 插入到编辑器
        insertField(fieldPath),

        // 清理
        dispose()
    };
}
```

### 2.6 GraphQL 后端 Handler

**新建文件:** `src/webview-panels/request-tester/handlers/graphql-handler.ts`

| Command | 方向 | 说明 |
|---------|------|------|
| `graphqlFetchSchema` | webview → ext | 发送 introspection query |
| `graphqlSchemaReceived` | ext → webview | 返回解析后的 schema |
| `graphqlSchemaError` | ext → webview | introspection 失败 |

实现逻辑:
1. 构建 introspection query
2. 使用当前请求的 URL 和 headers (包括 Auth tab 的 bearer/basic/apikey/oauth2 授权) 发送 `POST`
3. 解析 response → `GraphQLSchema`
4. 发回给 webview

### 2.7 文件清单

| 操作 | 文件 |
|------|------|
| **新建** | `src/services/graphql/graphql-schema-service.ts` |
| **新建** | `src/services/graphql/graphql-completion-provider.ts` |
| **新建** | `src/webview-panels/request-tester/handlers/graphql-handler.ts` |
| **新建** | `resources/shared/graphql-language.js` |
| **新建** | `resources/features/request-tester/modules/graphql-manager.js` |
| **修改** | `resources/features/request-tester/index.html` — GraphQL 工具栏 + Explorer |
| **修改** | `resources/features/request-tester/style.css` — GraphQL 样式 |
| **修改** | `resources/features/request-tester/modules/main.js` — 集成 GraphQL 模块 |
| **修改** | `resources/features/request-tester/modules/monaco-editors-manager.js` — GraphQL 语言注册 |
| **修改** | `resources/features/request-tester/modules/body-type-manager.js` — GraphQL 增强切换逻辑 |
| **修改** | `src/services/service-bootstrap.ts` — 注册 GraphQL 服务 |

---

## Phase 3 — 集成测试 & Polish (预计 2-3 天)

### 3.1 OAuth2 测试矩阵

| Grant Type | Provider | 测试 |
|------------|----------|------|
| **Client Credentials** | Keycloak / Auth0 | token 获取、缓存、过期刷新 |
| **Authorization Code + PKCE** | GitHub / Google / Auth0 | 浏览器打开、callback 接收、token 交换 |
| **Password** | Keycloak | username/password → token |
| **Implicit** | 模拟 server | fragment token 提取 |
| **Pre-set Token** | 所有 | 直接使用 `accessToken` 字段 |
| **Token Refresh** | Keycloak | refresh_token → 新 token |
| **Variable Resolution** | — | `{{clientId}}`、`{{clientSecret}}` 正确替换 |

### 3.2 GraphQL 测试矩阵

| 功能 | 测试目标 |
|------|----------|
| **Introspection** | GitHub GraphQL API、SpaceX API、本地 Apollo server |
| **Syntax Highlighting** | keyword、type、variable、string、comment、directive |
| **Auto-complete** | Field suggestion、arg suggestion、enum value、fragment spread |
| **Multi-operation** | 多个 query/mutation 的 operation 选择 |
| **Schema Explorer** | 类型树展开/折叠、搜索过滤、点击插入 |
| **Large Schema** | 1000+ types 的 schema 性能 |

### 3.3 文档更新

| 文档 | 更新内容 |
|------|----------|
| README.md | 更新对比表、Features 列表 |
| CHANGELOG.md | 新版本条目 |
| docs/user-guide/request-tester.md | OAuth2 和 GraphQL 使用指南 |
| docs/request-tester-design.md | 新模块、新消息协议 |
| docs/SOLID-ARCHITECTURE.md | 新模块、新服务 |

---

## 依赖分析

### 零新依赖方案

| 功能 | 替代方案 | 说明 |
|------|----------|------|
| **PKCE SHA256** | Node.js `crypto.createHash('sha256')` | 内置 |
| **Base64URL** | `Buffer.from(x).toString('base64url')` | Node.js 16+ |
| **GraphQL 解析** | 自研轻量 tokenizer + 状态机 | 避免引入 `graphql-js` (680KB) |
| **Introspection** | 内置 HTTP 请求 (复用 `IHttpClient`) | 标准 POST |
| **URI Handler** | `vscode.window.registerUriHandler` | VS Code API |
| **Secret Storage** | `vscode.SecretStorage` | VS Code API |
| **Monaco 语言** | Monarch tokenizer | Monaco 内置 |

**不需要新增任何 npm 依赖。** 所有功能通过 Node.js 标准库 + VS Code API + 自研轻量模块实现。

---

## 时间线

```
Week 1:
  Day 1-2: OAuth2TokenManager + Request Preparer 更新 + URI Handler
  Day 3-4: Auth Tab OAuth2 UI + oauth2-manager.js + oauth2-handler.ts
  Day 5:   OAuth2 集成测试 (client_credentials + auth_code + PKCE)

Week 2:
  Day 1:   GraphQL Schema Service + Introspection
  Day 2:   GraphQL 语法高亮 (Monarch) + Monaco 语言注册
  Day 3:   GraphQL Completion Provider + graphql-manager.js
  Day 4:   GraphQL Schema Explorer UI + graphql-handler.ts
  Day 5:   GraphQL 集成测试 + 文档更新 + Polish

Total: ~10 working days
```

---

## 竞争力评估 (完成后)

| Feature | HTTP Forge | Thunder Client | Postman |
|---------|------------|----------------|---------|
| **OAuth2 Client Credentials** | ✅ | ✅ | ✅ |
| **OAuth2 Auth Code + PKCE** | ✅ | ✅ | ✅ |
| **OAuth2 Password** | ✅ | ✅ | ✅ |
| **OAuth2 Implicit** | ✅ | ✅ | ✅ |
| **Token Caching** | ✅ | ✅ | ✅ |
| **Token Auto-refresh** | ✅ | ❌ | ✅ |
| **PKCE S256** | ✅ | ✅ | ✅ |
| **Custom OAuth Params** | ✅ (audience, resource, extraParams) | ⚠️ Limited | ✅ |
| **GraphQL Query** | ✅ | ✅ | ✅ |
| **GraphQL Syntax Highlighting** | ✅ | ✅ | ✅ |
| **GraphQL Introspection** | ✅ | ✅ | ✅ |
| **GraphQL Auto-complete** | ✅ | ❌ | ✅ |
| **GraphQL Schema Explorer** | ✅ | ❌ | ✅ |
| **GraphQL Operation Select** | ✅ | ❌ | ✅ |
| **OpenAPI Round-trip** | ✅ | ❌ | ❌ |
| **Body/Response Schema** | ✅ | ❌ | ❌ |
| **Git-native Storage** | ✅ | ⚠️ | ❌ |
| **No Account Required** | ✅ | ✅ | ❌ |
| **Free** | ✅ | ⚠️ Freemium | ❌ |

完成后，HTTP Forge 将在 **认证** 和 **GraphQL** 方面达到与 Thunder Client 的功能对等，同时在 **OpenAPI、Schema 管理、Git 存储、团队协作** 方面保持独有优势。
