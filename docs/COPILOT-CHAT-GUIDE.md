# HTTP Forge Copilot Chat Custom Instructions

这个文件用于 GitHub Copilot Chat 的上下文，帮助 Copilot 理解项目的架构和最佳实践。

## 使用方法

在 Copilot Chat 中使用 `@file` 引用功能，直接引用相关架构文档：

```
@ARCHITECTURE-ANALYSIS.md - 完整架构分析
@docs/CUSTOM-INSTRUCTIONS.md - 详细开发指南
@.vscode/.copilot-instructions - 快速参考
```

或者使用以下自定义 Chat 指令：

---

## Copilot Chat 指令集

### 📋 指令 #1: 分析当前代码架构

**触发词**: `check-architecture`

```
请分析我提供的代码，检查是否遵循 HTTP Forge DDD 架构：
1. 是否位于正确的层（Presentation/Application/Orchestration/Infrastructure）
2. 是否遵循 SOLID 原则
3. 是否有未被消除的反模式（getServiceContainer, as any, 循环依赖等）
4. 是否有隐藏的依赖关系

使用以下评分标准：
- ✅ 符合架构（可以合并）
- ⚠️ 需要改进（给出具体建议）
- ❌ 违反架构（必须重构）
```

### 📋 指令 #2: 生成 Handler 实现

**触发词**: `create-handler`

```
基于我提供的需求，生成一个完整的 HTTP Forge Handler：

模板要求：
1. 实现 IMessageHandler 接口
2. 所有依赖在构造函数中声明（使用接口，不是具体类）
3. getSupportedCommands() 返回字符串数组
4. handle() 方法包含：
   - Guard 子句检查命令类型
   - Try-catch 错误处理
   - 调用 Command.execute()
   - postMessage() 发送响应
5. 包含 validateInput() 方法
6. 使用 logger 记录调试信息
7. 没有 getServiceContainer() 调用
8. 没有 as any 类型转换

参考模板位置：.vscode/http-forge.code-snippets (hf-handler)
```

### 📋 指令 #3: 生成 Command 实现

**触发词**: `create-command`

```
基于我提供的用例，生成一个完整的 HTTP Forge Command：

实现要求：
1. 定义 Input 接口（字段使用 ? 表示可选）
2. 定义 Output class（字段使用 readonly）
3. 实现 ICommand<Input, Output>
4. 构造函数注入：
   - 一个 Orchestrator 接口
   - IEventBus
   - ILogger
5. execute() 方法包含：
   - 验证输入（validateInput）
   - 调用 orchestrator 方法
   - 发布事件到 eventBus
   - 返回 Output DTO
6. 错误处理和日志

参考模板位置：.vscode/http-forge.code-snippets (hf-command)
```

### 📋 指令 #4: 重构旧代码

**触发词**: `refactor-legacy`

```
我提供的代码使用了旧的模式（直接 getServiceContainer 调用、混合职责等）。
请将其重构为新的 DDD 架构：

重构步骤：
1. 识别代码中的职责（是 UI 逻辑、业务流程还是数据访问）
2. 将其分解到合适的层（Presentation/Application/Orchestration）
3. 提取 DTO、Command、Handler 等文件
4. 使用依赖注入替代 getServiceContainer()
5. 消除循环依赖
6. 添加 JSDoc 说明职责

提供修改建议，包括：
- 需要创建的新文件
- 需要修改的现有文件
- 文件迁移清单
```

### 📋 指令 #5: 添加单元测试

**触发词**: `generate-test`

```
为我提供的代码生成完整的单元测试：

测试要求：
1. 使用 Jest 框架
2. 模拟所有外部依赖（ICommand, IOrchestrator, IEventBus）
3. 覆盖成功路径和错误路径
4. 验证命令是否被调用
5. 验证消息是否被发送
6. 测试输入验证
7. 包含 beforeEach 设置和各种场景

参考模板位置：.vscode/http-forge.code-snippets (hf-test-handler, hf-test-command)
```

### 📋 指令 #6: 代码审查

**触发词**: `review-code`

```
请审查我提供的代码，从以下方面评估：

架构评分：
□ 单一职责原则遵循度（1-10）
□ 依赖倒置原则遵循度（1-10）
□ 代码可测试性（1-10）

具体反馈：
□ 存在的问题和改进建议
□ 是否有隐藏的依赖
□ 是否有类型不安全的地方
□ 是否有性能问题
□ 是否需要添加日志

提供具体的修复代码示例。
```

### 📋 指令 #7: 快速决策

**触发词**: `where-does-this-go`

```
我需要实现 [功能描述]。

请告诉我：
1. 这个功能的主要职责是什么？
2. 应该在哪一层实现？（Presentation/Application/Orchestration/Infrastructure）
3. 需要创建哪些新文件？
4. 需要修改哪些现有文件？
5. 这个功能与现有代码的主要交互点是什么？

提供完整的文件创建方案。
```

### 📋 指令 #8: 迁移计划

**触发词**: `migration-plan`

```
我想将 [旧功能/服务] 从当前混合设计迁移到新的 DDD 架构。

请提供：
1. 迁移 phases（多少周时间）
2. 每个 phase 的具体任务
3. 预期的代码量变化
4. 风险评估
5. 回滚计划
6. 测试策略

确保迁移是渐进式的，不会破坏现有功能。
```

---

## 常用 Chat 提示语

### 询问架构决策

```
@ARCHITECTURE-ANALYSIS.md @docs/CUSTOM-INSTRUCTIONS.md
为什么我们要用 DDD 分层架构？相比混合设计有什么优势？
```

### 检查代码符合性

```
@.vscode/.copilot-instructions
请检查这段代码是否违反了 HTTP Forge 的架构原则：
[粘贴代码]
```

### 生成完整功能

```
@.vscode/http-forge.code-snippets
我需要添加一个新的 webview 消息来保存当前请求。
请基于模板为我生成完整的 Handler、Command 和 DTO。

消息类型: saveToDrafts
需要的数据: collectionId, requestId, draftName
```

### 理解现有代码

```
@ARCHITECTURE-ANALYSIS.md
请解释 #Section 5 中提到的"反模式 #1: Service Locator"是什么？
为什么这是反模式？
如何修复？
```

---

## Copilot Chat 预设回答

当 Copilot 提出以下问题时，请使用这些指导：

### Q: "我应该在哪里处理这个错误？"

**A**: 按照这个优先级：
1. **Validation**: 在 Command.execute() 中验证输入
2. **Business Logic**: 在 Orchestrator 中处理业务规则错误
3. **Error Recovery**: 在 Handler 的 try-catch 中处理并发送错误消息
4. **Logging**: 所有错误都应该被 logger.error() 记录

### Q: "我应该如何访问服务？"

**A**: 从不：
```typescript
// ❌ 错误
const service = getServiceContainer().someService;
```

正确做法：
```typescript
// ✅ 正确
constructor(
  private service: ISomeService,  // 在构造函数中声明
  ...
) {}
```

### Q: "Handler 可以直接调用 Orchestrator 吗？"

**A**: 不，必须通过 Command 中介：
```typescript
// ❌ 错误
const result = this.orchestrator.execute(...);

// ✅ 正确
const result = await this.command.execute(...);
```

### Q: "我需要在多个地方使用这个逻辑，应该怎么做？"

**A**: 将其提取到 Command 中，然后在多个 Handler 中调用：
```typescript
// 多个 Handler 可以共用同一个 Command
this.saveRequestCommand.execute(input);
```

---

## 架构规则快速检查

使用这个清单快速验证代码：

```typescript
// 在 Chat 中粘贴这个清单，让 Copilot 帮你检查

SOLID Checklist for HTTP Forge Code Review:

☐ Single Responsibility: 这个类只有一个理由改变吗？
☐ Open/Closed: 可以通过添加新代码而不修改现有代码来扩展吗？
☐ Liskov Substitution: 所有实现都是可互换的吗？
☐ Interface Segregation: 依赖的接口都是最小化的吗？
☐ Dependency Inversion: 依赖的是抽象还是具体实现？

DDD Layering Checklist:

☐ Presentation 层: 只有 UI 逻辑吗？没有业务规则吗？
☐ Application 层: 只编排用例吗？没有业务逻辑吗？
☐ Orchestration 层: 实现了所有业务逻辑吗？
☐ Infrastructure 层: 处理了所有技术细节吗？

Anti-pattern Checklist:

☐ 没有 getServiceContainer() 直接调用
☐ 没有 as any 类型转换
☐ 没有循环依赖
☐ 没有共享可变状态
☐ 没有隐藏依赖
```

---

## 集成 GitHub Copilot Chat

### 在 VS Code 中使用

1. 打开 Copilot Chat（Cmd + Shift + I / Ctrl + Shift + I）
2. 在聊天框中输入指令，例如：

```
@ARCHITECTURE-ANALYSIS.md create-handler
我想创建一个处理新环境选择的 Handler。
需要做什么？
```

3. Copilot 会参考相关文档并给出具体建议

### 自定义快捷键

在 `keybindings.json` 中添加快捷方式来快速访问架构指令：

```json
{
  "key": "cmd+shift+a",
  "command": "workbench.action.quickOpen",
  "args": "@ARCHITECTURE-ANALYSIS.md"
},
{
  "key": "cmd+shift+d",
  "command": "workbench.action.quickOpen",
  "args": "@docs/CUSTOM-INSTRUCTIONS.md"
}
```

---

## 故障排除

### "Copilot 生成的代码不符合架构"

→ 在提示中明确引用`.vscode/.copilot-instructions`，例如：
```
@.vscode/.copilot-instructions
请根据 HTTP Forge 架构原则生成这个 Handler...
```

### "Copilot 推荐使用 getServiceContainer()"

→ 提醒 Copilot：
```
根据 HTTP Forge 架构规则，禁止使用 getServiceContainer()。
改用构造函数依赖注入实现。
```

### "生成的代码有循环依赖"

→ 要求 Copilot 使用 Factory 模式：
```
这会导致循环依赖。请改用 HandlerFactory 模式来初始化所有依赖。
参考：src/presentation/webview/factories/handler-factory.ts
```

---

## 相关资源

| 文件 | 用途 |
|------|------|
| `ARCHITECTURE-ANALYSIS.md` | 完整的架构分析和设计文档 |
| `docs/CUSTOM-INSTRUCTIONS.md` | 详细的开发指南和实例 |
| `.vscode/.copilot-instructions` | Copilot 的快速参考 |
| `.vscode/http-forge.code-snippets` | 代码片段模板 |
| `docs/PHASE-3-IMPLEMENTATION.md` | 原始实现计划 |

---

## 总结

使用这些 Copilot 指令和资源来：
- ✅ 更快地编写符合架构的代码
- ✅ 自动检查新代码的合规性
- ✅ 生成测试和文档
- ✅ 理解架构决策
- ✅ 规划大型重构

Happy coding! 🚀
