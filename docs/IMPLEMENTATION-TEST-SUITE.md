# Test Suite 实现方案

## 一、现状分析

### 1.1 现有 Collection Runner 架构

```
src/
├── webview-panels/collection-runner/
│   ├── collection-runner-panel.ts      # Panel 管理 (251 行)
│   ├── interfaces.ts                   # 运行配置接口
│   ├── handlers/
│   │   ├── run-handler.ts              # 执行逻辑 (447 行) ⭐ 核心
│   │   ├── ready-handler.ts            # 初始化
│   │   ├── browse-data-handler.ts      # 数据文件
│   │   └── export-handler.ts           # 导出结果
│   └── services/
│       └── collection-store.ts         # Collection 数据存储
│
├── services/collection-runner/
│   ├── collection-request-executor.ts  # 请求执行 (553 行) ⭐ 复用
│   ├── result-storage-service.ts       # 结果存储 (531 行) ⭐ 复用
│   ├── script-executor.ts              # 脚本执行 ⭐ 复用
│   ├── variable-replacer.ts            # 变量替换 ⭐ 复用
│   ├── cookie-jar.ts                   # Cookie 管理 ⭐ 复用
│   └── data-file-parser.ts             # 数据文件解析
│
└── providers/
    ├── collections-tree-provider.ts    # Collections 树
    └── environments-tree-provider.ts   # Environments 树
```

### 1.2 可复用的核心服务

| 服务 | 文件 | 说明 |
|------|------|------|
| CollectionRequestExecutor | collection-request-executor.ts | 请求执行，支持 scripts |
| ResultStorageService | result-storage-service.ts | 结果存储，支持分页 |
| ScriptExecutor | script-executor.ts | Pre/Post 脚本执行 |
| VariableReplacer | variable-replacer.ts | 变量替换 |
| CookieJar | cookie-jar.ts | Cookie 管理 |

### 1.3 需要重构的部分

| 组件 | 原因 |
|------|------|
| collection-runner-panel.ts | 改为 test-suite-panel.ts |
| run-handler.ts | 支持跨 Collection 请求 |
| collection-store.ts | 改为 suite-store.ts |
| Tree View | 新增 Test Suites 节点 |

---

## 二、目标架构

### 2.1 新目录结构

```
src/
├── webview-panels/
│   ├── collection-runner/          # 🗑️ 删除（Phase 1 完成后）
│   └── test-suite/                 # ✨ 新增
│       ├── test-suite-panel.ts     # Panel 管理
│       ├── interfaces.ts           # Suite 相关接口
│       ├── handlers/
│       │   ├── suite-handler.ts    # Suite 操作 (CRUD)
│       │   ├── run-handler.ts      # 执行逻辑
│       │   ├── ready-handler.ts    # 初始化
│       │   └── export-handler.ts   # 导出结果
│       └── services/
│           └── suite-store.ts      # Suite 数据存储
│
├── services/
│   ├── collection-runner/          # 保留核心执行逻辑
│   │   └── ...                     # 复用现有服务
│   └── test-suite-service.ts       # ✨ 新增：Suite 持久化
│
├── providers/
│   ├── collections-tree-provider.ts
│   ├── environments-tree-provider.ts
│   └── test-suites-tree-provider.ts  # ✨ 新增
│
└── utils/
    └── statistics.ts               # ✨ 新增：百分位计算
```

### 2.2 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        Test Suite Panel                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ Suite Store │    │ Run Handler │    │ Statistics  │         │
│  │ (webview)   │    │ (webview)   │    │ Panel       │         │
│  └──────┬──────┘    └──────┬──────┘    └─────────────┘         │
└─────────┼──────────────────┼───────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Extension Host                               │
│  ┌──────────────────┐    ┌─────────────────────────────────────┐│
│  │TestSuiteService  │    │ CollectionRequestExecutor           ││
│  │(CRUD, Storage)   │    │ ScriptExecutor, CookieJar           ││
│  └──────────────────┘    │ ResultStorageService                ││
│                          └─────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、详细实现步骤

### Phase 1: 基础架构 (Day 1)

#### Step 1.1: 定义 Test Suite 接口

```typescript
// src/services/test-suite-service.ts

export interface TestSuiteStep {
    collectionId: string;
    requestId: string;
    // 运行时填充
    collectionName?: string;
    requestName?: string;
    method?: string;
}

export interface TestSuiteConfig {
    iterations: number;
    delayBetweenRequests: number;
    stopOnError: boolean;
    environment?: string;
    showStatistics: boolean;
}

export interface TestSuite {
    id: string;
    name: string;
    description?: string;
    steps: TestSuiteStep[];
    config: TestSuiteConfig;
    createdAt: number;
    updatedAt: number;
}

export interface ITestSuiteService {
    // CRUD
    createSuite(name: string, steps?: TestSuiteStep[]): Promise<TestSuite>;
    getSuite(id: string): Promise<TestSuite | undefined>;
    getAllSuites(): Promise<TestSuite[]>;
    updateSuite(id: string, updates: Partial<TestSuite>): Promise<TestSuite>;
    deleteSuite(id: string): Promise<void>;
    
    // Helpers
    createTemporarySuite(collectionId: string): Promise<TestSuite>;
    resolveSteps(steps: TestSuiteStep[]): Promise<TestSuiteStep[]>;
}
```

#### Step 1.2: 实现 TestSuiteService

```typescript
// src/services/test-suite-service.ts

import * as fsp from 'fs/promises';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { CollectionService } from './collection-service';

export class TestSuiteService implements ITestSuiteService {
    private suitesPath: string;
    private cache: Map<string, TestSuite> = new Map();

    constructor(
        private workspacePath: string,
        private collectionService: CollectionService
    ) {
        this.suitesPath = path.join(workspacePath, '.http-forge', 'suites');
    }

    async initialize(): Promise<void> {
        await fsp.mkdir(this.suitesPath, { recursive: true });
        await this.loadAllSuites();
    }

    async createSuite(name: string, steps: TestSuiteStep[] = []): Promise<TestSuite> {
        const suite: TestSuite = {
            id: uuid(),
            name,
            steps,
            config: {
                iterations: 1,
                delayBetweenRequests: 0,
                stopOnError: true,
                showStatistics: true
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        await this.saveSuite(suite);
        return suite;
    }

    async createTemporarySuite(collectionId: string): Promise<TestSuite> {
        const collection = this.collectionService.getCollection(collectionId);
        if (!collection) {
            throw new Error(`Collection ${collectionId} not found`);
        }

        // 递归获取所有请求
        const steps = this.extractRequestsFromItems(collectionId, collection.items);
        
        return {
            id: `temp-${uuid()}`,
            name: `${collection.name} - Quick Run`,
            steps,
            config: {
                iterations: 1,
                delayBetweenRequests: 0,
                stopOnError: true,
                showStatistics: true
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }

    private extractRequestsFromItems(
        collectionId: string, 
        items: CollectionItem[]
    ): TestSuiteStep[] {
        const steps: TestSuiteStep[] = [];
        
        for (const item of items) {
            if (item.type === 'request') {
                steps.push({
                    collectionId,
                    requestId: item.id,
                    requestName: item.name,
                    method: item.method
                });
            } else if (item.type === 'folder' && item.items) {
                steps.push(...this.extractRequestsFromItems(collectionId, item.items));
            }
        }
        
        return steps;
    }

    // ... 其他方法实现
}
```

#### Step 1.3: 添加统计计算工具

```typescript
// src/utils/statistics.ts

export interface RequestStatistics {
    requestId: string;
    requestName: string;
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    errorCount: number;
    errorRate: number;
}

export interface RunStatistics {
    totalRequests: number;
    passedRequests: number;
    failedRequests: number;
    passRate: number;
    totalDuration: number;
    requestStats: RequestStatistics[];
    errorBreakdown: Record<string, number>;
}

export function calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
}

export function calculateStatistics(
    results: RequestExecutionResult[],
    steps: TestSuiteStep[]
): RunStatistics {
    // 按请求分组
    const byRequest = new Map<string, RequestExecutionResult[]>();
    
    for (const result of results) {
        const key = result.requestId;
        if (!byRequest.has(key)) {
            byRequest.set(key, []);
        }
        byRequest.get(key)!.push(result);
    }

    // 计算每个请求的统计
    const requestStats: RequestStatistics[] = [];
    const errorBreakdown: Record<string, number> = {};
    
    for (const step of steps) {
        const stepResults = byRequest.get(step.requestId) || [];
        const durations = stepResults.map(r => r.duration);
        const errors = stepResults.filter(r => !r.passed);
        
        requestStats.push({
            requestId: step.requestId,
            requestName: step.requestName || step.requestId,
            count: stepResults.length,
            min: durations.length > 0 ? Math.min(...durations) : 0,
            max: durations.length > 0 ? Math.max(...durations) : 0,
            avg: durations.length > 0 
                ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
                : 0,
            p50: calculatePercentile(durations, 50),
            p90: calculatePercentile(durations, 90),
            p95: calculatePercentile(durations, 95),
            p99: calculatePercentile(durations, 99),
            errorCount: errors.length,
            errorRate: stepResults.length > 0 
                ? Math.round((errors.length / stepResults.length) * 100 * 100) / 100
                : 0
        });

        // 错误类型统计
        for (const err of errors) {
            const errorType = err.error || `${err.status} ${err.statusText}`;
            errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
        }
    }

    const passed = results.filter(r => r.passed).length;
    
    return {
        totalRequests: results.length,
        passedRequests: passed,
        failedRequests: results.length - passed,
        passRate: results.length > 0 
            ? Math.round((passed / results.length) * 100 * 100) / 100
            : 0,
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
        requestStats,
        errorBreakdown
    };
}
```

---

### Phase 2: Tree View 集成 (Day 1.5)

#### Step 2.1: 创建 TestSuitesTreeProvider

```typescript
// src/providers/test-suites-tree-provider.ts

import * as vscode from 'vscode';
import { TestSuite, TestSuiteService } from '../services/test-suite-service';
import { COMMAND_IDS } from '../shared/constants';

export class TestSuiteTreeItem extends vscode.TreeItem {
    constructor(
        public readonly suite: TestSuite,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(suite.name, collapsibleState);
        
        this.contextValue = 'testSuite';
        this.tooltip = suite.description || `${suite.steps.length} requests`;
        this.iconPath = new vscode.ThemeIcon('beaker');
        this.description = `${suite.steps.length} steps`;
        
        // 单击打开 Suite
        this.command = {
            command: COMMAND_IDS.openTestSuite,
            title: 'Open Test Suite',
            arguments: [suite.id]
        };
    }
}

export class TestSuitesTreeProvider implements vscode.TreeDataProvider<TestSuiteTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TestSuiteTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private suiteService: TestSuiteService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: TestSuiteTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TestSuiteTreeItem): Promise<TestSuiteTreeItem[]> {
        if (element) {
            return []; // Suites don't have children in tree
        }

        const suites = await this.suiteService.getAllSuites();
        return suites.map(suite => 
            new TestSuiteTreeItem(suite, vscode.TreeItemCollapsibleState.None)
        );
    }
}
```

#### Step 2.2: 更新 extension.ts 注册 Tree View

```typescript
// 在 extension.ts 中添加

// 初始化 TestSuiteService
const testSuiteService = new TestSuiteService(workspacePath, collectionService);
await testSuiteService.initialize();

// 创建 Tree Provider
const testSuitesTreeProvider = new TestSuitesTreeProvider(testSuiteService);

// 注册 Tree View
context.subscriptions.push(
    vscode.window.createTreeView('httpForge.testSuites', {
        treeDataProvider: testSuitesTreeProvider,
        showCollapseAll: false
    })
);

// 注册命令
context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.openTestSuite, (suiteId: string) => {
        TestSuitePanel.createOrShow(context.extensionUri, testSuiteService, suiteId);
    }),
    vscode.commands.registerCommand(COMMAND_IDS.createTestSuite, async () => {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter test suite name',
            placeHolder: 'My Test Suite'
        });
        if (name) {
            const suite = await testSuiteService.createSuite(name);
            testSuitesTreeProvider.refresh();
            TestSuitePanel.createOrShow(context.extensionUri, testSuiteService, suite.id);
        }
    }),
    vscode.commands.registerCommand(COMMAND_IDS.runCollection, async (item: CollectionTreeItem) => {
        // Collection 右键 "Run All" - 创建临时 Suite
        const suite = await testSuiteService.createTemporarySuite(item.collectionId);
        TestSuitePanel.createOrShow(context.extensionUri, testSuiteService, suite.id, suite);
    })
);
```

#### Step 2.3: 更新 package.json 添加 Tree View

```json
{
  "contributes": {
    "views": {
      "httpForge": [
        {
          "id": "httpForge.collections",
          "name": "Collections"
        },
        {
          "id": "httpForge.testSuites",
          "name": "Test Suites"
        },
        {
          "id": "httpForge.environments",
          "name": "Environments"
        }
      ]
    },
    "menus": {
      "view/item/context": [
        {
          "command": "httpForge.runCollection",
          "when": "view == httpForge.collections && viewItem == collection",
          "group": "navigation"
        },
        {
          "command": "httpForge.deleteTestSuite",
          "when": "view == httpForge.testSuites && viewItem == testSuite",
          "group": "inline"
        }
      ],
      "view/title": [
        {
          "command": "httpForge.createTestSuite",
          "when": "view == httpForge.testSuites",
          "group": "navigation"
        }
      ]
    }
  }
}
```

---

### Phase 3: Webview Panel (Day 2-3)

#### Step 3.1: 创建 TestSuitePanel

```typescript
// src/webview-panels/test-suite/test-suite-panel.ts

export class TestSuitePanel {
    public static currentPanel: TestSuitePanel | undefined;
    public static readonly viewType = 'httpForge.testSuite';

    public static createOrShow(
        extensionUri: vscode.Uri,
        suiteService: TestSuiteService,
        suiteId?: string,
        temporarySuite?: TestSuite
    ): TestSuitePanel {
        // ... 类似 CollectionRunnerPanel
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        suiteService: TestSuiteService,
        collectionService: CollectionService
    ) {
        // 初始化 handlers
        this._router.register(new SuiteHandler(suiteService, collectionService));
        this._router.register(new RunHandler(/* 复用现有服务 */));
        this._router.register(new ReadyHandler(this._suiteStore));
        this._router.register(new ExportHandler());
        
        // 设置 HTML
        this._panel.webview.html = this._getHtmlForWebview();
    }
}
```

#### Step 3.2: Webview HTML/JS 结构

```
resources/test-suite/
├── index.html
├── style.css
└── js/
    ├── main.js
    ├── state.js
    ├── elements.js
    ├── message-handler.js
    ├── components/
    │   ├── suite-editor.js       # 请求选择器
    │   ├── suite-runner.js       # 运行控制
    │   ├── results-panel.js      # 结果列表
    │   └── statistics-panel.js   # 统计显示
    └── utils/
        └── formatters.js
```

#### Step 3.3: Suite Editor UI

```javascript
// resources/test-suite/js/components/suite-editor.js

export class SuiteEditor {
    constructor(container) {
        this.container = container;
        this.steps = [];
    }

    render(suite, collections) {
        this.container.innerHTML = `
            <div class="suite-header">
                <input type="text" id="suite-name" value="${suite.name}" />
                <textarea id="suite-description">${suite.description || ''}</textarea>
            </div>

            <div class="steps-section">
                <div class="steps-header">
                    <h3>Steps (${suite.steps.length})</h3>
                    <button id="add-step-btn">+ Add Request</button>
                </div>
                <div id="steps-list" class="steps-list">
                    ${this.renderSteps(suite.steps)}
                </div>
            </div>

            <div class="request-picker" id="request-picker" style="display: none;">
                <div class="picker-header">
                    <h4>Select Requests</h4>
                    <button id="close-picker">×</button>
                </div>
                <div class="picker-content">
                    ${this.renderCollectionTree(collections)}
                </div>
            </div>
        `;
        
        this.bindEvents();
        this.initDragAndDrop();
    }

    renderSteps(steps) {
        return steps.map((step, index) => `
            <div class="step-item" data-index="${index}" draggable="true">
                <span class="drag-handle">⋮⋮</span>
                <input type="checkbox" checked />
                <span class="step-index">${index + 1}.</span>
                <span class="step-collection">[${step.collectionName}]</span>
                <span class="step-method method-${step.method?.toLowerCase()}">${step.method}</span>
                <span class="step-name">${step.requestName}</span>
                <button class="remove-step" data-index="${index}">×</button>
            </div>
        `).join('');
    }

    initDragAndDrop() {
        const list = document.getElementById('steps-list');
        new Sortable(list, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: (evt) => {
                this.reorderSteps(evt.oldIndex, evt.newIndex);
            }
        });
    }
}
```

#### Step 3.4: Statistics Panel UI

```javascript
// resources/test-suite/js/components/statistics-panel.js

export class StatisticsPanel {
    constructor(container) {
        this.container = container;
    }

    render(statistics) {
        this.container.innerHTML = `
            <div class="stats-summary">
                <div class="stat-card">
                    <span class="stat-value">${statistics.totalRequests}</span>
                    <span class="stat-label">Total Requests</span>
                </div>
                <div class="stat-card passed">
                    <span class="stat-value">${statistics.passedRequests}</span>
                    <span class="stat-label">Passed (${statistics.passRate}%)</span>
                </div>
                <div class="stat-card failed">
                    <span class="stat-value">${statistics.failedRequests}</span>
                    <span class="stat-label">Failed</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${this.formatDuration(statistics.totalDuration)}</span>
                    <span class="stat-label">Total Duration</span>
                </div>
            </div>

            <div class="stats-table">
                <h4>Response Time Statistics</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Request</th>
                            <th>Count</th>
                            <th>Min</th>
                            <th>Avg</th>
                            <th>P50</th>
                            <th>P90</th>
                            <th>P95</th>
                            <th>P99</th>
                            <th>Max</th>
                            <th>Error %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.renderRequestRows(statistics.requestStats)}
                    </tbody>
                </table>
            </div>

            ${this.renderErrorBreakdown(statistics.errorBreakdown)}
        `;
    }

    renderRequestRows(requestStats) {
        return requestStats.map(stat => `
            <tr>
                <td>${stat.requestName}</td>
                <td>${stat.count}</td>
                <td>${stat.min}ms</td>
                <td>${stat.avg}ms</td>
                <td>${stat.p50}ms</td>
                <td class="${stat.p90 > 1000 ? 'warning' : ''}">${stat.p90}ms</td>
                <td class="${stat.p95 > 2000 ? 'danger' : ''}">${stat.p95}ms</td>
                <td class="${stat.p99 > 3000 ? 'danger' : ''}">${stat.p99}ms</td>
                <td>${stat.max}ms</td>
                <td class="${stat.errorRate > 0 ? 'danger' : ''}">${stat.errorRate}%</td>
            </tr>
        `).join('');
    }
}
```

---

### Phase 4: 运行器改造 (Day 4)

#### Step 4.1: 重构 RunHandler 支持跨 Collection

```typescript
// src/webview-panels/test-suite/handlers/run-handler.ts

export class RunHandler implements IMessageHandler {
    async startRun(
        steps: TestSuiteStep[],
        config: TestSuiteConfig,
        messenger: IWebviewMessenger
    ): Promise<void> {
        // 按 collectionId 分组，获取 Collection 上下文
        const collectionContexts = await this.prepareCollectionContexts(steps);
        
        // 运行循环
        for (let iteration = 0; iteration < config.iterations; iteration++) {
            for (const step of steps) {
                if (this.abortController?.signal.aborted) break;
                
                // 从对应 Collection 获取请求
                const ctx = collectionContexts.get(step.collectionId);
                const request = ctx.getRequest(step.requestId);
                
                // 使用 CollectionRequestExecutor 执行
                const executor = new CollectionRequestExecutor(
                    this.httpService,
                    this.scriptExecutor,
                    this.envConfigService,
                    this.requestPreparer,
                    config.environment,
                    this.cookieJar,
                    ctx.collectionScripts,
                    ctx.getFolderScripts(step.requestId)
                );
                
                const result = await executor.execute(
                    request,
                    this.runVariables,
                    this.abortController.signal
                );
                
                // 更新变量
                if (result.sessionVariables) {
                    Object.assign(this.runVariables, result.sessionVariables);
                }
                
                // 存储结果
                await this.resultStorage.appendResult(result);
                
                // 发送进度
                messenger.postMessage({
                    type: 'runProgress',
                    result,
                    progress: {
                        current: iteration * steps.length + stepIndex + 1,
                        total: config.iterations * steps.length
                    }
                });
                
                // 延迟
                if (config.delayBetweenRequests > 0) {
                    await this.delay(config.delayBetweenRequests);
                }
                
                // 错误停止
                if (!result.passed && config.stopOnError) {
                    break;
                }
            }
        }
        
        // 计算统计
        const statistics = calculateStatistics(allResults, steps);
        messenger.postMessage({ type: 'runComplete', statistics });
    }
}
```

---

### Phase 5: 存储结构调整 (Day 4.5)

#### Step 5.1: 更新 ResultStorageService

```typescript
// 修改路径结构
// 之前: .http-forge/results/{collectionId}/{runId}/
// 之后: .http-forge/results/suites/{suiteId}/{runId}/

async initializeRun(
    suiteId: string,
    suiteName: string,
    environment: string,
    config: RunConfig
): Promise<string> {
    const runId = this.generateRunId();
    this.currentRunPath = path.join(
        this.basePath, 
        'suites',        // 新增层级
        suiteId, 
        runId
    );
    // ...
}
```

---

### Phase 6: 清理与迁移 (Day 5)

#### Step 6.1: 移除旧 Collection Runner

```bash
# 删除旧文件
rm -rf src/webview-panels/collection-runner/
rm -rf resources/collection-runner/

# 更新导入
# 确保没有其他文件引用 collection-runner
```

#### Step 6.2: 更新所有引用

```typescript
// 搜索并替换
// CollectionRunnerPanel -> TestSuitePanel
// collection-runner -> test-suite
```

---

## 四、测试计划

### 4.1 单元测试

```typescript
describe('TestSuiteService', () => {
    it('should create a new suite', async () => { ... });
    it('should create temporary suite from collection', async () => { ... });
    it('should save and load suite', async () => { ... });
    it('should resolve step details from collections', async () => { ... });
});

describe('Statistics', () => {
    it('should calculate percentiles correctly', () => { ... });
    it('should group results by request', () => { ... });
    it('should calculate error breakdown', () => { ... });
});
```

### 4.2 集成测试

```typescript
describe('TestSuitePanel', () => {
    it('should open with existing suite', async () => { ... });
    it('should open with temporary suite from collection', async () => { ... });
    it('should run cross-collection requests', async () => { ... });
    it('should display statistics after run', async () => { ... });
});
```

---

## 五、时间估算

| 任务 | 时间 | 状态 |
|------|------|------|
| 1. 接口定义 + TestSuiteService | 4h | ⬜ |
| 2. 统计计算工具 | 2h | ⬜ |
| 3. Tree View 集成 | 3h | ⬜ |
| 4. package.json 更新 | 1h | ⬜ |
| 5. TestSuitePanel 基础 | 4h | ⬜ |
| 6. Suite Editor UI | 6h | ⬜ |
| 7. Suite Runner UI | 4h | ⬜ |
| 8. Statistics Panel UI | 4h | ⬜ |
| 9. RunHandler 重构 | 4h | ⬜ |
| 10. 存储结构调整 | 2h | ⬜ |
| 11. 清理旧代码 | 2h | ⬜ |
| 12. 测试 + 修复 | 4h | ⬜ |
| **总计** | **~40h (5天)** | |

---

## 六、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 跨 Collection 脚本变量传递 | 中 | 保持 runVariables 在整个 Suite 运行期间 |
| 大量结果性能问题 | 中 | 复用现有虚拟滚动 |
| UI 拖拽排序兼容性 | 低 | 使用成熟库 (SortableJS) |

---

*文档版本: 1.0*
*创建日期: 2026-01-12*
