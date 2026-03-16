# Phase 3: SOLID Implementation Plan

> **本文档聚焦于代码实现层面的架构设计**
>
> 关于需求、使用场景和 API 设计，请参阅 [PHASE-3-CODE-FLOWS-DETAILED.md](./PHASE-3-CODE-FLOWS-DETAILED.md)

---

## 0. Implementation Strategy: Extract, Don't Rewrite

> ⚠️ **核心原则：从现有 VS Code 插件抽取已验证的代码，而不是重新实现**

现有插件 (`http-forge/src/services/`) 已经包含完整的、经过验证的服务实现。Phase 3 的工作是：

1. **抽取** - 将核心逻辑从 VS Code 依赖中分离
2. **重构** - 移除 `vscode.*` 调用，使用纯 Node.js API
3. **复用** - 保持业务逻辑不变，只改变依赖注入方式

### 0.1 Architecture Goal: Core as Single Source of Truth

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BEFORE: Code Duplication Risk                           │
│                                                                             │
│   VS Code Extension          Standalone              Playwright             │
│   ┌─────────────────┐       ┌─────────────────┐     ┌─────────────────┐    │
│   │ CollectionSvc   │       │ CollectionSvc'  │     │ CollectionSvc'' │    │
│   │ EnvConfigSvc    │       │ EnvConfigSvc'   │     │ EnvConfigSvc''  │    │
│   │ HttpRequestSvc  │       │ HttpRequestSvc' │     │ HttpRequestSvc''│    │
│   └─────────────────┘       └─────────────────┘     └─────────────────┘    │
│         ❌ Three copies of similar logic = maintenance nightmare            │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ▼

┌─────────────────────────────────────────────────────────────────────────────┐
│                      AFTER: Core as Single Source                            │
│                                                                             │
│                      ┌─────────────────────────┐                            │
│                      │    @http-forge/core     │                            │
│                      │                         │                            │
│                      │  • CollectionLoader     │  ← Single implementation   │
│                      │  • EnvironmentResolver  │  ← Zero VS Code deps       │
│                      │  • RequestExecutor      │  ← Pure Node.js            │
│                      │  • ScriptPipeline       │  ← Fully tested            │
│                      └───────────┬─────────────┘                            │
│                                  │                                          │
│              ┌───────────────────┼───────────────────┐                      │
│              ▼                   ▼                   ▼                      │
│   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐              │
│   │  VS Code Ext    │ │   Standalone    │ │   Playwright    │              │
│   │  (GUI wrapper)  │ │   (CLI runner)  │ │   (fixture)     │              │
│   └─────────────────┘ └─────────────────┘ └─────────────────┘              │
│         ✅ All three consume the same core = single maintenance point       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Principle: Core 是"源头"，不是"抽取物"**

| Aspect | ❌ Wrong Approach | ✅ Correct Approach |
|--------|-------------------|---------------------|
| 设计方向 | VS Code 插件为主，core 是副产品 | Core 为主，VS Code 是 GUI wrapper |
| 依赖方向 | Core 残留 VS Code 概念 | Core 完全独立，无 IDE 概念 |
| 未来演进 | 改 core 要考虑插件兼容 | 改 core，所有消费者自动受益 |
| 测试策略 | 测插件间接测 core | 直接测 core，100% 覆盖 |

### 0.2 Core Package Design Principles

```typescript
// ✅ GOOD: Core 只依赖 Node.js 标准库和轻量 npm 包
import * as fs from 'fs';           // Node.js built-in
import * as path from 'path';       // Node.js built-in
import { VM } from 'vm2';           // Lightweight sandboxing

// ❌ BAD: 绝对不能有这些
import * as vscode from 'vscode';   // VS Code API
import { window } from 'vscode';    // VS Code UI
```

**Core 的设计约束：**

| 允许 | 禁止 |
|------|------|
| Node.js `fs`, `path`, `crypto` | `vscode.*` 任何 API |
| 轻量 npm 包 (`vm2`, `ajv`) | VS Code 概念 (`workspace`, `extension`) |
| 接口注入 (`IFileSystem`) | 硬编码 VS Code 路径 |
| 配置对象 (`ForgeConfig`) | `vscode.workspace.getConfiguration` |
| 抛出异常 | `vscode.window.showErrorMessage` |
| 返回结果 | `vscode.window.showInformationMessage` |

### 0.3 Code Mapping: Existing → Core

| Core Component | Existing Source | Extraction Notes |
|----------------|-----------------|------------------|
| **Interfaces** | | |
| `ICollectionParser` | `collection/collection-loader.interface.ts` | 简化，只保留 `parse()` |
| `IEnvironmentStore` | `interfaces/environment-config.interface.ts` | 移除 `vscode.Uri` |
| `IVariableInterpolator` | `request-execution/variable-replacer.ts` | ✅ 已是纯接口 |
| `IHttpClient` | `interfaces/http-request.interface.ts` | 简化返回类型 |
| `IScriptRunner` | `request-execution/interfaces.ts` | 提取 `IScriptExecutor` |
| `IFileSystem` | *New* | 抽象文件操作 |
| **Implementations** | | |
| `VariableReplacer` | `request-execution/variable-replacer.ts` | ✅ 100% 复用 |
| `ScriptExecutor` | `request-execution/script-executor.ts` | 移除日志到 VS Code |
| `CollectionLoader` | `collection-service.ts` + `collection/` | 使用 `IFileSystem` |
| `EnvironmentResolver` | `environment-config-service.ts` | 移除 `vscode.workspace` |
| `RequestExecutor` | `http-request-service.ts` | 使用配置对象 |
| `ForgeContainer` | `service-container.ts` | 只保留 core 服务 |

### 0.4 Existing Services Deep Dive

```
http-forge/src/services/
├── interfaces/                          # ✅ 已有接口定义，可直接抽取
│   ├── collection.interface.ts          # ICollectionService
│   ├── environment-config.interface.ts  # IEnvironmentConfigService  
│   ├── http-request.interface.ts        # IHttpRequestService
│   └── ...
│
├── collection/                          # ✅ Collection 加载器（策略模式）
│   ├── collection-loader.interface.ts   # ICollectionLoader
│   ├── json-collection-loader.ts        # JSON 格式加载
│   ├── folder-collection-loader.ts      # 文件夹格式加载
│   └── collection-loader-factory.ts     # 工厂模式
│
├── request-execution/                   # ✅ 请求执行核心逻辑
│   ├── variable-replacer.ts             # {{var}} 替换，纯 Node.js
│   ├── script-executor.ts               # vm2 脚本执行
│   ├── script-session.ts                # 脚本会话管理
│   ├── collection-request-executor.ts   # 批量执行
│   └── data-file-parser.ts              # CSV/JSON 数据文件
│
├── service-container.ts                 # ✅ DI 容器，需要分离 VS Code 部分
├── collection-service.ts                # Collection CRUD
├── environment-config-service.ts        # 环境变量管理
├── http-request-service.ts              # HTTP 执行
└── ...
```

### 0.5 Extraction Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Step 1: Identify Pure Node.js Code                    │
│                                                                             │
│   VariableReplacer      ✅ Pure - 直接移动                                   │
│   ScriptExecutor        ⚠️ 使用 vm2, fs, path - 可移动                       │
│   DataFileParser        ✅ Pure - 使用 csv-parse, fs                         │
│   CollectionLoader      ⚠️ 使用 fs - 需要抽象 IFileSystem                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Step 2: Identify VS Code Dependencies                 │
│                                                                             │
│   EnvironmentConfigService:                                                 │
│   - vscode.workspace.workspaceFolders     → 构造函数参数                     │
│   - vscode.workspace.fs.readFile          → IFileSystem.readFile            │
│   - vscode.workspace.fs.writeFile         → IFileSystem.writeFile           │
│                                                                             │
│   HttpRequestService:                                                       │
│   - vscode.workspace.getConfiguration     → 构造函数参数 / ConfigObject      │
│   - vscode.window.showErrorMessage        → 抛出异常 / 回调函数              │
│                                                                             │
│   ServiceContainer:                                                         │
│   - vscode.ExtensionContext               → 移除，不需要                     │
│   - vscode.WorkspaceFolder                → 替换为 forgeRoot: string         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Step 3: Create Abstraction Layer                      │
│                                                                             │
│   // 新增 IFileSystem 接口                                                   │
│   interface IFileSystem {                                                   │
│       readFile(path: string): Promise<string>;                              │
│       writeFile(path: string, content: string): Promise<void>;              │
│       exists(path: string): Promise<boolean>;                               │
│       glob(pattern: string): Promise<string[]>;                             │
│   }                                                                         │
│                                                                             │
│   // VS Code 实现                      // Node.js 实现                       │
│   class VsCodeFileSystem               class NodeFileSystem                  │
│       implements IFileSystem               implements IFileSystem            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 0.6 What's New vs What's Extracted

| Component | Status | Notes |
|-----------|--------|-------|
| `VariableReplacer` | 📦 Extract | 100% 复用，无改动 |
| `ScriptExecutor` | 📦 Extract | 90% 复用，移除 VS Code 日志 |
| `CollectionLoader` | 📦 Extract | 80% 复用，抽象文件系统 |
| `EnvironmentResolver` | 📦 Extract | 70% 复用，移除 workspace 依赖 |
| `RequestExecutor` | 📦 Extract | 60% 复用，简化配置读取 |
| `ParserRegistry` | 🆕 New | 新增，支持 Postman/Insomnia |
| `ScriptPipeline` | 🆕 New | 新增，三层 script 编排 |
| `ForgeContainer` | 📦 Extract | 精简版，只管理 core 服务 |
| `FlowRuntime` | 🆕 New | standalone 包，`f` 对象 |
| `expect` 断言 | 🆕 New | standalone 包，Jest-like |
| Playwright Fixture | 🆕 New | playwright 包 |

### 0.7 Future Vision: VS Code Extension as Thin Wrapper

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VS Code Extension (Future State)                        │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                     UI Layer (VS Code specific)                    │    │
│   │  • TreeView providers (collections, environments, history)         │    │
│   │  • Webview panels (request editor, response viewer)                │    │
│   │  • Commands & menus                                                │    │
│   │  • Status bar items                                                │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    │ Uses                                   │
│                                    ▼                                        │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                     Adapter Layer (thin)                           │    │
│   │  • VsCodeFileSystem implements IFileSystem                         │    │
│   │  • VsCodeLogger implements ILogger                                 │    │
│   │  • Config adapter: vscode.getConfiguration → ForgeConfig           │    │
│   └───────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    │ Delegates to                           │
│                                    ▼                                        │
│   ┌───────────────────────────────────────────────────────────────────┐    │
│   │                     @http-forge/core (npm)                         │    │
│   │  • ALL business logic lives here                                   │    │
│   │  • NO VS Code code in this layer                                   │    │
│   └───────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- 🔄 **Code sharing**: CLI, Playwright, VS Code 共享同一份核心代码
- 🧪 **Testability**: Core 可以 100% 单元测试，无需 VS Code 环境
- 🚀 **Faster iteration**: 改 core 一次，所有消费者受益
- 📦 **Smaller extension**: VS Code 插件只包含 UI 代码，体积更小

---

## 1. Architecture Overview

本节定义 `@http-forge/core` 的核心架构，严格遵循 SOLID 原则。

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           @http-forge/core                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        INTERFACES (Contracts)                        │   │
│  │  ICollectionParser │ IEnvironmentStore │ IHttpClient │ IScriptRunner│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    ▲                                        │
│                                    │ Depend on abstractions                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        SERVICES (Implementations)                    │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Collection   │  │ Environment  │  │   Request    │              │   │
│  │  │ Loader       │  │ Resolver     │  │   Executor   │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │         │                 │                 │                       │   │
│  │         ▼                 ▼                 ▼                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Parser       │  │ Variable     │  │   Script     │              │   │
│  │  │ Registry     │  │ Interpolator │  │   Pipeline   │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. SOLID Principles Applied

| Principle | Application |
|-----------|-------------|
| **S**ingle Responsibility | 每个类只有一个职责：`CollectionLoader` 只加载，`ScriptRunner` 只执行脚本 |
| **O**pen/Closed | `ParserRegistry` 可扩展新 parser，无需修改现有代码 |
| **L**iskov Substitution | `PostmanParser` 可替换 `HttpForgeParser`，行为一致 |
| **I**nterface Segregation | 小接口：`ICollectionParser`、`IScriptRunner` 各自独立 |
| **D**ependency Inversion | 高层模块依赖接口，不依赖具体实现 |

---

## 3. Core Interfaces

```typescript
// packages/core/src/interfaces/index.ts

// ============================================================
// S: Single Responsibility - 每个接口只定义一个职责
// I: Interface Segregation - 接口小而专注
// ============================================================

/**
 * Collection Parser Interface
 * 职责：解析特定格式的 collection 文件
 */
export interface ICollectionParser {
    readonly name: string;
    readonly filePatterns: string[];
    
    canParse(filePath: string): boolean;
    parse(content: string): UnifiedCollection;
}

/**
 * Environment Store Interface
 * 职责：存储和检索环境变量
 */
export interface IEnvironmentStore {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    getAll(): Record<string, string>;
    load(environmentName: string): void;
    persist(): Promise<void>;
}

/**
 * Variable Interpolator Interface
 * 职责：解析字符串中的 {{variable}} 占位符
 */
export interface IVariableInterpolator {
    interpolate(input: string, variables: Record<string, string>): string;
    extractVariables(input: string): string[];
}

/**
 * HTTP Client Interface
 * 职责：执行 HTTP 请求
 */
export interface IHttpClient {
    execute(request: HttpRequest): Promise<HttpResponse>;
}

/**
 * Script Runner Interface
 * 职责：执行 pre-request / post-response 脚本
 */
export interface IScriptRunner {
    run(script: string, context: ScriptContext): Promise<ScriptResult>;
}

/**
 * Script Pipeline Interface
 * 职责：管理脚本执行顺序（collection → folder → request）
 */
export interface IScriptPipeline {
    executePreRequest(request: ResolvedRequest, context: ScriptContext): Promise<ResolvedRequest>;
    executePostResponse(response: HttpResponse, context: ScriptContext): Promise<HttpResponse>;
}
```

---

## 4. Data Types (Value Objects)

```typescript
// packages/core/src/interfaces/types.ts

export interface UnifiedCollection {
    id: string;
    name: string;
    slug: string;
    requests: UnifiedRequest[];
    folders: UnifiedFolder[];
    scripts?: CollectionScripts;
    variables?: Record<string, string>;
}

export interface UnifiedFolder {
    id: string;
    name: string;
    slug: string;
    requests: UnifiedRequest[];
    folders: UnifiedFolder[];
    scripts?: CollectionScripts;
}

export interface UnifiedRequest {
    id: string;
    name: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: RequestBody;
    scripts?: CollectionScripts;
}

export interface CollectionScripts {
    preRequest?: string;
    postResponse?: string;
}

export interface HttpRequest {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: any;
    timeout?: number;
}

export interface HttpResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    time: number;
}

export interface ScriptContext {
    request: HttpRequest;
    response?: HttpResponse;
    environment: IEnvironmentStore;
    variables: Map<string, any>;  // Flow-scoped variables
}

export interface ScriptResult {
    success: boolean;
    error?: Error;
    modifiedRequest?: HttpRequest;
    modifiedResponse?: HttpResponse;
}

export interface RequestOverrides {
    params?: Record<string, string>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    body?: any;
    url?: string;
    method?: string;
    skipScripts?: boolean | ('collection' | 'folder' | 'request')[];
    skipPreScripts?: boolean;
    skipPostScripts?: boolean;
}
```

---

## 5. Service Implementations

### 5.1 ParserRegistry (Open/Closed Principle)

```typescript
// packages/core/src/services/parser-registry.ts

/**
 * O: Open for extension, closed for modification
 * 添加新 parser 不需要修改此类
 */
export class ParserRegistry {
    private parsers: ICollectionParser[] = [];

    register(parser: ICollectionParser): void {
        this.parsers.push(parser);
    }

    findParser(filePath: string): ICollectionParser | undefined {
        return this.parsers.find(p => p.canParse(filePath));
    }

    getSupportedPatterns(): string[] {
        return this.parsers.flatMap(p => p.filePatterns);
    }
}

// 使用示例：
const registry = new ParserRegistry();
registry.register(new HttpForgeParser());     // Phase 3
// registry.register(new PostmanParser());    // Future: 无需修改 ParserRegistry
// registry.register(new InsomniaParser());   // Future: 无需修改 ParserRegistry
```

### 5.2 CollectionLoader (Single Responsibility)

```typescript
// packages/core/src/services/collection-loader.ts

/**
 * S: 只负责加载 collection，不负责解析具体格式
 * D: 依赖 ICollectionParser 接口，不依赖具体实现
 */
export class CollectionLoader {
    constructor(
        private parserRegistry: ParserRegistry,
        private fileSystem: IFileSystem  // 可注入 mock 用于测试
    ) {}

    async load(filePath: string): Promise<UnifiedCollection> {
        const parser = this.parserRegistry.findParser(filePath);
        if (!parser) {
            throw new Error(`No parser found for: ${filePath}`);
        }
        
        const content = await this.fileSystem.readFile(filePath);
        return parser.parse(content);
    }

    async loadAll(directory: string): Promise<UnifiedCollection[]> {
        const patterns = this.parserRegistry.getSupportedPatterns();
        const files = await this.fileSystem.glob(directory, patterns);
        return Promise.all(files.map(f => this.load(f)));
    }
}
```

### 5.3 EnvironmentResolver (Single Responsibility + Dependency Inversion)

```typescript
// packages/core/src/services/environment-resolver.ts

/**
 * S: 只负责环境变量解析
 * D: 依赖 IEnvironmentStore 和 IVariableInterpolator 接口
 */
export class EnvironmentResolver {
    constructor(
        private store: IEnvironmentStore,
        private interpolator: IVariableInterpolator
    ) {}

    use(environmentName: string): void {
        this.store.load(environmentName);
    }

    get(key: string): string | undefined {
        return this.store.get(key);
    }

    set(key: string, value: string): void {
        this.store.set(key, value);
    }

    resolveString(input: string): string {
        return this.interpolator.interpolate(input, this.store.getAll());
    }

    resolveRequest(request: UnifiedRequest): HttpRequest {
        return {
            method: request.method,
            url: this.resolveString(request.url),
            headers: this.resolveHeaders(request.headers),
            body: this.resolveBody(request.body)
        };
    }

    private resolveHeaders(headers: Record<string, string>): Record<string, string> {
        return Object.fromEntries(
            Object.entries(headers).map(([k, v]) => [k, this.resolveString(v)])
        );
    }

    private resolveBody(body?: RequestBody): any {
        if (!body) return undefined;
        if (typeof body === 'string') return this.resolveString(body);
        if (typeof body === 'object') {
            return JSON.parse(this.resolveString(JSON.stringify(body)));
        }
        return body;
    }
}
```

### 5.4 ScriptPipeline (Single Responsibility + Open/Closed)

```typescript
// packages/core/src/services/script-pipeline.ts

/**
 * S: 只负责编排脚本执行顺序
 * O: 可扩展脚本层级，无需修改核心逻辑
 */
export class ScriptPipeline implements IScriptPipeline {
    constructor(private scriptRunner: IScriptRunner) {}

    async executePreRequest(
        request: ResolvedRequest,
        context: ScriptContext,
        options: ScriptExecutionOptions = {}
    ): Promise<ResolvedRequest> {
        const scripts = this.collectPreRequestScripts(request, options);
        
        let currentRequest = request;
        for (const script of scripts) {
            const result = await this.scriptRunner.run(script, {
                ...context,
                request: currentRequest
            });
            if (result.modifiedRequest) {
                currentRequest = result.modifiedRequest;
            }
        }
        
        return currentRequest;
    }

    async executePostResponse(
        response: HttpResponse,
        context: ScriptContext,
        options: ScriptExecutionOptions = {}
    ): Promise<HttpResponse> {
        const scripts = this.collectPostResponseScripts(context.request, options);
        
        let currentResponse = response;
        for (const script of scripts) {
            const result = await this.scriptRunner.run(script, {
                ...context,
                response: currentResponse
            });
            if (result.modifiedResponse) {
                currentResponse = result.modifiedResponse;
            }
        }
        
        return currentResponse;
    }

    /**
     * 收集 pre-request scripts: Collection → Folder → Request
     */
    private collectPreRequestScripts(
        request: ResolvedRequest, 
        options: ScriptExecutionOptions
    ): string[] {
        const scripts: string[] = [];
        const skip = options.skipScripts || [];

        if (!skip.includes('collection') && request.collection?.scripts?.preRequest) {
            scripts.push(request.collection.scripts.preRequest);
        }
        if (!skip.includes('folder') && request.folder?.scripts?.preRequest) {
            scripts.push(request.folder.scripts.preRequest);
        }
        if (!skip.includes('request') && request.scripts?.preRequest) {
            scripts.push(request.scripts.preRequest);
        }

        return scripts;
    }

    /**
     * 收集 post-response scripts: Request → Folder → Collection (反序)
     */
    private collectPostResponseScripts(
        request: ResolvedRequest,
        options: ScriptExecutionOptions
    ): string[] {
        const scripts: string[] = [];
        const skip = options.skipScripts || [];

        if (!skip.includes('request') && request.scripts?.postResponse) {
            scripts.push(request.scripts.postResponse);
        }
        if (!skip.includes('folder') && request.folder?.scripts?.postResponse) {
            scripts.push(request.folder.scripts.postResponse);
        }
        if (!skip.includes('collection') && request.collection?.scripts?.postResponse) {
            scripts.push(request.collection.scripts.postResponse);
        }

        return scripts;
    }
}

interface ScriptExecutionOptions {
    skipScripts?: ('collection' | 'folder' | 'request')[];
    skipPreScripts?: boolean;
    skipPostScripts?: boolean;
}
```

### 5.5 RequestExecutor (Facade Pattern + Dependency Inversion)

```typescript
// packages/core/src/services/request-executor.ts

/**
 * Facade: 统一入口，协调多个服务
 * D: 所有依赖通过构造函数注入
 */
export class RequestExecutor {
    constructor(
        private collectionLoader: CollectionLoader,
        private environmentResolver: EnvironmentResolver,
        private httpClient: IHttpClient,
        private scriptPipeline: IScriptPipeline
    ) {}

    async execute(
        requestPath: string,
        overrides: RequestOverrides = {}
    ): Promise<ForgeResponse> {
        // 1. 解析请求路径 → 获取 UnifiedRequest
        const request = await this.resolveRequest(requestPath);
        
        // 2. 解析环境变量 → 获取 HttpRequest
        let httpRequest = this.environmentResolver.resolveRequest(request);
        
        // 3. 应用 overrides
        httpRequest = this.applyOverrides(httpRequest, overrides);
        
        // 4. 执行 pre-request scripts (unless skipped)
        const context = this.createScriptContext(httpRequest);
        if (!overrides.skipScripts && !overrides.skipPreScripts) {
            httpRequest = await this.scriptPipeline.executePreRequest(
                request, context, this.getScriptOptions(overrides)
            );
        }
        
        // 5. 执行 HTTP 请求
        const startTime = Date.now();
        let response = await this.httpClient.execute(httpRequest);
        response.time = Date.now() - startTime;
        
        // 6. 执行 post-response scripts (unless skipped)
        if (!overrides.skipScripts && !overrides.skipPostScripts) {
            response = await this.scriptPipeline.executePostResponse(
                response, { ...context, response }, this.getScriptOptions(overrides)
            );
        }
        
        // 7. 返回 ForgeResponse
        return this.toForgeResponse(httpRequest, response);
    }

    private getScriptOptions(overrides: RequestOverrides): ScriptExecutionOptions {
        if (overrides.skipScripts === true) {
            return { skipScripts: ['collection', 'folder', 'request'] };
        }
        if (Array.isArray(overrides.skipScripts)) {
            return { skipScripts: overrides.skipScripts };
        }
        return {};
    }

    // ... other private methods
}
```

---

## 6. Dependency Injection Container

```typescript
// packages/core/src/container.ts

/**
 * D: 依赖注入容器，管理所有服务的生命周期
 * 便于测试时注入 mock 实现
 */
export class ForgeContainer {
    private services = new Map<string, any>();

    // 默认实现
    static createDefault(forgeRoot: string): ForgeContainer {
        const container = new ForgeContainer();
        
        // 注册接口实现
        const parserRegistry = new ParserRegistry();
        parserRegistry.register(new HttpForgeParser());
        
        const fileSystem = new NodeFileSystem();
        const collectionLoader = new CollectionLoader(parserRegistry, fileSystem);
        
        const envStore = new FileEnvironmentStore(forgeRoot);
        const interpolator = new MustacheInterpolator();
        const envResolver = new EnvironmentResolver(envStore, interpolator);
        
        const httpClient = new FetchHttpClient();
        const scriptRunner = new VM2ScriptRunner();
        const scriptPipeline = new ScriptPipeline(scriptRunner);
        
        const executor = new RequestExecutor(
            collectionLoader,
            envResolver,
            httpClient,
            scriptPipeline
        );
        
        container.register('parserRegistry', parserRegistry);
        container.register('collectionLoader', collectionLoader);
        container.register('environmentResolver', envResolver);
        container.register('httpClient', httpClient);
        container.register('scriptPipeline', scriptPipeline);
        container.register('requestExecutor', executor);
        
        return container;
    }

    register<T>(key: string, service: T): void {
        this.services.set(key, service);
    }

    resolve<T>(key: string): T {
        const service = this.services.get(key);
        if (!service) throw new Error(`Service not found: ${key}`);
        return service;
    }
}
```

---

## 7. File Structure

```
packages/core/
├── src/
│   ├── index.ts                          # Public exports
│   │
│   ├── interfaces/                       # I: Interface Segregation
│   │   ├── index.ts                      # Re-export all interfaces
│   │   ├── collection-parser.ts          # ICollectionParser
│   │   ├── environment-store.ts          # IEnvironmentStore
│   │   ├── variable-interpolator.ts      # IVariableInterpolator
│   │   ├── http-client.ts                # IHttpClient
│   │   ├── script-runner.ts              # IScriptRunner
│   │   └── types.ts                      # Data types / Value objects
│   │
│   ├── services/                         # S: Single Responsibility
│   │   ├── parser-registry.ts            # O: Open/Closed for parsers
│   │   ├── collection-loader.ts          # Load collections
│   │   ├── environment-resolver.ts       # Resolve variables
│   │   ├── request-resolver.ts           # Path → Request
│   │   ├── request-executor.ts           # Facade: orchestrate execution
│   │   └── script-pipeline.ts            # Manage script execution order
│   │
│   ├── parsers/                          # L: Liskov Substitution
│   │   ├── http-forge-parser.ts          # ✅ Phase 3
│   │   ├── postman-parser.ts             # 💡 Future
│   │   └── insomnia-parser.ts            # 💡 Future
│   │
│   ├── implementations/                  # D: Concrete implementations
│   │   ├── node-file-system.ts           # IFileSystem for Node.js
│   │   ├── fetch-http-client.ts          # IHttpClient using fetch
│   │   ├── file-environment-store.ts     # IEnvironmentStore from files
│   │   ├── mustache-interpolator.ts      # IVariableInterpolator
│   │   └── vm2-script-runner.ts          # IScriptRunner using vm2
│   │
│   └── container.ts                      # DI Container
│
├── __tests__/                            # Unit tests with mocks
│   ├── collection-loader.test.ts
│   ├── environment-resolver.test.ts
│   ├── script-pipeline.test.ts
│   └── mocks/
│       ├── mock-parser.ts
│       ├── mock-http-client.ts
│       └── mock-script-runner.ts
│
├── package.json
└── tsconfig.json
```

---

## 8. Testing Strategy (Enabled by SOLID)

```typescript
// packages/core/src/__tests__/script-pipeline.test.ts

/**
 * SOLID 使得测试变得简单：
 * - 可以 mock 任何接口
 * - 每个类职责单一，测试范围小
 */
describe('ScriptPipeline', () => {
    let mockScriptRunner: jest.Mocked<IScriptRunner>;
    let pipeline: ScriptPipeline;

    beforeEach(() => {
        // D: 注入 mock 实现
        mockScriptRunner = {
            run: jest.fn().mockResolvedValue({ success: true })
        };
        pipeline = new ScriptPipeline(mockScriptRunner);
    });

    it('should execute pre-request scripts in order: collection → folder → request', async () => {
        const request = createMockRequest({
            collection: { scripts: { preRequest: 'collection-script' } },
            folder: { scripts: { preRequest: 'folder-script' } },
            scripts: { preRequest: 'request-script' }
        });

        await pipeline.executePreRequest(request, mockContext);

        expect(mockScriptRunner.run).toHaveBeenCalledTimes(3);
        expect(mockScriptRunner.run.mock.calls[0][0]).toBe('collection-script');
        expect(mockScriptRunner.run.mock.calls[1][0]).toBe('folder-script');
        expect(mockScriptRunner.run.mock.calls[2][0]).toBe('request-script');
    });

    it('should skip collection scripts when specified', async () => {
        const request = createMockRequest({
            collection: { scripts: { preRequest: 'collection-script' } },
            scripts: { preRequest: 'request-script' }
        });

        await pipeline.executePreRequest(request, mockContext, {
            skipScripts: ['collection']
        });

        expect(mockScriptRunner.run).toHaveBeenCalledTimes(1);
        expect(mockScriptRunner.run).toHaveBeenCalledWith('request-script', expect.any(Object));
    });
});
```

---

## 9. Extension Points Summary

| Extension Point | Interface | How to Extend |
|-----------------|-----------|---------------|
| 添加新 Collection 格式 | `ICollectionParser` | 实现接口，注册到 `ParserRegistry` |
| 更换 HTTP 客户端 | `IHttpClient` | 实现接口（如 axios, got） |
| 更换脚本引擎 | `IScriptRunner` | 实现接口（如 quickjs, isolated-vm） |
| 更换变量语法 | `IVariableInterpolator` | 实现接口（如 `${var}` instead of `{{var}}`） |
| 更换存储后端 | `IEnvironmentStore` | 实现接口（如 Redis, cloud storage） |

---

## 10. Implementation Checklist

### Phase 3a: Extract @http-forge/core

**Step 1: Setup Package Structure**
- [ ] Create `packages/core/` directory structure
- [ ] Setup `package.json` (no VS Code dependencies)
- [ ] Setup `tsconfig.json` with correct paths

**Step 2: Extract Interfaces (from `src/services/interfaces/`)**
- [ ] Extract `ICollectionLoader` → `ICollectionParser`
- [ ] Extract `IEnvironmentConfigService` → `IEnvironmentStore`
- [ ] Extract `IHttpRequestService` → `IHttpClient`
- [ ] Create `IFileSystem` abstraction (new)
- [ ] Extract `IScriptExecutor` → `IScriptRunner`
- [ ] Create `IScriptPipeline` (new)
- [ ] Create `IVariableInterpolator` from `VariableReplacer`

**Step 3: Extract Pure Node.js Components**
- [ ] Copy `src/services/request-execution/variable-replacer.ts` → `implementations/mustache-interpolator.ts`
- [ ] Copy `src/services/request-execution/script-executor.ts` → `implementations/vm2-script-runner.ts`
  - [ ] Remove `vscode.*` imports
  - [ ] Replace console output with injectable logger
- [ ] Copy `src/services/request-execution/data-file-parser.ts` → keep as utility
- [ ] Copy `src/services/request-execution/script-session.ts` → keep for script context

**Step 4: Extract Services (with VS Code dependency removal)**
- [ ] Extract `src/services/collection/` → `services/collection-loader.ts`
  - [ ] Replace `vscode.workspace.fs` with `IFileSystem`
  - [ ] Keep `JsonCollectionLoader` and `FolderCollectionLoader` strategies
- [ ] Extract `src/services/environment-config-service.ts` → `services/environment-resolver.ts`
  - [ ] Replace `vscode.workspace.workspaceFolders` with constructor param
  - [ ] Replace `vscode.workspace.fs` with `IFileSystem`
- [ ] Extract `src/services/http-request-service.ts` → `services/request-executor.ts`
  - [ ] Replace `vscode.workspace.getConfiguration` with config object
  - [ ] Remove VS Code error dialogs

**Step 5: Create New Components**
- [ ] Create `services/parser-registry.ts` (O/C principle)
- [ ] Create `services/script-pipeline.ts` (3-level script execution)
- [ ] Create `parsers/http-forge-parser.ts`
- [ ] Create `implementations/node-file-system.ts`
- [ ] Create `implementations/fetch-http-client.ts`

**Step 6: Extract DI Container**
- [ ] Extract `src/services/service-container.ts` → `container.ts`
  - [ ] Remove `ServiceIdentifiers.ExtensionContext`
  - [ ] Remove `ServiceIdentifiers.WorkspaceFolder`
  - [ ] Add `forgeRoot: string` as base config
  - [ ] Keep Symbol-based service identifiers

**Step 7: Write Unit Tests**
- [ ] Create `__tests__/mocks/` with mock implementations
- [ ] Test `VariableReplacer` (should pass with existing logic)
- [ ] Test `CollectionLoader` with mock `IFileSystem`
- [ ] Test `ScriptPipeline` with mock `IScriptRunner`
- [ ] Test `RequestExecutor` with all mocks

### Phase 3b: Build @http-forge/standalone

- [ ] Create `packages/standalone/` directory
- [ ] Implement `FlowRuntime` (the `f` object)
  - [ ] `f.send()` - delegates to core `RequestExecutor`
  - [ ] `f.set()/get()` - flow-scoped variables
  - [ ] `f.env.get()/set()` - environment variables
- [ ] Implement Jest-like `expect` assertions
- [ ] Implement CLI runner (`npx http-forge run`)
- [ ] Create `.flow.js` file loader
- [ ] Write integration tests

### Phase 3c: Build @http-forge/playwright

- [ ] Create `packages/playwright/` directory
- [ ] Implement Playwright fixture using core
- [ ] Integrate with Playwright's `expect`
- [ ] Write Playwright test examples

### Phase 3d: Refactor VS Code Extension

- [ ] Add `@http-forge/core` as dependency
- [ ] Create `VsCodeFileSystem` implementing `IFileSystem`
- [ ] Replace internal services with core package:
  - [ ] `CollectionService` → uses `CollectionLoader` from core
  - [ ] `EnvironmentConfigService` → uses `EnvironmentResolver` from core
  - [ ] `HttpRequestService` → uses `RequestExecutor` from core
- [ ] Keep VS Code-specific services:
  - [ ] `ConsoleService` (VS Code output channel)
  - [ ] `RequestHistoryService` (VS Code global state)
  - [ ] Tree view providers
- [ ] Ensure all existing functionality still works
- [ ] Add "Run Flow" command to context menu

### Phase 4: Postman Support (Future)

> **目标**: 让使用 Postman 的团队无缝迁移到 HTTP Forge

**Step 1: Implement PostmanParser**
- [ ] Create `parsers/postman-parser.ts` implementing `ICollectionParser`
- [ ] Parse Postman Collection v2.1 format
- [ ] Map Postman structures to `UnifiedCollection`:
  - [ ] `item[]` → `requests[]` + `folders[]`
  - [ ] `request.url` → `url` (handle Postman URL object format)
  - [ ] `request.header[]` → `headers`
  - [ ] `request.body` → `body` (handle all Postman body types)
  - [ ] `event[].script` → `scripts.preRequest` / `scripts.postResponse`
- [ ] Handle Postman variables: `{{var}}` syntax (same as HTTP Forge ✅)
- [ ] Register in `ParserRegistry`

**Step 2: Implement Postman Environment Parser**
- [ ] Parse Postman environment export format
- [ ] Map to HTTP Forge environment structure
- [ ] Support `initial` vs `current` values

**Step 3: Postman Script Compatibility**
- [ ] Map Postman's `pm.*` API to HTTP Forge's script context:
  ```typescript
  // Postman                      → HTTP Forge
  pm.environment.get('key')       → env.get('key')
  pm.environment.set('key', val)  → env.set('key', val)
  pm.variables.get('key')         → vars.get('key')
  pm.response.json()              → response.json()
  pm.expect(value)                → expect(value)  // or use chai
  ```
- [ ] Provide compatibility shim for gradual migration

**Step 4: Import CLI Command**
- [ ] `http-forge import postman <file>` - convert and save as HTTP Forge format
- [ ] `http-forge import postman <file> --keep-format` - use directly without conversion
- [ ] Handle collection + environment together

**Step 5: Documentation & Migration Guide**
- [ ] "Migrating from Postman" guide
- [ ] Feature comparison table
- [ ] Script migration examples

### Phase 5: Additional Importers (Future)

- [ ] **Insomnia**: `parsers/insomnia-parser.ts`
- [ ] **OpenAPI/Swagger**: `parsers/openapi-parser.ts` - generate collections from spec
- [ ] **HAR**: `parsers/har-parser.ts` - import from browser network capture
- [ ] **cURL**: `parsers/curl-parser.ts` - import from cURL commands
