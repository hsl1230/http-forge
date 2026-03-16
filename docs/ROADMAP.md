# http-forge 功能增强实施方案

## 一、现状评估

### 已完成功能 ✅
- Collection 管理（树形结构、拖拽排序）
- 请求编辑器（方法、URL、Headers、Body）
- 环境变量管理
- Pre/Post 脚本（JavaScript）
- 断言测试
- Collection Runner（顺序执行 + 迭代）
- Cookie 管理
- Postman 格式导入
- 结果存储与虚拟滚动
- OpenAPI 3.0 双向导入导出（Schema 推断、编辑、示例生成）
- OAuth 2.0 认证（4 种 Grant Type + PKCE）
- **模板引擎** — Filter pipes (`{{var | upper | trim}}`), JS 表达式 (`{{price * quantity}}`), 字符串拼接, 18 个动态变量, 25+ 内置过滤器, 嵌套属性路径 (`a.b.c`), 5 步解析管道
- **Monaco IntelliSense** — 模板补全 (`{{` → 变量/动态变量/过滤器) + 脚本 API 补全 (`hf.`/`pm.`/`ctx.` → 完整 API 链), 支持所有 body 语言 (JSON/plaintext/XML/HTML/JS)
- **脚本模板预解析** — `{{variable}}` 在脚本源代码中自动解析 (执行前), 无需使用 `replaceIn()` 包裹; 过滤器、表达式、动态变量均可直接使用; 与 Postman 兼容 (`replaceIn()` 仍然安全)
- **GraphQL 增强** — Schema Introspection (一键获取 + 缓存), Context-Aware Auto-Complete (7 种上下文: root/selection_set/argument/argument_value/directive/fragment_type/variable_def), Monarch 语法高亮, Schema Explorer (类型树 + 搜索 + 点击插入), Operation Selector (多操作选择 + `operationName`); 零依赖实现 (自定义 tokenizer + 状态机, 无需 `graphql-js`)

### 待增强功能 🔄
- **Test Suite** - 统一替代 Collection Runner
- **性能统计** - P95/P99/错误率（轻量实现）
- **兼容 REST Client** - 支持 `.http`/`.rest` 文件，提供增强功能
- **导出 k6/JMeter** - 将 Collection/Suite 导出为专业压测工具脚本
- **Postman 双向兼容** - 支持导入和导出 Postman 格式

---

## 二、架构演进：Test Suite 统一模型

### 2.1 设计决策

**Collection Runner 统一为 Test Suite**，一套概念、一套代码：

```
之前：
┌─────────────────┐     ┌───────────────────┐
│   Collection    │────▶│ Collection Runner │ (临时，不保存)
└─────────────────┘     └───────────────────┘

之后：
┌─────────────────┐     ┌─────────────────┐
│   Collection    │────▶│   Test Suite    │ (可保存，可临时运行)
└─────────────────┘     └─────────────────┘
```

### 2.2 统一后的优势

| 方面 | Collection Runner (移除) | Test Suite (统一) |
|------|-------------------------|-------------------|
| 数据来源 | 单个 Collection | 单个或多个 Collection |
| 配置持久化 | ❌ 临时 | ✅ 可选保存 |
| 复用性 | ❌ 每次重新配置 | ✅ QA 可复用测试配置 |
| 代码维护 | 两套代码 | 一套代码 |

### 2.3 用户操作流程

```
入口1: Collection 右键 → "Run All"
┌─────────────────────────────────────────────────────────────┐
│  自动创建临时 Suite，预填充该 Collection 全部请求           │
│  → 直接打开运行界面                                         │
│  → 用户可选择 [Run] 或 [Save & Run]                        │
└─────────────────────────────────────────────────────────────┘

入口2: Test Suites → [+] 新建
┌─────────────────────────────────────────────────────────────┐
│  空白 Suite                                                 │
│  → 从多个 Collection 选择请求                               │
│  → 排序、配置                                               │
│  → [Save] 或 [Save & Run]                                  │
└─────────────────────────────────────────────────────────────┘

入口3: 点击已保存的 Suite
┌─────────────────────────────────────────────────────────────┐
│  打开该 Suite                                               │
│  → 可编辑或直接运行                                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Tree View 结构

```
HTTP-FORGE
├── 📁 Collections              ← 保持不变（按系统组织）
│   ├── 📂 用户系统
│   │   ├── 🔹 登录
│   │   └── 🔹 注册
│   ├── 📂 订单系统
│   └── 📂 支付系统
│
├── 📁 Test Suites              ← 新增
│   ├── 🧪 完整下单流程
│   ├── 🧪 回归测试
│   └── 🧪 用户系统-全量
│
└── 📁 Environments             ← 保持不变
```

### 2.5 Test Suite 数据结构

```typescript
interface TestSuite {
    id: string;
    name: string;
    description?: string;
    
    // 请求引用（非复制）
    steps: Array<{
        collectionId: string;
        requestId: string;
    }>;
    
    // 运行配置
    config: {
        iterations: number;           // 迭代次数
        delayBetweenRequests: number; // 请求间隔 (ms)
        stopOnError: boolean;
        environment?: string;
    };
    
    createdAt: number;
    updatedAt: number;
}
```

---

## 三、性能统计功能（轻量实现）

### 3.1 定位

```
不是：复杂并发压测（VUs, ramp-up, 混合负载...）
而是：单用户顺序执行，统计响应时间分布

开发者真正的需求：
"这个 API 我连续调 100 次，P95 多少？稳不稳定？"
```

### 3.2 UI 设计（与 Collection Runner 一致）

```
┌─ Test Suite ─────────────────────────────────────────────────────────────────┐
│  ┌─ Header ──────────────────────────────────────────────────────────────┐   │
│  │  Test Suite: 用户登录接口测试              [▶ Run] [⏹ Stop]           │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─ Requests (左 50%) ─────────────┐│┌─ Config & Results (右 50%) ────────┐  │
│  │                                 │││                                   │  │
│  │  Requests: [All] [None] [+ Add] │││  Environment: dev (只读)          │  │
│  │  ┌─────────────────────────┐    │││  Iterations: [ 100 ]              │  │
│  │  │ ☑ GET  Auth/登录   [×]⋮⋮│    │││  Delay: [   0 ] ms                │  │
│  │  │ ☑ GET  User/获取...[×]⋮⋮│    │││  Data File: [Browse] [×]          │  │
│  │  │ ☑ POST User/更新...[×]⋮⋮│    │││  ☑ Stop on error                  │  │
│  │  │                         │    │││  ☐ Read from shared session       │  │
│  │  │ ↑ 拖拽排序              │    │││  ☐ Write to shared session        │  │
│  │  │                         │    │││                                   │  │
│  │  │ 格式：                  │   ←│→│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │  │
│  │  │ [Collection] Folder/Name│   拖││                                   │  │
│  │  │                         │   拽││  Progress: 67/100                 │  │
│  │  │                         │   调││  ████████████░░░░░░  67%          │  │
│  │  │                         │   整││  ✓ 198  ✗ 2  ○ 0                  │  │
│  │  │                         │   宽││                                   │  │
│  │  │                         │   度││  [Results] [Statistics]  ← Tabs   │  │
│  │  │                         │    │││  ┌─────────────────────────────┐  │  │
│  │  └─────────────────────────┘    │││  │ (Tab 内容区)                │  │  │
│  │                                 │││  └─────────────────────────────┘  │  │
│  │  [Save Suite]                   │││  [Export JSON] [Export HTML]      │  │
│  └─────────────────────────────────┘│└───────────────────────────────────┘  │
│                                                                              │
│  ┌─ Console ──────────────────────────────────────────────────────────────┐  │
│  │ Ready to run collection                                          [Clear]│  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**面板调整**：
- 左右默认各占 **50%**
- 中间分隔线支持 **拖拽调整宽度**

**右侧区域结构**：
```
┌─ Config ─────────────────────┐
│ Environment / Iterations ... │
└──────────────────────────────┘
         ↓
┌─ Progress (独立，不属于Tab) ─┐
│ Progress bar + ✓ ✗ ○ 统计   │
└──────────────────────────────┘
         ↓
┌─ Tabs ───────────────────────┐
│ [Results] [Statistics]       │
│ ┌──────────────────────────┐ │
│ │ Tab 内容                 │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

**布局对比 Collection Runner**：

| 区域 | Collection Runner | Test Suite |
|------|------------------|------------|
| Header 右侧 | [Run] [Stop] | [Run] [Stop] ✅ 一致 |
| 左侧标题 | Requests: [All] [None] | Requests: [All] [None] [+ Add] |
| 左侧内容 | 请求列表 + 拖拽 | 请求列表 + 删除 + 拖拽 |
| 左侧底部 | — | [Save Suite] |
| 右上 | Config (Env/Iter/Delay/...) | Config ✅ 一致 |
| 右中 | Progress | Progress ✅ 一致 |
| 右下 | Results | Tabs (Results / Statistics) |
| 底部 | Console | Console ✅ 一致 |
| 面板宽度 | 可拖拽调整 | 可拖拽调整 ✅ 一致 |

**Requests 列表格式**：
```
[☑] [Method] [Collection] Folder/Subfolder/RequestName [×删除] [⋮⋮ 拖拽]
```
- **[Collection]**：跨 Collection 选择时显示来源（单 Collection 时可省略）
- **Folder 路径**：显示完整层级 `Folder/Subfolder/`
- **[×] 删除按钮**：移除该请求
- **⋮⋮ 拖拽手柄**：支持拖拽排序

### 3.3 Results Tab（与现有一致）

```
┌─ Results Tab ────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ ✓ [1-1] GET  Auth/登录           200 OK    45ms          ││
│  │ ✓ [1-2] GET  User/获取用户       200 OK    23ms          ││
│  │ ✗ [1-3] POST User/更新用户       500 Error 89ms          ││
│  │ ✓ [2-1] GET  Auth/登录           200 OK    42ms          ││
│  │ ...                                        (虚拟滚动)     ││
│  └──────────────────────────────────────────────────────────┘│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**格式**：`[状态] [迭代-序号] [Method] [Path/Name] [Status] [Duration]`

点击任意行可打开详情 Modal（Response Body / Headers / Request / Tests）

### 3.4 Statistics Tab（实时计算）

```
┌─ Statistics ─────────────────────────────────────────────────┐
│                                                              │
│  Summary:                                                    │
│  ├── Total Requests:  200 (3 requests × 67 iterations)      │
│  ├── Passed:          195                                   │
│  ├── Failed:          2                                     │
│  ├── Skipped:         3                                     │
│  ├── Pass Rate:       97.5%                                 │
│  └── Duration:        23.4s (running...)                    │
│                                                              │
│  ┌─ Response Time (实时更新) ──────────────────────────────┐│
│  │                                                         ││
│  │  Request              │ Min  │ Avg  │ P95  │ P99  │ Max ││
│  │  ──────────────────────────────────────────────────────  ││
│  │  Auth/登录            │ 23ms │ 45ms │ 89ms │112ms │145ms││
│  │  User/获取用户        │ 12ms │ 23ms │ 45ms │ 67ms │ 89ms││
│  │  User/更新用户        │ 45ms │ 89ms │156ms │189ms │234ms││
│  │  ──────────────────────────────────────────────────────  ││
│  │  Overall              │ 12ms │ 52ms │134ms │178ms │234ms││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─ Error Summary ─────────────────────────────────────────┐│
│  │  500 Internal Server Error: 2                           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  [Export Report]                                             │
└──────────────────────────────────────────────────────────────┘
```

**实时计算**：每完成一个请求，Statistics 都会重新计算并更新显示

### 3.5 布局说明

| 区域 | 内容 | 说明 |
|------|------|------|
| 左侧 | Steps 列表 | 选择/排序要执行的请求 |
| 右上 | Run Options | 运行配置 |
| 右中 | Tabs (Results / Statistics) | 实时结果 + 实时统计 |
| 底部 | Console | 日志输出 |

```typescript
// 简单的百分位计算
function calculatePercentile(times: number[], p: number): number {
    const sorted = [...times].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}

// 统计计算
function calculateStatistics(results: RequestResult[]): Statistics {
    const times = results.map(r => r.duration);
    const sorted = [...times].sort((a, b) => a - b);
    
    return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        p50: calculatePercentile(times, 50),
        p90: calculatePercentile(times, 90),
        p95: calculatePercentile(times, 95),
        p99: calculatePercentile(times, 99),
    };
}
```

**不需要**：
- ❌ Worker 线程
- ❌ 并发调度
- ❌ VU 概念
- ❌ 实时图表
- ❌ 复杂负载模型

---

## 四、Test Suite 实现方案（最大化复用）

### 4.1 架构对比

```
现有 Collection Runner:
┌─────────────────────────────────────────────────────────────────┐
│  CollectionRunnerPanel                                          │
│  ├── CollectionStore (单 Collection 数据源)                     │
│  ├── Handlers                                                   │
│  │   ├── ReadyHandler                                           │
│  │   ├── RunHandler ──────▶ CollectionRequestExecutor           │
│  │   ├── BrowseDataHandler                                      │
│  │   └── ExportHandler                                          │
│  └── Services (100% 复用)                                       │
│      ├── CollectionRequestExecutor                              │
│      ├── VariableReplacer                                       │
│      ├── ScriptExecutor                                         │
│      ├── CookieJar                                              │
│      ├── ResultStorageService                                   │
│      └── DataFileParser                                         │
└─────────────────────────────────────────────────────────────────┘

Test Suite (复用 + 扩展):
┌─────────────────────────────────────────────────────────────────┐
│  TestSuitePanel                                                 │
│  ├── TestSuiteStore (多 Collection 数据源) ← 扩展               │
│  ├── Handlers                                                   │
│  │   ├── ReadyHandler ← 扩展                                    │
│  │   ├── SuiteRunHandler ← 扩展 RunHandler                     │
│  │   ├── BrowseDataHandler ← 100% 复用                         │
│  │   ├── ExportHandler ← 100% 复用                             │
│  │   └── StatisticsHandler ← 新增                               │
│  └── Services (100% 复用)                                       │
│      ├── CollectionRequestExecutor ← 复用                       │
│      ├── VariableReplacer ← 复用                                │
│      ├── ScriptExecutor ← 复用                                  │
│      ├── CookieJar ← 复用                                       │
│      ├── ResultStorageService ← 复用 (路径调整)                 │
│      ├── DataFileParser ← 复用                                  │
│      └── StatisticsService ← 新增                               │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 复用清单

| 组件 | 复用方式 | 说明 |
|------|----------|------|
| **Services (核心逻辑)** | | |
| CollectionRequestExecutor | 100% 复用 | 单个请求执行，无需修改 |
| VariableReplacer | 100% 复用 | 变量替换 |
| ScriptExecutor | 100% 复用 | Pre/Post 脚本 |
| CookieJar | 100% 复用 | Cookie 管理 |
| DataFileParser | 100% 复用 | 数据文件解析 |
| ResultStorageService | 复用 + 配置 | 调整存储路径 `.http-forge/results/suites/` |
| **Handlers** | | |
| BrowseDataHandler | 100% 复用 | 浏览数据文件 |
| ExportHandler | 100% 复用 | 导出 JSON/HTML |
| RunHandler | 扩展为 SuiteRunHandler | 支持跨 Collection 请求 |
| ReadyHandler | 扩展 | 支持 Suite 数据加载 |
| **前端 (Webview)** | | |
| main.js 核心逻辑 | 80% 复用 | 拖拽、checkbox、虚拟滚动 |
| style.css | 90% 复用 | 样式基本一致 |
| report-generator.js | 100% 复用 | 导出报告 |

### 4.3 新增组件

```typescript
// 1. TestSuiteService - Suite CRUD 操作
interface TestSuiteService {
    // CRUD
    createSuite(name: string, requests?: SuiteRequest[]): Promise<TestSuite>;
    getSuite(id: string): Promise<TestSuite | undefined>;
    getAllSuites(): Promise<TestSuite[]>;
    updateSuite(suite: TestSuite): Promise<void>;
    deleteSuite(id: string): Promise<void>;
    
    // 从 Collection 创建临时 Suite
    createTempSuiteFromCollection(collection: Collection): TestSuite;
}

// 2. TestSuite 数据结构
interface TestSuite {
    id: string;
    name: string;
    description?: string;
    
    // 跨 Collection 请求引用
    requests: SuiteRequest[];
    
    // 运行配置
    config: {
        iterations: number;
        delayBetweenRequests: number;
        stopOnError: boolean;
    };
    
    // 元数据
    isTemporary?: boolean;  // 临时 Suite，不保存
    createdAt: number;
    updatedAt: number;
}

interface SuiteRequest {
    collectionId: string;
    collectionName: string;  // 显示用
    requestId: string;
    // 缓存的显示信息（避免每次查 Collection）
    name: string;
    method: string;
    folderPath: string;
}

// 3. StatisticsService - 实时统计计算
interface StatisticsService {
    // 添加单个结果，实时更新统计
    addResult(requestName: string, duration: number, passed: boolean, error?: string): void;
    
    // 获取当前统计
    getStatistics(): RunStatistics;
    
    // 重置（新运行开始时）
    reset(): void;
}

interface RunStatistics {
    summary: {
        totalRequests: number;
        passed: number;
        failed: number;
        duration: number;
    };
    
    // 按请求名分组的统计
    byRequest: Map<string, RequestStatistics>;
    
    // 整体统计
    overall: RequestStatistics;
    
    // 错误汇总
    errors: Map<string, number>;  // error message -> count
}

interface RequestStatistics {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    durations: number[];  // 保留原始数据用于重新计算
}
```

### 4.4 文件结构

```
新增/修改:
├── src/services/
│   ├── test-suite-service.ts          ← 新增: Suite CRUD
│   └── statistics-service.ts          ← 新增: 实时统计
│
├── src/webview-panels/test-suite/     ← 新增目录
│   ├── index.ts                       ← Panel 入口
│   ├── test-suite-panel.ts            ← 基于 CollectionRunnerPanel
│   ├── interfaces.ts                  ← Suite 特定接口
│   ├── handlers/
│   │   ├── index.ts
│   │   ├── ready-handler.ts           ← 扩展，支持 Suite 加载
│   │   ├── suite-run-handler.ts       ← 基于 RunHandler，支持跨 Collection
│   │   ├── save-handler.ts            ← 新增: 保存 Suite
│   │   └── statistics-handler.ts      ← 新增: 统计计算
│   └── services/
│       └── test-suite-store.ts        ← 扩展 CollectionStore
│
├── src/providers/
│   └── test-suites-tree-provider.ts   ← 新增: Tree View
│
├── resources/features/test-suite/     ← 新增目录
│   ├── index.html                     ← 基于 collection-runner/index.html
│   ├── style.css                      ← 基于 collection-runner/style.css
│   └── modules/
│       ├── main.js                    ← 基于 collection-runner，添加统计 Tab
│       ├── statistics-panel.js        ← 新增: 统计面板
│       └── report-generator.js        ← 100% 复用

保持不变 (100% 复用):
├── src/services/collection-runner/    ← 全部复用
│   ├── collection-request-executor.ts
│   ├── variable-replacer.ts
│   ├── script-executor.ts
│   ├── cookie-jar.ts
│   ├── result-storage-service.ts
│   ├── data-file-parser.ts
│   └── interfaces.ts
```

### 4.5 SuiteRunHandler 核心逻辑（基于 RunHandler）

```typescript
/**
 * SuiteRunHandler - 扩展 RunHandler 支持跨 Collection 执行
 * 
 * 关键差异：
 * 1. 从 TestSuiteStore 获取请求（支持多 Collection）
 * 2. 每个请求需要加载其所属 Collection 的脚本
 */
export class SuiteRunHandler implements IMessageHandler {
    // ... 复用 RunHandler 的大部分逻辑

    private async startRun(
        suiteRequests: SuiteRequest[],  // 改变：Suite 请求列表
        config: RunConfiguration,
        messenger: IWebviewMessenger
    ): Promise<void> {
        // ... 初始化逻辑与 RunHandler 相同

        for (let iteration = 0; iteration < config.iterations; iteration++) {
            for (const suiteRequest of suiteRequests) {
                // 关键差异：从对应 Collection 获取完整请求数据
                const { request, collectionScripts, folderScriptsChain } = 
                    await this.testSuiteStore.getRequestWithScripts(
                        suiteRequest.collectionId,
                        suiteRequest.requestId
                    );

                // 复用 executeRequest 逻辑
                const result = await this.executeRequest(
                    request,
                    iterationVariables,
                    cookieJar,
                    collectionScripts,
                    folderScriptsChain,
                    environmentId
                );

                // 新增：更新实时统计
                this.statisticsService.addResult(
                    request.name,
                    result.duration,
                    result.passed,
                    result.error
                );

                // 发送统计更新
                messenger.postMessage({
                    type: 'statisticsUpdate',
                    statistics: this.statisticsService.getStatistics()
                });

                // ... 后续逻辑与 RunHandler 相同
            }
        }
    }
}
```

### 4.6 前端复用策略

```javascript
// main.js 复用清单

// 100% 复用
- renderRequestList()      // 渲染请求列表
- setupDragAndDrop()       // 拖拽排序
- handleCheckboxChange()   // checkbox 状态
- updateProgress()         // 进度更新
- updateResultsList()      // 结果列表（虚拟滚动）
- openResultModal()        // 结果详情弹窗
- escapeHtml()             // 工具函数

// 扩展
- initialize()             // 添加 Statistics Tab 初始化
- handleMessage()          // 添加 statisticsUpdate 处理

// 新增
- renderStatisticsPanel()  // Statistics Tab 渲染
- updateStatistics()       // 统计数据更新
- renderAddRequestModal()  // [+ Add] 请求选择器
- handleDeleteRequest()    // [×] 删除请求
- handleSaveSuite()        // 保存 Suite
```

### 4.7 实施步骤

```
Phase 1: 基础架构 (2天)
─────────────────────────
1. 创建 TestSuiteService (CRUD + 存储)
2. 创建 StatisticsService (实时统计)
3. 创建 TestSuitesTreeProvider (Tree View)
4. 注册 Tree View 和命令

Phase 2: Panel 框架 (1天)
─────────────────────────
1. 复制 collection-runner → test-suite
2. 创建 TestSuitePanel (基于 CollectionRunnerPanel)
3. 创建 TestSuiteStore (扩展 CollectionStore)

Phase 3: Handlers (2天)
─────────────────────────
1. 扩展 ReadyHandler (支持 Suite 加载)
2. 创建 SuiteRunHandler (基于 RunHandler)
3. 创建 SaveHandler (保存 Suite)
4. 创建 StatisticsHandler (统计计算)

Phase 4: 前端 UI (2天)
─────────────────────────
1. 添加 Statistics Tab
2. 添加 [+ Add] 请求选择器
3. 添加 [×] 删除按钮
4. 添加 [Save Suite] 按钮
5. 添加面板宽度拖拽

Phase 5: 集成测试 (1天)
─────────────────────────
1. 从 Collection 右键 "Run All"
2. 从 Tree View 新建 Suite
3. 跨 Collection 添加请求
4. 运行 + 统计验证

Phase 6: 清理 (0.5天)
─────────────────────────
1. 更新 Collection 右键菜单
2. 移除旧 Collection Runner 入口（可选保留）
```

### 4.8 存储结构

```
.http-forge/
├── collections/           ← 保持不变
├── suites/                ← 新增: Suite 定义
│   ├── full-order-flow.suite.json
│   └── regression-test.suite.json
├── environments/          ← 保持不变
└── results/
    ├── collections/       ← 保持不变 (Collection Runner 结果)
    │   └── {collectionId}/
    └── suites/            ← 新增: Suite 运行结果
        └── {suiteId}/
            └── {runId}/
                ├── manifest.json
                ├── summary.json
                └── results/
```

### 4.9 时间估算

| 阶段 | 任务 | 时间 |
|------|------|------|
| Phase 1 | 基础架构 (Services + Tree View) | 2天 |
| Phase 2 | Panel 框架 (复制 + 扩展) | 1天 |
| Phase 3 | Handlers (RunHandler 扩展) | 2天 |
| Phase 4 | 前端 UI (Statistics Tab + Add/Delete) | 2天 |
| Phase 5 | 集成测试 | 1天 |
| Phase 6 | 清理 | 0.5天 |
| **总计** | | **8.5天** |

---

## 五、Phase 2: REST Client 兼容 + 导入导出

| 任务 | 时间 | 优先级 |
|------|------|--------|
| `.http`/`.rest` 文件解析器 | 2天 | P0 |
| 语法高亮 + TextMate Grammar | 0.5天 | P0 |
| CodeLens "Send Request" / "Send All" | 1天 | P0 |
| 变量支持 (`@var` 和 `{{var}}`) | 1天 | P0 |
| 响应内联显示（底部面板） | 2天 | P1 |
| 环境变量联动（http-forge environments） | 0.5天 | P1 |
| 导入 `.http` 为 Collection | 1天 | P2 |
| 片段补全 + Snippets | 0.5天 | P2 |
| 导出 k6 脚本 | 1天 | P2 |
| 导出 JMeter (.jmx) | 1.5天 | P2 |
| 导出 Postman Collection | 0.5天 | P1 |

---

## 六、REST Client 兼容设计

### 5.1 设计目标

```
REST Client 用户增强路径：

已有 .http 文件 ──▶ http-forge 直接打开 ──▶ 点击 Send Request ──▶ 查看响应
                         │
                         └──▶ 可选：导入为 Collection（获得断言、脚本、批量运行等增强功能）
```

### 5.2 文件格式支持

```http
# 完整支持 REST Client 语法

### 用户登录
# @name login
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
    "username": "{{username}}",
    "password": "{{password}}"
}

### 获取用户信息
# @name getUserInfo
GET {{baseUrl}}/api/user/{{userId}}
Authorization: Bearer {{login.response.body.token}}
```

**支持的语法**：
- `###` 请求分隔符
- `# @name` 请求命名（用于响应引用）
- `@variable = value` 文件级变量
- `{{variable}}` 变量引用
- `{{request.response.body.field}}` 响应链式引用
- `# @no-redirect`, `# @no-cookie-jar` 等指令

### 5.3 UI 集成

```
打开 .http 文件时：

┌─ api-test.http ──────────────────────────────────────────────┐
│  1 │ ### 用户登录                                            │
│  2 │ # @name login                                           │
│  3 │ POST {{baseUrl}}/api/auth/login     [Send Request]      │ ← CodeLens
│  4 │ Content-Type: application/json                          │
│  5 │                                                         │
│  6 │ {                                                       │
│  7 │     "username": "admin"                                 │
│  8 │ }                                                       │
│  9 │                                                         │
│ 10 │ ### 获取用户信息                                        │
│ 11 │ GET {{baseUrl}}/api/user/1          [Send Request]      │ ← CodeLens
└──────────────────────────────────────────────────────────────┘
                                            [Send All Requests] ← 文件顶部

响应显示在 Output Panel 或新建 Tab：
┌─ Response: login ────────────────────────────────────────────┐
│  Status: 200 OK                        Time: 156ms           │
│  ─────────────────────────────────────────────────────────── │
│  {                                                           │
│      "token": "eyJhbGciOiJIUzI1...",                         │
│      "userId": 123                                           │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
```

### 5.4 与 http-forge 功能联动

| REST Client 功能 | http-forge 增强 |
|-----------------|----------------|
| 单次发送请求 | ✅ 相同体验 |
| 文件级变量 | ✅ + 可使用 Environment 变量 |
| 响应查看 | ✅ + 保存到历史记录 |
| — | ✅ 可导入为 Collection |
| — | ✅ 导入后可添加断言/脚本 |
| — | ✅ 可加入 Test Suite 批量执行 |
| — | ✅ 可导出为 k6/JMeter 脚本 |
| — | ✅ 可导出为 Postman Collection |

### 5.5 文件结构变化

```
新增:
├── src/http-file/
│   ├── parser.ts              # .http 文件解析器
│   ├── syntax/
│   │   └── http.tmLanguage.json  # TextMate 语法定义
│   ├── codelens-provider.ts   # CodeLens 提供者
│   ├── variable-resolver.ts   # 变量解析（含响应引用）
│   └── response-panel.ts      # 响应显示面板
├── src/export/
│   ├── k6-exporter.ts         # 导出 k6 JavaScript 脚本
│   ├── jmeter-exporter.ts     # 导出 JMeter .jmx 文件
│   └── postman-exporter.ts    # 导出 Postman Collection v2.1
```

### 5.6 导入/导出生态设计

**设计目标**：http-forge 作为 API 测试工作流的中心枢纽

```
                    ┌─────────────────┐
                    │   http-forge    │
                    │   (工作中心)     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │ Postman │ ◀──────▶│  .http  │         │ 压测工具 │
   │ 双向    │         │ 兼容+增强│         │ 单向导出 │
   └─────────┘         └─────────┘         └─────────┘
```

**导入支持**：
| 来源 | 格式 | 状态 |
|------|------|------|
| Postman | Collection v2.0/v2.1 | ✅ 已完成 |
| REST Client | `.http`/`.rest` 文件 | 🔄 Phase 2 |

**导出支持**：
| 目标 | 格式 | 用途 |
|------|------|------|
| Postman | Collection v2.1 | 团队协作、分享给非 VS Code 用户 |
| k6 | JavaScript 脚本 | 专业并发压测 |
| JMeter | .jmx 文件 | 企业级压测 |

**导出入口**：
- Collection 右键 → "Export as..." → Postman / k6 / JMeter
- Test Suite 右键 → "Export as..." → Postman / k6 / JMeter

**Postman 导出示例**：
```json
{
    "info": {
        "name": "用户系统",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    "item": [
        {
            "name": "登录",
            "request": {
                "method": "POST",
                "url": "{{baseUrl}}/api/auth/login",
                "header": [...],
                "body": {...}
            }
        }
    ],
    "variable": [...]
}
```

**k6 导出示例**：
```javascript
// 导出的 k6 脚本
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 10,           // 用户可在 k6 中调整
    duration: '30s',
};

export default function () {
    // 登录
    const loginRes = http.post('https://api.example.com/auth/login', 
        JSON.stringify({ username: 'admin', password: '123456' }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    check(loginRes, { 'login status 200': (r) => r.status === 200 });
    
    const token = loginRes.json('token');
    
    // 获取用户信息
    const userRes = http.get('https://api.example.com/user/1', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    check(userRes, { 'user status 200': (r) => r.status === 200 });
    
    sleep(1);
}
```

**JMeter 导出**：
- 生成 `.jmx` 文件
- 包含 Thread Group、HTTP Sampler、Assertions
- 变量映射为 JMeter Variables

---

## 七、存储结构

```
.http-forge/
├── collections/           ← 保持不变
├── suites/                ← 新增
│   ├── full-order-flow.suite.json
│   └── regression-test.suite.json
├── environments/          ← 保持不变
└── results/
    └── suites/            ← 改为按 Suite 存储
        └── {suiteId}/
            └── {runId}/
                ├── summary.json
                └── details/
```

---

## 八、成功指标

| 指标 | 目标 |
|------|------|
| Test Suite 创建/运行 | 流畅无阻塞 |
| 性能统计准确性 | 百分位计算正确 |
| 内存占用 | 100次迭代 < 50MB 增量 |
| 代码精简 | 移除 Collection Runner 后代码量减少 |
| .http 文件兼容 | 100% REST Client 语法支持 |
| 响应显示速度 | < 100ms |

---

## 九、竞争对比

### http-forge vs Postman

| 方面 | Postman | http-forge |
|------|---------|------------|
| 跨 Collection 组合 | ❌ | ✅ Test Suite |
| 保存运行配置 | ❌ | ✅ |
| 性能统计 (P95/P99) | ❌ | ✅ |
| 导出 k6/JMeter | ❌ | ✅ |
| Postman 格式兼容 | ✅ 原生 | ✅ 双向导入/导出 |
| 免费 | ⚠️ 有限制 | ✅ 完全免费 |
| VS Code 集成 | ❌ | ✅ |

### http-forge vs REST Client

| 方面 | REST Client | http-forge |
|------|-------------|------------|
| `.http` 文件支持 | ✅ | ✅ 完全兼容 |
| 可视化 UI | ❌ | ✅ |
| Collection 管理 | ❌ | ✅ |
| 批量运行 + 迭代 | ❌ | ✅ |
| 性能统计 (P95/P99) | ❌ | ✅ |
| 断言测试 | ❌ | ✅ |
| Pre/Post 脚本 | ❌ | ✅ |
| 环境变量管理 | ⚠️ 简单 | ✅ 完整 |
| Postman 导入 | ❌ | ✅ |
| Test Suite 保存复用 | ❌ | ✅ |
| 导出 k6/JMeter | ❌ | ✅ |

**兼容说明**：REST Client 用户可继续使用 `.http` 文件，http-forge 提供兼容支持并增强功能（批量运行、导入 Collection、性能统计等）。两者可并存使用。

---

## 十、定位总结

```
http-forge 核心价值：
┌─────────────────────────────────────────────────────────────┐
│  1. API 开发调试 - 日常主力工具                              │
│  2. 功能测试 - QA 可保存复用 Test Suite                      │
│  3. 简单性能验证 - 开发者快速看 P95/错误率                   │
│  4. REST Client 兼容 - 支持 .http 文件 + 提供增强功能       │
│  5. Postman 双向兼容 - 导入/导出 Postman Collection         │
│  6. 压测桥梁 - 导出 k6/JMeter 脚本，无缝衔接专业工具        │
│                                                             │
│  不做：                                                      │
│  ❌ 复杂并发压测 (导出给 k6/JMeter 做)                      │
│  ❌ 分布式负载测试                                          │
│  ❌ 复杂报表                                                │
└─────────────────────────────────────────────────────────────┘

VS Code HTTP 测试工具定位：
┌─────────────────────────────────────────────────────────────┐
│  REST Client 用户 ──▶ http-forge（兼容 .http + 增强功能）   │
│  Postman 用户    ──▶ http-forge（VS Code 原生体验）         │
│  Thunder Client  ──▶ http-forge（开源 + 更多功能）          │
└─────────────────────────────────────────────────────────────┘
```

---

*文档版本: 2.1*
*最后更新: 2026-01-12*
