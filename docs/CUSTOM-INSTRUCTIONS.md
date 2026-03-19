# HTTP Forge 自定义开发指南

这份文档是对 `.vscode/.copilot-instructions` 的深度扩展，包含详细的示例、反面教材和最佳实践。

---

## 目录

1. [架构理论基础](#架构理论基础)
2. [逐层深入指南](#逐层深入指南)
3. [常见应用场景](#常见应用场景)
4. [反面教材与修复](#反面教材与修复)
5. [测试策略](#测试策略)
6. [性能与调试](#性能与调试)

---

# 架构理论基础

## 为什么选择 DDD + SOLID？

### 背景

http-forge 最初是单一层混合设计，存在这些问题：

```
❌ 现状：
Handler → getServiceContainer() → @http-forge/core
Handler ↔ DataProvider ↔ Panel (循环)
RequestContext 被多个 Handler 修改
```

**根本原因**：职责混淆 + 依赖指向不明确

### DDD 解决方案

**Domain-Driven Design** 将系统分为四层，每层有清晰的职责：

| 层 | 职责 | 优点 | 示例 |
|----|------|------|------|
| **Presentation** | UI/交互 | 容易测试、可替换 | Handler, Tree Provider |
| **Application** | 用例编排 | 可复用、易理解 | Command, DTO |
| **Orchestration** | 业务逻辑 | 独立于框架 | Orchestrator, Entity |
| **Infrastructure** | 技术实现 | 可切换 | 数据库、API 适配器 |

### SOLID 原则映射

| 原则 | 在 http-forge 中的表现 |
|------|----------------------|
| **S** 单一职责 | Handler ≠ Command ≠ Orchestrator |
| **O** 开闭原则 | 新 Handler 无需改现有代码 |
| **L** 里氏替换 | 所有 Handler 可互换（IMessageHandler） |
| **I** 接口隔离 | 每个接口只定义必要的方法 |
| **D** 依赖倒置 | 依赖 interface，不是 concrete class |

---

# 逐层深入指南

## 1️⃣ Presentation Layer（展示层）

### 职责
- 将 Webview 消息转换为 Application Command
- 将响应 DTO 转换为 UI 消息
- 管理 UI 状态和生命周期
- 不包含业务逻辑

### 子层划分

```
Presentation Layer
├── Message Handlers     (src/presentation/webview/message-handlers/)
├── Tree Providers       (src/presentation/components/tree-providers/)
├── Tree Loaders         (src/presentation/components/tree-providers/loaders/)
├── Factories           (src/presentation/webview/factories/)
└── Panels              (src/presentation/webview/panels/)
```

### Message Handler 详解

#### 完整真实示例

```typescript
// src/presentation/webview/message-handlers/request-execution-handler.ts

import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';
import { IPanelContextProvider } from '../interfaces';
import { IExecuteRequestCommand } from '../../../application/commands';
import { ILogger } from '@http-forge/core';

/**
 * Handles request execution messages from webview
 * 
 * Message flow:
 * Webview → Handler.handle() → Command.execute() → Orchestrator → @http-forge/core
 *                     ↓                                              ↓
 *                 validate            Handler returns DTO          HTTP call
 * 
 * Single Responsibility: Only routes messages and delegates to command
 * Dependency Inversion: Depends on IExecuteRequestCommand interface
 */
export class RequestExecutionHandler implements IMessageHandler {
  // ✅ 所有依赖都是接口
  constructor(
    private executeRequestCommand: IExecuteRequestCommand,
    private contextProvider: IPanelContextProvider,
    private logger: ILogger
  ) {}

  /**
   * Declare which message types this handler supports
   * Used by MessageRouter for O(1) dispatch
   */
  getSupportedCommands(): string[] {
    return ['sendRequest', 'sendHttpRequest'];
  }

  /**
   * Main message processing method
   * 
   * Promise<boolean>: true if handled, false if not
   * This allows router to try other handlers
   */
  async handle(
    command: string,
    message: any,
    messenger: IWebviewMessenger
  ): Promise<boolean> {
    // Guard clause: if not our command, skip
    if (command === 'sendRequest') {
      return await this.handleSendRequest(message, messenger);
    }
    if (command === 'sendHttpRequest') {
      return await this.handleSendHttpRequest(message, messenger);
    }
    return false;
  }

  /**
   * Handle sendRequest command
   * 
   * This is the meat of the handler - orchestrate the actual work
   */
  private async handleSendRequest(message: any, messenger: IWebviewMessenger): Promise<boolean> {
    try {
      // 1️⃣ VALIDATE: Check message format
      this.validateSendRequestMessage(message);

      // 2️⃣ GET CONTEXT: Retrieve current panel context
      const context = this.contextProvider.getCurrentContext();
      if (!context) {
        messenger.postMessage({
          type: 'requestError',
          error: 'No request context available'
        });
        return true;
      }

      // 3️⃣ BUILD INPUT: Construct command input DTO
      const commandInput = {
        collectionId: context.collectionId,
        requestId: context.requestId || message.requestId,
        environmentId: this.contextProvider.getEnvironmentId(),
        localVariables: message.localVariables
      };

      this.logger.debug('[RequestExecutionHandler] Executing request', {
        collectionId: commandInput.collectionId,
        requestId: commandInput.requestId
      });

      // 4️⃣ EXECUTE: Call command (business logic delegated here)
      const result = await this.executeRequestCommand.execute(commandInput);

      // 5️⃣ RESPOND: Send result back to webview
      messenger.postMessage({
        type: 'requestExecuted',
        data: result  // ✅ This is the DTO
      });

      return true;
    } catch (error) {
      // Error handling: log and notify
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('[RequestExecutionHandler] Request failed', error);

      messenger.postMessage({
        type: 'requestError',
        error: errorMessage
      });

      return true;  // We handled it (even if it failed)
    }
  }

  private async handleSendHttpRequest(
    message: any,
    messenger: IWebviewMessenger
  ): Promise<boolean> {
    // Similar pattern as above...
    try {
      const result = await this.executeRequestCommand.execute({
        requestId: message.requestId,
        collectionId: message.collectionId
      });

      messenger.postMessage({
        type: 'httpRequestExecuted',
        data: result
      });
      return true;
    } catch (error) {
      messenger.postMessage({
        type: 'httpRequestError',
        error: (error as Error).message
      });
      return true;
    }
  }

  /**
   * Validation: Ensure message has required fields
   * Throws if invalid, caught by handle()
   */
  private validateSendRequestMessage(message: any): void {
    if (!message.requestId) {
      throw new Error('requestId is required');
    }
  }
}
```

#### Key Points

1. **Dependency Injection**: 所有依赖在构造函数
2. **Guard Clauses**: 快速返回 false 如果不是我们的消息
3. **Try-Catch**: 统一错误处理
4. **Logging**: 调试用的 logger.debug() / logger.error()
5. **Messaging Pattern**: postMessage() 发送结构化消息

---

### Tree Provider 详解

#### 问题场景：现有混合设计

```typescript
// ❌ BAD: 模型加载混在 UI 逻辑中
export class CollectionsTreeProvider implements vscode.TreeDataProvider {
  async getChildren(element?: CollectionTreeItem): Promise<CollectionTreeItem[]> {
    // 加载模型
    const collections = await this.collectionService.getCollections();
    
    // 创建 UI 项
    const treeItems = collections.map(c => new CollectionTreeItem(
      c.id,
      c.name,
      c.type,
      c.data
    ));
    
    // 处理拖放
    // 处理右键菜单
    // 刷新逻辑
    // → 太多职责！
  }
}
```

#### 改进方案：分离 Loader

```typescript
// src/presentation/components/tree-providers/loaders/collection-loader.ts

/**
 * Model Loader: 查询业务逻辑
 * 职责：只加载数据
 */
export interface ICollectionModelLoader {
  loadCollections(): Promise<CollectionModel[]>;
  loadFolder(collectionId: string, folderId: string): Promise<FolderModel>;
  loadRequest(collectionId: string, requestId: string): Promise<RequestModel>;
  loadChildren(parent?: TreeNodeModel): Promise<TreeNodeModel[]>;
}

export class CollectionModelLoader implements ICollectionModelLoader {
  constructor(
    private collectionService: ICollectionService  // ✅ 依赖服务
  ) {}

  async loadCollections(): Promise<CollectionModel[]> {
    const collections = await this.collectionService.getCollections();
    return collections.map(c => ({
      id: c.id,
      name: c.name,
      type: 'collection' as const,
      data: c
    }));
  }

  async loadChildren(parent?: TreeNodeModel): Promise<TreeNodeModel[]> {
    if (!parent) {
      return this.loadCollections();
    }

    if (parent.type === 'collection') {
      return this.loadFolder(parent.id, parent.id);
    }

    if (parent.type === 'folder') {
      const items = await this.collectionService.getItems(
        parent.data.collectionId,
        parent.id
      );

      return items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,  // 'folder' | 'request'
        data: item,
        collectionId: parent.data.collectionId
      }));
    }

    return [];
  }
}

// src/presentation/components/tree-providers/collection-tree-provider.ts

/**
 * Tree Provider: UI 表现
 * 职责：只负责展示，使用 Loader 加载数据
 */
export class CollectionsTreeProvider implements vscode.TreeDataProvider<CollectionTreeItem> {
  private eventEmitter = new vscode.EventEmitter<CollectionTreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<CollectionTreeItem | undefined> = this.eventEmitter.event;

  constructor(
    private loader: ICollectionModelLoader,  // ✅ 使用 Loader
    private dragDropController: vscode.TreeDragAndDropController
  ) {}

  async getChildren(element?: CollectionTreeItem): Promise<CollectionTreeItem[]> {
    // 1. 加载模型
    const models = await this.loader.loadChildren(element?.model);

    // 2. 转换为 UI 项
    return models.map(model => this.modelToTreeItem(model));
  }

  async getTreeItem(element: CollectionTreeItem): Promise<vscode.TreeItem> {
    // UI 相关设置
    element.collapsibleState = this.getCollapsibleState(element.model);
    element.iconPath = this.getIcon(element.model.type);
    return element;
  }

  /**
   * Model → TreeItem 转换
   * 这就是唯一的 UI 逻辑！
   */
  private modelToTreeItem(model: TreeNodeModel): CollectionTreeItem {
    const item = new CollectionTreeItem(
      model.id,
      model.name,
      model.type,
      model.data
    );

    // 设置命令（打开编辑器等）
    if (model.type === 'request') {
      item.command = {
        command: 'http-forge.openRequest',
        title: 'Edit Request',
        arguments: [model.id, model.collectionId]
      };
    }

    return item;
  }

  private getCollapsibleState(model: TreeNodeModel): vscode.TreeItemCollapsibleState {
    if (model.type === 'request') {
      return vscode.TreeItemCollapsibleState.None;
    }
    return vscode.TreeItemCollapsibleState.Collapsed;
  }

  private getIcon(type: string): vscode.ThemeIcon {
    switch (type) {
      case 'collection': return new vscode.ThemeIcon('archive');
      case 'folder': return new vscode.ThemeIcon('folder');
      case 'request': return new vscode.ThemeIcon('circle-outline');
      default: return new vscode.ThemeIcon('circle-outline');
    }
  }

  refresh(): void {
    this.eventEmitter.fire(undefined);  // Refresh entire tree
  }
}
```

#### Loader 的好处

- ✅ 可以在 CLI 中重用（不依赖 VS Code）
- ✅ 容易单元测试（模拟 collectionService）
- ✅ 容易改变加载逻辑，不影响 UI
- ✅ 清晰的职责分离

---

## 2️⃣ Application Layer（应用层）

### 职责
- 定义 DTO（Input/Output）
- 实现 Command（用例）
- 编排跨层工作流
- **不包含**业务规则（那是 Orchestration）

### Command 模式详解

#### 为什么用 Command？

Command 模式将"要做什么"和"怎么做"分离：

```
Presentation       Application         Orchestration
Handler ━━━━━━━→ Command ━━━━━━━━━━→ Orchestrator
(消息)      (DTO)      (业务逻辑)       (核心实现)
  ↓          ↓          ↓              ↓
接收消息   验证 + 编排   协调流程    调用真实服务
```

#### 完整 Command 实现

```typescript
// src/application/dto/execute-request.dto.ts

/**
 * 执行请求的输入 DTO
 * Handler 收集 webview 消息 → 转换为此 DTO
 */
export interface ExecuteRequestInput {
  collectionId: string;
  requestId: string;
  environmentId?: string;
  localVariables?: Record<string, string>;
}

/**
 * 执行请求的输出 DTO
 * Orchestrator 返回结果 → Command 转换为此 DTO
 * Handler 发送此 DTO 回 Webview
 */
export class ExecuteRequestOutput {
  readonly statusCode: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly body: string;
  readonly duration: number;
  readonly cookies: Array<{ name: string; value: string }>;
  readonly scriptResults?: {
    preRequestOutput?: any;
    postResponseOutput?: any;
  };

  constructor(data: {
    statusCode: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    duration: number;
    cookies?: Array<{ name: string; value: string }>;
    scriptResults?: any;
  }) {
    this.statusCode = data.statusCode;
    this.statusText = data.statusText;
    this.headers = data.headers;
    this.body = data.body;
    this.duration = data.duration;
    this.cookies = data.cookies || [];
    this.scriptResults = data.scriptResults;
  }

  /**
   * Factory: 从 core 的 ExecutionResult 转换
   */
  static from(coreResult: any): ExecuteRequestOutput {
    return new ExecuteRequestOutput({
      statusCode: coreResult.response.status,
      statusText: coreResult.response.statusText || '',
      headers: coreResult.response.headers,
      body: coreResult.response.body,
      duration: coreResult.duration,
      cookies: coreResult.cookies,
      scriptResults: {
        preRequestOutput: coreResult.preRequestResult?.output,
        postResponseOutput: coreResult.postResponseResult?.output
      }
    });
  }
}

// src/application/commands/execute-request.command.ts

import { ICommand } from './command.interface';
import { IRequestOrchestrator } from '../../orchestration/services';
import { IEventBus } from '../../orchestration/event-bus';

export interface IExecuteRequestCommand extends ICommand<ExecuteRequestInput, ExecuteRequestOutput> {}

/**
 * Command: 执行 HTTP 请求
 * 
 * 职责：
 * 1. 验证输入 DTO
 * 2. 调用 Orchestrator
 * 3. 转换返回值为 Output DTO
 * 4. 发布事件
 * 
 * 不负责：具体的 HTTP 逻辑（那是 Orchestrator 的）
 */
export class ExecuteRequestCommand implements IExecuteRequestCommand {
  constructor(
    private orchestrator: IRequestOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  async execute(input: ExecuteRequestInput): Promise<ExecuteRequestOutput> {
    try {
      // 1️⃣ VALIDATE INPUT
      this.validateInput(input);

      this.logger.debug('[ExecuteRequestCommand] Executing request', {
        collectionId: input.collectionId,
        requestId: input.requestId,
        environmentId: input.environmentId
      });

      // 2️⃣ CALL ORCHESTRATOR
      // Orchestrator 处理所有业务逻辑
      const coreResult = await this.orchestrator.executeRequest({
        collectionId: input.collectionId,
        requestId: input.requestId,
        environmentId: input.environmentId,
        localVariables: input.localVariables
      });

      // 3️⃣ TRANSFORM RESULT
      const output = ExecuteRequestOutput.from(coreResult);

      // 4️⃣ PUBLISH EVENT
      // 这样其他功能可以订阅事件做响应（如保存历史）
      this.eventBus.publish({
        type: 'RequestExecuted',
        data: {
          collectionId: input.collectionId,
          requestId: input.requestId,
          statusCode: output.statusCode,
          duration: output.duration,
          timestamp: Date.now()
        }
      });

      this.logger.debug('[ExecuteRequestCommand] Request succeeded', {
        statusCode: output.statusCode,
        duration: output.duration
      });

      // 5️⃣ RETURN OUTPUT DTO
      return output;
    } catch (error) {
      this.logger.error('[ExecuteRequestCommand] Request failed', error);

      // ❌ Command 不应该吞掉错误
      // Handler 应该捕获并处理
      throw error;
    }
  }

  /**
   * 验证输入的业务规则
   * 注意：这是业务验证，不是类型检查
   */
  private validateInput(input: ExecuteRequestInput): void {
    if (!input.collectionId) {
      throw new Error('collectionId is required');
    }
    if (!input.requestId) {
      throw new Error('requestId is required');
    }
    
    // 可以添加更复杂的业务验证
    // if (input.timeout && input.timeout > 300000) {
    //   throw new Error('Timeout cannot exceed 5 minutes');
    // }
  }
}
```

#### Command 的好处

- ✅ **可复用**：CLI、web 应用可以调用同一个 Command
- ✅ **可测试**：就是 async 函数，容易 mock
- ✅ **可事件化**：发布事件给其他模块
- ✅ **清晰的职责**：Command = 使用场景

---

## 3️⃣ Orchestration Layer（协调层）

### 职责
- 实现业务逻辑
- 坐标多个服务
- 保持可追踪的执行流
- 发出领域事件
- 实现 Repository 模式

### Orchestrator 实现

```typescript
// src/orchestration/interfaces/request-orchestrator.interface.ts

export interface IRequestOrchestrator {
  executeRequest(options: RequestExecutionOptions): Promise<ExecutionResult>;
}

export interface RequestExecutionOptions {
  collectionId: string;
  requestId: string;
  environmentId?: string;
  localVariables?: Record<string, string>;
}

export interface ExecutionResult {
  response: HttpResponse;
  preRequestResult?: ScriptResult;
  postResponseResult?: ScriptResult;
  duration: number;
  cookies: Cookie[];
}

// src/orchestration/services/request-orchestrator.ts

/**
 * Orchestrator: 协调执行流程
 * 
 * 职责：
 * - 从 Repository 加载 Collection 和 Environment
 * - 合并变量（Collection + Environment + Local）
 * - 调用 Preparer 准备请求
 * - 调用 HttpService 执行请求
 * - 保存历史和结果
 * 
 * 不负责：UI 或 DTO 转换
 */
export class RequestOrchestrator implements IRequestOrchestrator {
  constructor(
    private collectionRepository: ICollectionRepository,
    private environmentRepository: IEnvironmentRepository,
    private httpService: IHttpRequestService,
    private requestPreparer: IRequestPreparer,
    private historyService: IRequestHistoryService,
    private logger: ILogger
  ) {}

  async executeRequest(options: RequestExecutionOptions): Promise<ExecutionResult> {
    this.logger.debug('[RequestOrchestrator] Starting request execution', options);

    try {
      // 1️⃣ LOAD DATA
      const collection = await this.collectionRepository.getCollection(options.collectionId);
      if (!collection) {
        throw new Error(`Collection not found: ${options.collectionId}`);
      }

      const request = collection.getRequest(options.requestId);
      if (!request) {
        throw new Error(`Request not found: ${options.requestId}`);
      }

      // 2️⃣ RESOLVE VARIABLES
      let variables = this.mergeVariables(
        collection.variables,
        {},  // environment variables (if loaded)
        options.localVariables
      );

      this.logger.debug('[RequestOrchestrator] Merged variables', {
        count: Object.keys(variables).length
      });

      // 3️⃣ PREPARE REQUEST
      const prepared = await this.requestPreparer.prepare(request, variables);

      this.logger.debug('[RequestOrchestrator] Request prepared', {
        method: prepared.method,
        url: prepared.url
      });

      // 4️⃣ EXECUTE HTTP REQUEST
      const response = await this.httpService.execute(prepared);

      this.logger.debug('[RequestOrchestrator] HTTP execution completed', {
        statusCode: response.status,
        duration: response.duration
      });

      // 5️⃣ SAVE RESULT
      await this.historyService.addEntry({
        collectionId: options.collectionId,
        requestId: options.requestId,
        timestamp: Date.now(),
        result: response
      });

      // 6️⃣ RETURN RESULT
      return {
        response,
        duration: response.duration,
        cookies: response.cookies || []
      };
    } catch (error) {
      this.logger.error('[RequestOrchestrator] Execution failed', error);
      throw error;
    }
  }

  private mergeVariables(
    collectionVars: Record<string, string>,
    envVars: Record<string, string>,
    localVars?: Record<string, string>
  ): Record<string, string> {
    // 优先级：Local > Environment > Collection
    return {
      ...collectionVars,
      ...envVars,
      ...localVars
    };
  }
}
```

#### Orchestrator 的特点

- ✅ **声明性流程**：清晰的执行步骤
- ✅ **协调**：多个服务的中央点
- ✅ **可日志**：每一步都有 logger
- ✅ **可测试**：mock 所有依赖

---

## 4️⃣ Infrastructure Layer（基础设施层）

### 职责
- 与 @http-forge/core 集成
- VS Code API 适配器
- 数据持久化
- 文件系统操作

### VS Code 适配器示例

```typescript
// src/infrastructure/vscode-adapters/vscode-notification.adapter.ts

import * as vscode from 'vscode';

export interface INotificationService {
  showInfo(message: string, ...options: string[]): Promise<string | undefined>;
  showWarning(message: string, ...options: string[]): Promise<string | undefined>;
  showError(message: string, ...options: string[]): Promise<string | undefined>;
}

/**
 * Adapter: VS Code 通知服务
 * 
 * 将 VS Code API 适配成标准接口
 * 这样核心逻辑不依赖于 VS Code
 */
export class VscodeNotificationService implements INotificationService {
  async showInfo(message: string, ...options: string[]): Promise<string | undefined> {
    return vscode.window.showInformationMessage(message, ...options);
  }

  async showWarning(message: string, ...options: string[]): Promise<string | undefined> {
    return vscode.window.showWarningMessage(message, ...options);
  }

  async showError(message: string, ...options: string[]): Promise<string | undefined> {
    return vscode.window.showErrorMessage(message, ...options);
  }
}
```

---

# 常见应用场景

## 场景 1: 添加新的 Webview 消息

### 需求
用户在 Request Tester 中点击一个按钮，应该保存当前请求到历史。

### 实现步骤

#### 1. 创建 DTO

```typescript
// src/application/dto/save-request-history.dto.ts

export interface SaveRequestHistoryInput {
  collectionId: string;
  requestId: string;
  response: {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  };
}

export class SaveRequestHistoryOutput {
  readonly historyId: string;
  readonly timestamp: number;
  readonly saved: boolean;

  constructor(data: { historyId: string; timestamp: number }) {
    this.historyId = data.historyId;
    this.timestamp = data.timestamp;
    this.saved = true;
  }
}
```

#### 2. 创建 Command

```typescript
// src/application/commands/save-request-history.command.ts

export class SaveRequestHistoryCommand implements ICommand<SaveRequestHistoryInput, SaveRequestHistoryOutput> {
  constructor(
    private orchestrator: IRequestHistoryOrchestrator,
    private eventBus: IEventBus
  ) {}

  async execute(input: SaveRequestHistoryInput): Promise<SaveRequestHistoryOutput> {
    const historyId = await this.orchestrator.saveHistory({
      collectionId: input.collectionId,
      requestId: input.requestId,
      response: input.response
    });

    this.eventBus.publish({
      type: 'RequestHistorySaved',
      data: { collectionId: input.collectionId, historyId }
    });

    return new SaveRequestHistoryOutput({
      historyId,
      timestamp: Date.now()
    });
  }
}
```

#### 3. 创建 Handler

```typescript
// src/presentation/webview/message-handlers/history-save-handler.ts

export class SaveHistoryHandler implements IMessageHandler {
  constructor(
    private saveCommand: SaveRequestHistoryCommand,
    private contextProvider: IPanelContextProvider
  ) {}

  getSupportedCommands(): string[] {
    return ['saveHistory'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    if (command !== 'saveHistory') return false;

    try {
      const result = await this.saveCommand.execute({
        collectionId: this.contextProvider.getCollectionId()!,
        requestId: this.contextProvider.getRequestId()!,
        response: message.response
      });

      messenger.postMessage({
        type: 'historySaved',
        data: result
      });
      return true;
    } catch (error) {
      messenger.postMessage({
        type: 'historyError',
        error: (error as Error).message
      });
      return true;
    }
  }
}
```

#### 4. 在 HandlerFactory 注册

```typescript
// src/presentation/webview/factories/handler-factory.ts

export class HandlerFactory {
  static createHandlers(
    commandBus: CommandBus,
    services: CoreServices,
    contextProvider: IPanelContextProvider
  ): IMessageHandler[] {
    const saveHistoryCommand = new SaveRequestHistoryCommand(
      services.requestHistoryOrchestrator,
      services.eventBus
    );

    return [
      // ... 其他 handlers
      new SaveHistoryHandler(saveHistoryCommand, contextProvider),
      // ...
    ];
  }
}
```

#### 5. 在 webview 中调用

```javascript
// resources/features/request-tester/modules/history-module.js

function saveToHistory(response) {
  vscode.postMessage({
    type: 'saveHistory',
    response: {
      statusCode: response.statusCode,
      body: response.body,
      headers: response.headers
    }
  });
}
```

---

## 场景 2: 修改执行流程

### 需求
在执行请求前，需要验证是否已选择环境。

### 实现（修改 Orchestrator）

```typescript
// src/orchestration/services/request-orchestrator.ts

async executeRequest(options: RequestExecutionOptions): Promise<ExecutionResult> {
  // ✅ 添加环境验证
  if (!options.environmentId) {
    throw new Error('Environment selection is required before execution');
  }

  // 继续原有流程...
}
```

这个改变会自动：
- ✅ Handler 的 try-catch 捕获错误
- ✅ 发送错误消息到 webview
- ✅ UI 显示错误提示

---

## 场景 3: 添加新树视图

### 需求
添加一个"最近请求"树视图。

### 步骤

#### 1. 创建 Loader

```typescript
// src/presentation/components/tree-providers/loaders/recent-requests-loader.ts

export class RecentRequestsLoader {
  constructor(private historyService: IRequestHistoryService) {}

  async loadRecent(limit: number = 10): Promise<RecentRequestModel[]> {
    const entries = await this.historyService.getRecent(limit);
    return entries.map(e => ({
      id: e.id,
      name: e.request.name,
      method: e.request.method,
      timestamp: e.timestamp
    }));
  }
}
```

#### 2. 创建 TreeProvider

```typescript
// src/presentation/components/tree-providers/recent-requests-tree-provider.ts

export class RecentRequestsTreeProvider implements vscode.TreeDataProvider<RecentRequestTreeItem> {
  constructor(private loader: RecentRequestsLoader) {}

  async getChildren(): Promise<RecentRequestTreeItem[]> {
    const models = await this.loader.loadRecent();
    return models.map(m => new RecentRequestTreeItem(m.id, m.name, `${m.method} ${m.timestamp}`));
  }

  getTreeItem(element: RecentRequestTreeItem): vscode.TreeItem {
    return element;
  }
}
```

#### 3. 在 extension.ts 中注册

```typescript
// src/extension.ts

const recentRequestsProvider = new RecentRequestsTreeProvider(
  new RecentRequestsLoader(services.historyService)
);

vscode.window.createTreeView('httpForge.recentRequests', {
  treeDataProvider: recentRequestsProvider
});
```

---

# 反面教材与修复

## 反面教材 1: Handler 中存在业务逻辑

### ❌ 错误

```typescript
// ❌ Handler 中有业务逻辑！
export class RequestExecutionHandler implements IMessageHandler {
  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    // ❌ 直接在 Handler 中实现逻辑
    const collections = await this.collectionService.getCollections();
    const request = collections
      .find(c => c.id === message.collectionId)
      ?.requests
      .find(r => r.id === message.requestId);

    const environment = await this.environmentService.get(message.environmentId);
    
    let url = request.url;
    for (const [key, value] of Object.entries(environment.variables)) {
      url = url.replace(`{{${key}}}`, value);
    }

    const response = await fetch(url, {
      method: request.method,
      headers: request.headers
    });

    // ... 继续处理响应
  }
}
```

### ✅ 修复

```typescript
// ✅ Handler 只路由消息，业务逻辑在 Command + Orchestrator
export class RequestExecutionHandler implements IMessageHandler {
  constructor(
    private executeRequestCommand: ExecuteRequestCommand,
    private contextProvider: IPanelContextProvider
  ) {}

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    if (command !== 'sendRequest') return false;

    try {
      // 清晰的职责划分
      const result = await this.executeRequestCommand.execute({
        collectionId: this.contextProvider.getCollectionId()!,
        requestId: message.requestId
      });

      messenger.postMessage({ type: 'requestExecuted', data: result });
      return true;
    } catch (error) {
      messenger.postMessage({ type: 'requestError', error: (error as Error).message });
      return true;
    }
  }
}
```

---

## 反面教材 2: 直接使用 getServiceContainer()

### ❌ 错误

```typescript
// ❌ 隐藏的依赖
export class SaveRequestHandler implements IMessageHandler {
  constructor(private contextProvider: IPanelContextProvider) {}

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    // 隐藏依赖，难以测试
    const collectionService = getServiceContainer().collectionService;
    const configService = getServiceContainer().configService;

    await collectionService.save(message.collection);
    configService.markDirty();

    messenger.postMessage({ type: 'saved' });
    return true;
  }
}
```

### ✅ 修复

```typescript
// ✅ 显式依赖注入
export class SaveRequestHandler implements IMessageHandler {
  constructor(
    private saveRequestCommand: SaveRequestCommand,  // ✅ 明确的依赖
    private contextProvider: IPanelContextProvider
  ) {}

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    if (command !== 'saveRequest') return false;

    try {
      const result = await this.saveRequestCommand.execute({
        collectionId: this.contextProvider.getCollectionId()!,
        request: message.request
      });

      messenger.postMessage({ type: 'saved', data: result });
      return true;
    } catch (error) {
      messenger.postMessage({ type: 'saveError', error: (error as Error).message });
      return true;
    }
  }
}
```

---

# 测试策略

## 单元测试：Command

```typescript
// src/application/commands/__tests__/execute-request.command.spec.ts

describe('ExecuteRequestCommand', () => {
  let command: ExecuteRequestCommand;
  let mockOrchestrator: jest.Mocked<IRequestOrchestrator>;
  let mockEventBus: jest.Mocked<IEventBus>;

  beforeEach(() => {
    mockOrchestrator = {
      executeRequest: jest.fn().mockResolvedValue({
        response: { status: 200, body: '{}' },
        duration: 100,
        cookies: []
      })
    } as any;

    mockEventBus = {
      publish: jest.fn()
    } as any;

    command = new ExecuteRequestCommand(mockOrchestrator, mockEventBus, logger);
  });

  it('should execute request and return DTO', async () => {
    const result = await command.execute({
      collectionId: 'col1',
      requestId: 'req1',
      environmentId: 'env1'
    });

    expect(result.statusCode).toBe(200);
    expect(mockOrchestrator.executeRequest).toHaveBeenCalledWith({
      collectionId: 'col1',
      requestId: 'req1',
      environmentId: 'env1'
    });
  });

  it('should publish event after execution', async () => {
    await command.execute({
      collectionId: 'col1',
      requestId: 'req1'
    });

    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'RequestExecuted'
      })
    );
  });

  it('should throw if collectionId is missing', async () => {
    await expect(
      command.execute({ collectionId: '', requestId: 'req1' })
    ).rejects.toThrow('collectionId is required');
  });
});
```

---

## 单元测试：Handler

```typescript
// src/presentation/webview/message-handlers/__tests__/request-execution-handler.spec.ts

describe('RequestExecutionHandler', () => {
  let handler: RequestExecutionHandler;
  let mockCommand: jest.Mocked<IExecuteRequestCommand>;
  let mockContextProvider: jest.Mocked<IPanelContextProvider>;
  let mockMessenger: jest.Mocked<IWebviewMessenger>;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn().mockResolvedValue({
        statusCode: 200,
        body: '{}'
      })
    } as any;

    mockContextProvider = {
      getCollectionId: jest.fn().mockReturnValue('col1'),
      getRequestId: jest.fn().mockReturnValue('req1')
    } as any;

    mockMessenger = {
      postMessage: jest.fn()
    } as any;

    handler = new RequestExecutionHandler(mockCommand, mockContextProvider, logger);
  });

  it('should handle sendRequest command', async () => {
    const result = await handler.handle('sendRequest', { requestId: 'req1' }, mockMessenger);

    expect(result).toBe(true);
    expect(mockCommand.execute).toHaveBeenCalled();
  });

  it('should post success message', async () => {
    await handler.handle('sendRequest', { requestId: 'req1' }, mockMessenger);

    expect(mockMessenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'requestExecuted' })
    );
  });

  it('should handle errors gracefully', async () => {
    mockCommand.execute.mockRejectedValue(new Error('Network error'));

    await handler.handle('sendRequest', { requestId: 'req1' }, mockMessenger);

    expect(mockMessenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'requestError',
        error: 'Network error'
      })
    );
  });

  it('should return false for unknown commands', async () => {
    const result = await handler.handle('unknownCommand', {}, mockMessenger);
    expect(result).toBe(false);
  });
});
```

---

# 性能与调试

## 性能优化建议

### 1. 避免重复加载

```typescript
// ❌ 不好：每次都重新加载
async getChildren(element): Promise<TreeItem[]> {
  const collections = await this.loader.loadCollections();  // 每次都查询！
  return collections.map(...);
}

// ✅ 好：缓存结果
export class CachedCollectionLoader {
  private cache: Map<string, Collection[]> = new Map();

  async loadCollections(): Promise<Collection[]> {
    if (this.cache.has('collections')) {
      return this.cache.get('collections')!;
    }

    const collections = await this.baseLoader.loadCollections();
    this.cache.set('collections', collections);
    return collections;
  }

  invalidateCache(): void {
    this.cache.clear();
  }
}
```

### 2. 使用 Promise.all 并行加载

```typescript
// ❌ 顺序加载：慢
const collection = await this.repository.getCollection(id);
const environment = await this.repository.getEnvironment(envId);
const variables = await this.repository.getVariables();

// ✅ 并行加载：快
const [collection, environment, variables] = await Promise.all([
  this.repository.getCollection(id),
  this.repository.getEnvironment(envId),
  this.repository.getVariables()
]);
```

---

## 调试技巧

### 1. 使用结构化日志

```typescript
// src/infrastructure/logger.ts

export class Logger implements ILogger {
  debug(message: string, context?: any): void {
    console.debug(`[${new Date().toISOString()}] DEBUG: ${message}`, context);
  }

  error(message: string, error?: any): void {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error);
  }
}
```

### 2. Handler 中的日志

```typescript
async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
  this.logger.debug(`[${this.constructor.name}] Handling command`, { command, message });

  try {
    const result = await this.executeCommand.execute(input);
    this.logger.debug(`[${this.constructor.name}] Success`, { result });
    return true;
  } catch (error) {
    this.logger.error(`[${this.constructor.name}] Failed`, error);
    return true;
  }
}
```

### 3. Orchestrator 中的日志

```typescript
async executeRequest(options: RequestExecutionOptions): Promise<ExecutionResult> {
  this.logger.debug('[RequestOrchestrator] Step 1: Loading collection', { collectionId: options.collectionId });
  const collection = await this.collectionRepository.getCollection(options.collectionId);

  this.logger.debug('[RequestOrchestrator] Step 2: Loading environment', { environmentId: options.environmentId });
  const environment = await this.environmentRepository.getEnvironment(options.environmentId);

  // ...
}
```

---

## 总结

这份指南时刻遵循这些核心原则：

- ✅ **单一职责**：每个类做一件事
- ✅ **接口分离**：功能隔离，便于测试
- ✅ **依赖注入**：显式声明依赖
- ✅ **不可变性**：DTO 是不可变的
- ✅ **事件驱动**：通过事件总线通信
- ✅ **可追溯**：清晰的日志和执行流

Happy coding! 🚀
