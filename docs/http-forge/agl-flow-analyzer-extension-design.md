# AGL Flow Analyzer - VS Code Extension Design

## 概述

AGL Flow Analyzer 是一个 VS Code 扩展，用于可视化分析 AGL middleware 的请求处理流程。它可以帮助开发者：

1. **选择并分析 endpoint** - 查看指定 endpoint 的完整 middleware 链
2. **可视化 middleware 调用层次** - 展示每个 middleware 调用的组件和依赖
3. **追踪 `res.locals.*` 数据流** - 显示 middleware 之间如何传递数据
4. **快速导航** - 从可视化视图跳转到对应代码
5. **配置查阅** - 查看 `panicConfigKey`、`nanoConfigKey`、`template` 等配置

---

## 核心功能模块

### 1. Endpoint Flow Viewer (端点流程查看器)

```
┌─────────────────────────────────────────────────────────────────┐
│  Endpoint: GET /TELUS/1.5/.../TRAY/COLLECTION                   │
│  Template: collection_1_2-sdk                                   │
│  Panic: false                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─── Middleware Chain ───────────────────────────────────────┐ │
│  │                                                            │ │
│  │  1. shared/authUserCookieDecrypt                          │ │
│  │     ├─ Reads: req.cookies, req.headers                    │ │
│  │     └─ Sets:  res.locals.avsToken                         │ │
│  │              res.locals.authCookieDecrypted               │ │
│  │                          ↓                                │ │
│  │  2. shared/isTokenValid                                   │ │
│  │     ├─ Reads: res.locals.avsToken                         │ │
│  │     └─ Sets:  res.locals.isTokenValid                     │ │
│  │                          ↓                                │ │
│  │  3. shared/paginationValidation                           │ │
│  │     ├─ Reads: req.query.from, req.query.to                │ │
│  │     └─ Sets:  res.locals.pagination                       │ │
│  │                          ↓                                │ │
│  │  4. tray_1_2/collection                                   │ │
│  │     ├─ Reads: req.query.ids                               │ │
│  │     └─ Sets:  res.locals.vodIdList                        │ │
│  │                          ↓                                │ │
│  │  5. shared/getContentMetadata_1_5                         │ │
│  │     ├─ Reads: res.locals.vodIdList                        │ │
│  │     │         res.locals.liveIdList                       │ │
│  │     ├─ Calls: DCQ (GetVodContentMetadata)                 │ │
│  │     │         DCQ (GetLiveContentMetadata)                │ │
│  │     └─ Sets:  res.locals.vodList                          │ │
│  │              res.locals.liveList                          │ │
│  │              res.locals.bundleList                        │ │
│  │              res.locals.seedData.containers               │ │
│  │                          ↓                                │ │
│  │  6. content_1_4/content_enrichment/enrichment             │ │
│  │     ├─ Reads: res.locals.vodList                          │ │
│  │     │         res.locals.liveList                         │ │
│  │     │         res.locals.channelList                      │ │
│  │     ├─ Calls: enrichFactory.enrichDCQrecord               │ │
│  │     └─ Sets:  (enriches content in-place)                 │ │
│  │                          ↓                                │ │
│  │  7. shared/autoMapper                                     │ │
│  │     ├─ Reads: res.locals.seedData                         │ │
│  │     ├─ Uses:  template: collection_1_2-sdk                │ │
│  │     └─ Sets:  res.locals.mappedResponse                   │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Data Flow Diagram (数据流图)

显示 `res.locals.*` 的产生和消费关系：

```
┌─────────────────────────────────────────────────────────────────┐
│  res.locals Data Flow                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  avsToken ──────────────┬──→ isTokenValid                       │
│     ↑                   └──→ shared/isTokenValid                │
│     │                                                           │
│  authUserCookieDecrypt                                          │
│                                                                 │
│  vodIdList ─────────────────→ getContentMetadata_1_5            │
│     ↑                              │                            │
│     │                              ↓                            │
│  tray_1_2/collection         vodList ──→ content_enrichment     │
│                              liveList ─→ content_enrichment     │
│                              bundleList → content_enrichment    │
│                                    │                            │
│                                    ↓                            │
│                              seedData.containers                │
│                                    │                            │
│                                    ↓                            │
│                              autoMapper → mappedResponse        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Middleware Detail Panel (中间件详情面板)

点击任意 middleware 展开详情：

```
┌─────────────────────────────────────────────────────────────────┐
│  📦 shared/getContentMetadata_1_5                               │
├─────────────────────────────────────────────────────────────────┤
│  📁 File: shared/getContentMetadata_1_5.js                      │
│  🔗 [Open in Editor]  [Go to Definition]                        │
├─────────────────────────────────────────────────────────────────┤
│  📥 Input (res.locals reads):                                   │
│     • vodIdList: Array<string> - VOD content IDs                │
│     • liveIdList: Array<string> - Live program IDs              │
│     • fullResponse: Object - (skip if exists)                   │
├─────────────────────────────────────────────────────────────────┤
│  📤 Output (res.locals writes):                                 │
│     • vodList: Object - VOD content metadata                    │
│     • liveList: Object - Live program metadata                  │
│     • bundleList: Object - Bundle metadata                      │
│     • gobList: Object - Group of bundles metadata               │
│     • seedData.containers: Array - Merged containers            │
│     • seedData.total: Number - Total count                      │
├─────────────────────────────────────────────────────────────────┤
│  🌐 External Calls:                                             │
│     • DCQ Template: GetVodContentMetadata                       │
│     • DCQ Template: GetLiveContentMetadata                      │
│     • Uses: @opus/agl-cache (getMWareConfig)                    │
│     • Uses: @opus/agl-utils (pagination)                        │
├─────────────────────────────────────────────────────────────────┤
│  ⚙️ Config Dependencies:                                        │
│     • mWareConfig.tray.maxResults (default: 10000)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Configuration Quick View (配置快速查看)

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Endpoint Configuration                                      │
├─────────────────────────────────────────────────────────────────┤
│  🔑 panicConfigKey: (none)                                      │
│  🔑 nanoConfigKey: (none)                                       │
│  📄 template: collection_1_2-sdk                                │
│     └─ [View Template] → autoMapperConfig.json                  │
├─────────────────────────────────────────────────────────────────┤
│  📁 Related Configs:                                            │
│  ├─ customRoutes.json [Open]                                    │
│  ├─ mWareConfig.json [Open]                                     │
│  ├─ customPanicConfig.json [Open]                               │
│  └─ smartRestConfig.json [Open]                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 技术架构

### 目录结构

```
agl-essentials/
├── src/
│   ├── extension.ts
│   ├── models/
│   │   ├── endpoint-config.ts          # Endpoint 配置模型
│   │   ├── middleware-info.ts          # Middleware 信息模型
│   │   ├── data-flow.ts                # 数据流模型
│   │   └── res-locals-tracker.ts       # res.locals 追踪器
│   ├── analyzers/
│   │   ├── middleware-analyzer.ts      # Middleware 代码分析器
│   │   ├── res-locals-analyzer.ts      # res.locals 使用分析
│   │   ├── dependency-analyzer.ts      # 依赖分析（require/import）
│   │   └── config-analyzer.ts          # 配置文件分析
│   ├── providers/
│   │   ├── endpoint-flow-provider.ts   # 端点流程树视图
│   │   ├── data-flow-provider.ts       # 数据流视图
│   │   └── middleware-detail-provider.ts
│   ├── webview-panels/
│   │   ├── flow-diagram-panel.ts       # 流程图 Webview
│   │   ├── data-flow-panel.ts          # 数据流图 Webview
│   │   └── middleware-detail-panel.ts  # 详情面板
│   ├── services/
│   │   ├── code-navigation-service.ts  # 代码导航服务
│   │   ├── config-service.ts           # 配置读取服务
│   │   └── cache-service.ts            # 分析结果缓存
│   └── utils/
│       ├── ast-utils.ts                # AST 解析工具
│       └── path-resolver.ts            # 路径解析
├── resources/
│   └── features/
│       ├── flow-diagram/
│       │   ├── index.html
│       │   ├── script.js               # D3.js 或 Mermaid 渲染
│       │   └── style.css
│       └── data-flow/
│           ├── index.html
│           ├── script.js
│           └── style.css
└── package.json
```

### 核心数据模型

```typescript
// models/endpoint-config.ts
interface EndpointConfig {
  endpointUri: string;
  method: 'get' | 'post' | 'put' | 'delete';
  middleware: string[];
  panic: boolean | string;           // panicConfigKey
  template: string;
  nanoConfigKey?: string;
  // 解析后的附加信息
  resolvedMiddlewares?: MiddlewareInfo[];
}

// models/middleware-info.ts
interface MiddlewareInfo {
  name: string;                       // e.g., "tray_1_2/collection"
  filePath: string;                   // 绝对路径
  
  // res.locals 分析结果
  resLocalsReads: ResLocalsUsage[];   // 读取的 res.locals 属性
  resLocalsWrites: ResLocalsUsage[];  // 写入的 res.locals 属性
  
  // 依赖分析
  externalCalls: ExternalCall[];      // 外部服务调用
  internalDeps: string[];             // 内部模块依赖
  configDeps: ConfigDependency[];     // 配置依赖
  
  // 源码定位
  runFunctionLocation?: Location;     // run 函数位置
  panicFunctionLocation?: Location;   // panic 函数位置
}

interface ResLocalsUsage {
  property: string;                   // e.g., "vodIdList"
  type: 'read' | 'write';
  dataType?: string;                  // 推断的数据类型
  description?: string;               // JSDoc 注释
  lineNumber: number;
  codeSnippet: string;                // 代码片段
}

interface ExternalCall {
  type: 'dcq' | 'microservice' | 'elasticsearch' | 'cache';
  template?: string;                  // DCQ template name
  endpoint?: string;
  method?: string;
}

interface ConfigDependency {
  source: 'mWareConfig' | 'appConfig' | 'sysParameter';
  key: string;
  defaultValue?: any;
}
```

### res.locals 分析器

```typescript
// analyzers/res-locals-analyzer.ts
import * as ts from 'typescript';

export class ResLocalsAnalyzer {
  /**
   * 分析 middleware 文件中的 res.locals 使用
   */
  analyze(filePath: string): ResLocalsUsage[] {
    const sourceFile = ts.createSourceFile(
      filePath,
      fs.readFileSync(filePath, 'utf-8'),
      ts.ScriptTarget.Latest
    );
    
    const usages: ResLocalsUsage[] = [];
    
    const visit = (node: ts.Node) => {
      // 检测 res.locals.xxx 的读写
      if (ts.isPropertyAccessExpression(node)) {
        const text = node.getText();
        
        // 匹配 res.locals.xxx
        const match = text.match(/res\.locals\.(\w+)/);
        if (match) {
          const property = match[1];
          const parent = node.parent;
          
          // 判断是读还是写
          const isWrite = ts.isBinaryExpression(parent) && 
            parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            parent.left === node;
          
          usages.push({
            property,
            type: isWrite ? 'write' : 'read',
            lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            codeSnippet: this.getCodeSnippet(sourceFile, node)
          });
        }
      }
      
      ts.forEachChild(node, visit);
    };
    
    visit(sourceFile);
    return usages;
  }
}
```

### Webview 流程图渲染

使用 Mermaid.js 渲染流程图：

```typescript
// webview-panels/flow-diagram-panel.ts
export class FlowDiagramPanel {
  private generateMermaidDiagram(endpoint: EndpointConfig): string {
    let diagram = 'flowchart TD\n';
    
    endpoint.resolvedMiddlewares?.forEach((mw, index) => {
      const id = `M${index}`;
      const nextId = `M${index + 1}`;
      
      // 节点定义
      diagram += `    ${id}["${mw.name}"]\n`;
      
      // 连接线（带 res.locals 信息）
      if (index < endpoint.middleware.length - 1) {
        const outputs = mw.resLocalsWrites.map(w => w.property).join('\\n');
        diagram += `    ${id} -->|"${outputs}"| ${nextId}\n`;
      }
    });
    
    return diagram;
  }
}
```

---

## 用户交互流程

### 1. 选择 Endpoint

```
Command Palette: AGL: Analyze Endpoint Flow
     ↓
Quick Pick: 显示所有 endpoint 列表（支持搜索过滤）
     ↓
选择: GET /TELUS/1.5/.../TRAY/COLLECTION
     ↓
打开: Flow Diagram Webview
```

### 2. 查看 Middleware 详情

```
在流程图中点击 middleware 节点
     ↓
侧边栏显示详情面板
     ↓
点击 [Open in Editor] → 跳转到对应文件
点击 [Go to run()] → 定位到 run 函数
```

### 3. 追踪数据流

```
点击 res.locals.vodList
     ↓
高亮显示:
  - 产生者: tray_1_2/collection (line 52)
  - 消费者: getContentMetadata_1_5 (line 89)
            content_enrichment (line 34)
     ↓
点击任意位置 → 跳转到代码
```

---

## package.json 配置扩展

```json
{
  "contributes": {
    "commands": [
      {
        "command": "agl.analyzeEndpoint",
        "title": "AGL: Analyze Endpoint Flow"
      },
      {
        "command": "agl.showDataFlow",
        "title": "AGL: Show Data Flow Diagram"
      },
      {
        "command": "agl.trackResLocals",
        "title": "AGL: Track res.locals Property"
      }
    ],
    "views": {
      "aglEssentials": [
        {
          "id": "aglEndpointFlow",
          "name": "Endpoint Flow",
          "icon": "resources/flow-icon.svg"
        },
        {
          "id": "aglDataFlow",
          "name": "Data Flow",
          "icon": "resources/data-icon.svg"
        },
        {
          "id": "aglMiddlewareDetail",
          "name": "Middleware Detail",
          "icon": "resources/detail-icon.svg"
        }
      ]
    },
    "menus": {
      "editor/context": [
        {
          "command": "agl.trackResLocals",
          "when": "editorTextFocus && resourceExtname == .js",
          "group": "agl"
        }
      ]
    }
  }
}
```

---

## 常见 res.locals 属性参考

基于代码分析，以下是常见的 `res.locals` 属性及其用途：

| 属性 | 产生者 | 类型 | 描述 |
|------|--------|------|------|
| `avsToken` | authUserCookieDecrypt | Object | 解密后的 AVS token |
| `isTokenValid` | isTokenValid | Boolean | Token 是否有效 |
| `vodIdList` | tray_*/collection | Array<string> | VOD 内容 ID 列表 |
| `liveIdList` | tray_*/collection | Array<string> | 直播内容 ID 列表 |
| `vodList` | getContentMetadata | Object | VOD 内容元数据 |
| `liveList` | getContentMetadata | Object | 直播内容元数据 |
| `bundleList` | getContentMetadata | Object | Bundle 元数据 |
| `gobList` | getContentMetadata | Object | Group of bundles |
| `channelList` | various | Object | 频道列表 |
| `recordingList` | recording handlers | Object | 录制列表 |
| `seedData` | various | Object | 最终响应数据种子 |
| `seedData.containers` | getContentMetadata | Array | 内容容器 |
| `seedData.total` | various | Number | 总数 |
| `fullResponse` | various | Object | 完整响应（短路优化）|
| `mappedResponse` | autoMapper | Object | 映射后的响应 |
| `pagination` | paginationValidation | Object | 分页信息 |
| `cookies` | AVSCookies | Object | 要设置的 cookies |

---

## 实现优先级

### Phase 1 (MVP)
1. ✅ Endpoint 选择器 (Quick Pick)
2. ✅ Middleware 链展示 (Tree View)
3. ✅ 代码导航 (Go to File)
4. ✅ 配置查看 (template, panic, nano)

### Phase 2
1. 📊 res.locals 读写分析
2. 📊 数据流可视化 (Mermaid)
3. 📊 Middleware 详情面板

### Phase 3
1. 🔍 外部调用追踪 (DCQ, microservices)
2. 🔍 配置依赖分析
3. 🔍 实时调试集成

---

## 下一步

1. 在 `agl-essentials` 中添加新的 analyzer 模块
2. 扩展 `package.json` 添加新命令和视图
3. 实现 `ResLocalsAnalyzer` 进行 AST 分析
4. 创建 Webview 面板渲染流程图

需要我开始实现其中的某个模块吗？
