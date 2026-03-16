# HTTP Forge V2 Implementation Plan

## 概述

本文档定义了 HTTP Forge 的新架构方案，包括：
1. 统一配置文件 (`http-forge.config.json`)
2. 文件夹结构存储 (Collections, Environments, Flows)
3. Code Flows 编程式测试
4. 详细实现计划

---

## 背景与决策记录

### 项目背景

HTTP Forge 是一个 VS Code 扩展插件，用于 API 测试，类似于 Postman。项目仍在开发孵化中，未发布，没有实际用户，因此不需要向后兼容。

**代码位置:**
- 主项目: `http-forge/` - 独立的 VS Code 扩展
- 相关项目: `agl-essentials/` - 另一个扩展，包含部分共享代码

### 关键决策

| 决策 | 结论 | 原因 |
|------|------|------|
| **保留 Test Suite** | ✅ 保留 | 为 UI 偏好用户提供选择 |
| **保留 Collection Runner** | ✅ 保留 | 简单场景使用 |
| **添加 Code Flows** | ✅ 新增 | 编程式测试，可导入 workspace 模块 |
| **存储格式** | 两种都支持 | `format: "folder"` 或 `format: "json"`，通过配置切换 |
| **配置方式** | 配置文件 | 删除 VS Code Settings，统一用 `http-forge.config.json` |
| **向后兼容** | 不需要 | 无现有用户 |

### Test Suite vs Code Flows 定位

| 工具 | 定位 | 用户 |
|------|------|------|
| **Request Tester** | 单个请求探索 | 所有用户 |
| **Collection Runner** | 单 Collection 批量运行 | 简单场景 |
| **Test Suite** | UI 拖拽构建跨 Collection 测试 | 偏好 UI 的用户 |
| **Code Flows** | 编程式测试，可导入项目代码 | 开发者 |

### Code Flows 的独特价值（vs Postman）

1. **可导入 workspace 模块** - 复用项目中的验证器、数据生成器
2. **真正的编程能力** - if/else, for 循环, 完整 JS
3. **Git 原生** - .flow.js 文件直接版本控制
4. **VS Code 集成** - 不离开编辑器

---

## 1. 配置系统

### 1.1 配置文件位置

```
workspace-root/
├── http-forge.config.json      # 主配置文件 (提交到 Git)
├── http-forge.secrets.json     # 旧版/遗留（已废弃，忽略）
└── http-forge/                 # 项目根目录
```

### 1.2 配置文件格式

**http-forge.config.json:**

```json
{
  "version": "1.0",
  
  "storage": {
    "format": "folder",
    "root": "./http-forge",
    "history": "./.http-forge-cache/histories",
    "results": "./.http-forge-cache/results"
  },
  
  "request": {
    "timeout": 30000,
    "followRedirects": true,
    "maxRedirects": 10,
    "strictSSL": true
  },
  
  "scripts": {
    "modulePaths": ["./src", "./lib"]
  },
  
  "runner": {
    "resultsRetentionDays": 7,
    "indexPageSize": 1000,
    "recentErrorsLimit": 20
  },
  
  "environments": {
    "default": "dev"
  },
  
  "proxy": null
}
```

<!-- workspace-level secrets file support removed; see environment-specific _secrets.json -->

### 1.3 配置接口定义

```typescript
// src/services/config/config.interface.ts

export interface HttpForgeConfig {
  version: string;
  
  storage: {
    format: 'folder' | 'json';
    root: string;
    history: string;
    results: string;
  };
  
  request: {
    timeout: number;
    followRedirects: boolean;
    maxRedirects: number;
    strictSSL: boolean;
  };
  
  scripts: {
    modulePaths: string[];
  };
  
  runner: {
    resultsRetentionDays: number;
    indexPageSize: number;
    recentErrorsLimit: number;
  };
  
  environments: {
    default: string;
  };
  
  proxy?: {
    http?: string;
    https?: string;
    bypass?: string[];
  } | null;
}

// workspace-level secrets interface removed; secrets now belong in per-
// environment configs under http-forge/environments.
```

### 1.4 配置发现逻辑

```typescript
// 配置文件发现顺序
1. 检查 workspace-root/http-forge.config.json
2. 如果不存在，使用默认配置
3. 自动检测 http-forge/ 或 .http-forge/ 目录

// VS Code 提供 workspace 路径
const workspaceFolders = vscode.workspace.workspaceFolders;
const workspaceRoot = workspaceFolders[0].uri.fsPath;
const configPath = path.join(workspaceRoot, 'http-forge.config.json');
```

### 1.5 两种存储格式

| 格式 | 配置值 | 结构 | 适用场景 |
|------|--------|------|----------|
| **JSON** | `format: "json"` | `collections/my-collection.json` | 简单项目、快速开始 |
| **Folder** | `format: "folder"` | `collections/my-collection/request.json` | Git 友好、大型项目、脚本独立 |

两种格式通过 `storage.format` 配置切换，CollectionService 使用不同的 Loader。

---

## 2. 目录结构

### 2.1 完整结构

```
workspace-root/
├── http-forge.config.json
├── http-forge.secrets.json          (gitignore)
│
├── http-forge/                       # 项目根目录 (可配置)
│   │
│   ├── collections/
│   │   └── {collection-slug}/
│   │       ├── collection.json       # { id, name, description }
│   │       ├── scripts/
│   │       │   ├── pre-request.js
│   │       │   └── post-response.js
│   │       │
│   │       └── {folder-slug}/
│   │           ├── folder.json       # { id, name }
│   │           ├── scripts/
│   │           │   ├── pre-request.js
│   │           │   └── post-response.js
│   │           │
│   │           └── {request-slug}/
│   │               ├── request.json  # { id, name, method, url, headers, body, auth }
│   │               ├── body.json     # 可选，大型 body 独立存储
│   │               └── scripts/
│   │                   ├── pre-request.js
│   │                   └── post-response.js
│   │
│   ├── environments/
│   │   ├── globals.json              # 全局变量
│   │   ├── default-headers.json      # 默认 Headers
│   │   ├── dev.json
│   │   ├── sit.json
│   │   └── prod.json
│   │
│   └── flows/
│       ├── login-test.flow.js
│       └── e2e-checkout.flow.js
│
└── .http-forge-cache/                (gitignore)
    ├── histories/
    └── results/
```

### 2.2 文件格式定义

**collection.json:**
```json
{
  "id": "col_abc123",
  "name": "User API",
  "description": "User management endpoints"
}
```

**folder.json:**
```json
{
  "id": "fld_xyz789",
  "name": "Authentication"
}
```

**request.json:**
```json
{
  "id": "req_111222",
  "name": "Login",
  "method": "POST",
  "url": "{{baseUrl}}/auth/login",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "type": "json",
    "content": {
      "username": "{{username}}",
      "password": "{{password}}"
    }
  },
  "auth": {
    "type": "none"
  }
}
```

**environment (dev.json):**
```json
{
  "id": "env_dev",
  "name": "Development",
  "variables": {
    "baseUrl": "http://localhost:3000",
    "username": "testuser",
    "password": "testpass"
  }
}
```

### 2.3 命名规则

| 概念 | 存储位置 | 唯一性 | 说明 |
|------|----------|--------|------|
| **Slug (文件夹名)** | 文件系统 | 同级目录唯一 | URL-safe, 小写, 连字符 |
| **Name (显示名)** | JSON 文件 | 不要求唯一 | 用户看到的名称 |
| **ID** | JSON 文件 | 全局唯一 | 内部引用，永不改变 |

**Slug 生成规则:**
- 小写
- 空格 → 连字符 `-`
- 移除特殊字符
- 重复时自动添加数字后缀: `login-request`, `login-request-2`

**重命名策略:**
- **默认行为**: 只改 JSON 中的 `name`，文件夹名不变
- **可选行为**: 用户选择同时重命名文件夹
- **UI 设计**:
  ```
  ┌─────────────────────────────────────┐
  │ Rename Request                       │
  ├─────────────────────────────────────┤
  │ Current name: Login Request          │
  │ New name:     [User Login        ]   │
  │                                       │
  │ ☐ Also rename folder                 │
  │   (login_request → user_login)       │
  │   ⚠️ This will update Flow references │
  │                                       │
  │        [Cancel]  [Rename]            │
  └─────────────────────────────────────┘
  ```
- **Flow 引用稳定性**: 推荐使用 ID 引用 (`#req_abc123`) 以避免重命名破坏引用

---

## 3. Code Flows

### 3.1 Flow 文件格式

**位置:** `http-forge/flows/*.flow.js`

**基本结构:**
```javascript
// http-forge/flows/login-test.flow.js

export default async function(f) {
  // 设置环境
  f.use('dev');
  
  // 发送请求
  const loginRes = await f.send('forgerock-login/auth/login', {
    body: { username: 'test', password: 'secret' }
  });
  
  // 断言
  f.expect(loginRes.status).toBe(200);
  
  // 提取变量
  const token = loginRes.body.accessToken;
  f.session.set('token', token);
  
  // 链式请求
  const userRes = await f.send('forgerock-login/auth/user-sessions', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  f.expect(userRes.status).toBe(200);
}
```

### 3.2 Flow API

```typescript
interface Flow {
  // ===== 环境 =====
  use(environmentName: string): void;
  env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;  // 持久化到环境配置
  };
  
  // ===== 发送请求 =====
  send(path: string, overrides?: RequestOverrides): Promise<Response>;
  send(id: string): Promise<Response>;  // 用 #req_xxx 格式
  
  // ===== 变量作用域 =====
  // Flow 作用域 - 仅当前 Flow 有效
  set(key: string, value: any): void;
  get(key: string): any;
  
  // Session 作用域 - 当前运行会话有效，跨请求持久
  session: {
    set(key: string, value: any): void;
    get(key: string): any;
  };
  
  // ===== 断言 =====
  expect(value: any): Expectation;
}

/*
 * 变量作用域层级 (解析优先级: 内层覆盖外层):
 * 
 * ┌─────────────────────────────────────────────┐
 * │  Environment Variables (持久化到文件)        │
 * │  ┌─────────────────────────────────────────┐│
 * │  │  Session Variables (运行会话期间)        ││
 * │  │  ┌─────────────────────────────────────┐││
 * │  │  │  Flow Variables (单个 Flow 内)      │││
 * │  │  │  ┌─────────────────────────────────┐│││
 * │  │  │  │  Request Variables (单请求)     ││││
 * │  │  │  └─────────────────────────────────┘│││
 * │  │  └─────────────────────────────────────┘││
 * │  └─────────────────────────────────────────┘│
 * └─────────────────────────────────────────────┘
 */

interface RequestOverrides {
  params?: Record<string, string>;              // Path 参数
  query?: Record<string, string>;               // Query 参数
  headers?: Record<string, string>;             // Headers
  body?: any;                                   // Body
}

interface Response {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  time: number;                                 // 响应时间 (ms)
}

interface Expectation {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toContain(substring: string): void;
  toBeLessThan(max: number): void;
  toBeGreaterThan(min: number): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
}
```

### 3.3 Request 引用方式

```javascript
// 方式 1: 路径字符串 (推荐)
await f.send('collection-slug/folder-slug/request-slug');

// 方式 2: 用 ID
await f.send('#req_abc123');

// 方式 3: 带覆盖参数
await f.send('user-api/auth/login', {
  body: { username: 'override' },
  headers: { 'X-Custom': 'value' }
});
```

### 3.4 导入 Workspace 模块

```javascript
// flows/checkout.flow.js
import { generateTestUser } from '../../src/test-helpers';
import { validateOrder } from '../../src/validators';

export default async function(f) {
  const testUser = generateTestUser();  // 使用项目代码
  
  await f.send('auth/login', { body: testUser });
  
  const order = await f.send('orders/create');
  validateOrder(order.body);            // 使用项目验证器
}
```

### 3.5 Flow 运行

**命令面板:**
```
> HTTP Forge: Run Flow
> HTTP Forge: Run Flow in Environment...
```

**右键菜单 (在 .flow.js 文件上):**
```
▶ Run Flow
▶ Run Flow in dev
▶ Run Flow in sit
```

**结果显示:**
```
┌─────────────────────────────────────┐
│ Flow: login-test.flow.js            │
│ Environment: dev                    │
│ ─────────────────────────────────── │
│ ✓ forgerock-login/auth/login   200   45ms   │
│ ✓ forgerock-login/auth/sessions 200  32ms   │
│ ─────────────────────────────────── │
│ ✓ 2 passed, 0 failed                │
│ Duration: 77ms                      │
└─────────────────────────────────────┘
```

---

## 4. 实现计划

### Phase 1: 配置系统重构 ✅ 已完成

**目标:** 用 `http-forge.config.json` 替代 VS Code Settings

**步骤:**

| 步骤 | 任务 | 文件 | 状态 |
|------|------|------|------|
| 1.1 | 创建配置接口定义 | `src/services/config/config.interface.ts` | ✅ 完成 |
| 1.2 | 创建 ConfigService | `src/services/config/config-service.ts` | ✅ 完成 |
| 1.3 | 创建默认配置 | `src/services/config/default-config.ts` | ✅ 完成 |
| 1.4 | 修改 collection-service.ts | 使用 ConfigService | ✅ 完成 |
| 1.5 | 修改 environment-config-service.ts | 使用 ConfigService | ✅ 完成 |
| 1.6 | 修改 script-executor.ts | 使用 ConfigService | ✅ 完成 |
| 1.7 | 修改 result-storage-service.ts | 使用 ConfigService | ✅ 完成 |
| 1.8 | 修改 test-suite-service.ts | 使用 ConfigService | ✅ 完成 |
| 1.9 | 删除 package.json 中的 configuration | 清理旧配置 | ✅ 完成 |
| 1.10 | 测试 | 确保功能正常 | ✅ 完成 |

**完成时间:** 2024年

---

### Phase 2: 文件夹存储格式 ✅ 已完成

**目标:** 支持文件夹结构存储 Collections

**步骤:**

| 步骤 | 任务 | 文件 | 状态 |
|------|------|------|------|
| 2.1 | 定义 ICollectionLoader 接口 | `src/services/collection/collection-loader.interface.ts` | ✅ 完成 |
| 2.2 | 重构现有 JSON Loader | `src/services/collection/json-collection-loader.ts` | ✅ 完成 |
| 2.3 | 创建 Folder Loader | `src/services/collection/folder-collection-loader.ts` | ✅ 完成 |
| 2.4 | 创建 Loader Factory | `src/services/collection/collection-loader-factory.ts` | ✅ 完成 |
| 2.5 | 更新 CollectionService | 使用 Loader Factory | ✅ 完成 |
| 2.6 | 创建示例项目结构 | `http-forge/collections/...` | ✅ 完成 |
| 2.7 | 支持多种 body 文件类型 | body.json/xml/txt/html/js/graphql | ✅ 完成 |
| 2.8 | 添加 item-level 操作 | saveItem/deleteItem/updateItem/moveItem | ✅ 完成 |

**完成时间:** 2026年

---

### Phase 3: Code Flows 实现

**目标:** 支持编程式测试流程

**步骤:**

| 步骤 | 任务 | 文件 |
|------|------|------|
| 3.1 | 定义 Flow 接口 | `src/services/flows/flow.interface.ts` |
| 3.2 | 创建 Flow Runtime | `src/services/flows/flow-runtime.ts` |
| 3.3 | 创建 Expectation API | `src/services/flows/expectation.ts` |
| 3.4 | 创建 Flow Discovery Service | `src/services/flows/flow-discovery-service.ts` |
| 3.5 | 创建 Flow Executor Service | `src/services/flows/flow-executor-service.ts` |
| 3.6 | 创建 Flow Results Panel | `src/webview-panels/flow-results/` |
| 3.7 | 注册命令: Run Flow | `src/commands/run-flow.ts` |
| 3.8 | 添加 Tree View: Flows | `src/providers/flows-tree-provider.ts` |
| 3.9 | 创建示例 Flow | `http-forge/flows/example.flow.js` |
| 3.10 | 测试 | 确保 Flow 能正常执行 |

**预估时间:** 3-5 天

---

## 5. .gitignore 更新

```gitignore
# HTTP Forge
# legacy secrets file (ignored by extension)
http-forge.secrets.json
.http-forge-cache/
```

---

## 6. 文件变更清单

### 新增文件

```
src/services/config/
  config.interface.ts
  config-service.ts
  default-config.ts

src/services/collection/
  collection-loader.interface.ts
  json-collection-loader.ts
  folder-collection-loader.ts
  collection-loader-factory.ts

src/services/flows/
  flow.interface.ts
  flow-runtime.ts
  expectation.ts
  flow-discovery-service.ts
  flow-executor-service.ts

src/webview-panels/flow-results/
  flow-results-panel.ts
  handlers/
  index.html
  style.css

src/providers/
  flows-tree-provider.ts

src/commands/
  run-flow.ts
```

### 修改文件

```
src/services/collection-service.ts
src/services/environment-config-service.ts
src/services/request-execution/script-executor.ts
src/services/test-suite/result-storage-service.ts
src/services/test-suite/test-suite-service.ts
package.json (删除 contributes.configuration)
```

---

## 7. 验收标准

### Phase 1 验收 ✅
- [x] `http-forge.config.json` 能被正确读取
- [x] 所有原有功能正常工作
- [x] VS Code Settings 中不再有 httpForge 配置项
- [x] 创建了 `http-forge.config.example.json` 示例配置
- [x] 创建了 JSON Schema 提供 IntelliSense

### Phase 2 验收 ✅
- [x] 能读取文件夹结构的 Collections
- [x] 能创建新的 Collection/Folder/Request 到文件夹
- [x] 能重命名/删除 Collection/Folder/Request
- [x] 支持 item-level 操作 (saveItem/deleteItem/updateItem/moveItem)
- [x] 支持多种 body 文件类型 (body.json/xml/txt/html/js/graphql)
- [x] 可以通过配置切换 `format: "folder"` / `format: "json"`

### Phase 3 验收
- [ ] Flow 文件能被发现和列出
- [ ] Flow 能正常执行
- [ ] Flow 中能发送请求并获取响应
- [ ] Flow 中的断言能正常工作
- [ ] Flow 中能导入 workspace 模块
- [ ] Flow 结果能正确显示

---

## 8. 时间表

| Phase | 任务 | 预估时间 | 状态 |
|-------|------|----------|------|
| 1 | 配置系统重构 | 1-2 天 | ✅ 已完成 |
| 2 | 文件夹存储格式 | 2-3 天 | ✅ 已完成 |
| 3 | Code Flows 实现 | 3-5 天 | 待开始 |
| **总计** | | **6-10 天** | |

---

## 9. 风险与注意事项

1. **现有数据迁移**: 不需要，无现有用户
2. **向后兼容**: 不需要，插件未发布
3. **测试覆盖**: 需要为新功能编写测试
4. **文档更新**: 完成后需要更新 README 和使用文档

---

## 10. 现有代码中需要修改的配置读取位置

以下文件使用了 `vscode.workspace.getConfiguration('httpForge...')`，需要改为使用 ConfigService：

| 文件 | 当前使用的配置 |
|------|---------------|
| `src/services/collection-service.ts` | `httpForge.storage.basePath`, `collectionsFolder` |
| `src/services/environment-config-service.ts` | `httpForge.storage.basePath` |
| `src/services/request-execution/script-executor.ts` | `httpForge.scripts.customModulesPath` |
| `src/services/test-suite/result-storage-service.ts` | `httpForge.testSuite.resultsPath`, `indexPageSize`, `recentErrorsLimit` |
| `src/services/test-suite/test-suite-service.ts` | `httpForge.storage.basePath` |
| `src/webview-panels/test-suite/handlers/suite-run-handler.ts` | `httpForge.testSuite.*` |

**当前 package.json 中定义的配置项 (需要删除):**
- `httpForge.storage.basePath`
- `httpForge.storage.environmentsFile`
- `httpForge.storage.collectionsFolder`
- `httpForge.storage.historiesFolder`
- `httpForge.request.timeout`
- `httpForge.request.followRedirects`
- `httpForge.request.maxRedirects`
- `httpForge.request.strictSSL`
- `httpForge.scripts.customModulesPath`
- `httpForge.collectionRunner.resultsPath`
- `httpForge.collectionRunner.resultsRetentionDays`
- `httpForge.collectionRunner.indexPageSize`
- `httpForge.collectionRunner.recentErrorsLimit`

---

## 11. 讨论记录摘要

本实现方案基于以下讨论决策：

1. **Test Suite 定位**: 与 Postman Collection Runner 类似，但提供 P50/P90/P95/P99 统计和跨 Collection 支持。保留给偏好 UI 的用户。

2. **Code Flows 动机**: 提供编程式测试能力，核心优势是可以 `import` workspace 中的项目代码（验证器、数据生成器等）。

3. **存储格式选择**: 文件夹格式更 Git 友好（修改一个 request 只改一个文件），脚本独立为 `.js` 文件有语法高亮。但保留 JSON 格式供简单场景。

4. **配置统一**: 删除 VS Code Settings，全部使用 `http-forge.config.json`，因为：
   - 项目级配置应该提交到 Git
   - 团队成员共享配置
   - 不需要向后兼容

5. **Slug vs Name vs ID**:
   - Slug = 文件夹名，URL-safe，同级唯一
   - Name = 显示名，在 JSON 中，可以重复
   - ID = 内部引用，全局唯一，永不改变

6. **重命名策略**: 默认只改 Name，不改文件夹名，避免破坏 Flow 引用。

7. **Flow 中引用 Request**: 主要用路径字符串 (`collection/folder/request`)，也支持 ID 引用 (`#req_xxx`)。
