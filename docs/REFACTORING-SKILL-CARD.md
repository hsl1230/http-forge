# Refactoring Skill Card

Quick reference guide for refactoring code to DDD architecture.
Use this alongside `.vscode/.copilot-instructions` and `docs/CUSTOM-INSTRUCTIONS.md`

---

## 🎓 Core Skills

### Skill #1: Creating a Handler

**When**: You need to handle a new Webview message

**Template to use**: `hf-handler` in .vscode/http-forge.code-snippets

**Required checks**:
```
✅ Implements IMessageHandler interface
✅ getSupportedCommands() returns string[]
✅ handle() method with try-catch
✅ Calls this.command.execute() (NOT getServiceContainer())
✅ Uses messenger.postMessage() for responses
✅ Includes logger.debug() calls
✅ No "as any" type casts
✅ All dependencies in constructor (are interfaces)
```

**File location**: `src/presentation/webview/message-handlers/`

**Related files created**:
- Command in `src/application/commands/`
- DTO in `src/application/dto/`
- Tests in `__tests__/` subfolder

---

### Skill #2: Creating a Command

**When**: You need to implement a use case

**Template to use**: `hf-command` in .vscode/http-forge.code-snippets

**Required checks**:
```
✅ Separate Input interface and Output class
✅ Output has readonly fields
✅ Implements ICommand<Input, Output>
✅ includeValidateInput() method
✅ Calls orchestrator method (delegates logic)
✅ Publishes event via eventBus.publish()
✅ Returns Output DTO
✅ Lets exceptions propagate (Handler catches them)
✅ Includes logger.debug() calls
```

**File location**: `src/application/commands/`

**Related files created**:
- DTOs in `src/application/dto/`
- Handler in `src/presentation/webview/message-handlers/`
- Tests in `__tests__/`

---

### Skill #3: Creating DTOs

**When**: You need to define cross-layer data structures

**Template to use**: `hf-dto` in .vscode/http-forge.code-snippets

**Required checks**:
```
✅ Input is interface (fields use ? for optional)
✅ Output is class (for potential methods)
✅ Output fields are readonly
✅ Clear JSDoc explaining purpose
✅ Factory method (from(), fromCore(), etc)
✅ No business logic
✅ Immutable by design
```

**File location**: `src/application/dto/`

**Example**: `execute-request.dto.ts`, `save-collection.dto.ts`

---

### Skill #4: Creating Tests

**When**: You create any new Handler or Command

**Template to use**: 
- `hf-test-handler` for Handler tests
- `hf-test-command` for Command tests

**Required checks**:
```
✅ Mock ALL external dependencies
✅ beforeEach() sets up mocks
✅ Tests success path
✅ Tests error path
✅ Tests validation
✅ Verifies command.execute() called
✅ Verifies postMessage() called with data
✅ 80%+ coverage target
✅ Using Jest framework
```

**File location**: `src/presentation/webview/message-handlers/__tests__/` or `src/application/commands/__tests__/`

**Example**: `request-execution-handler.spec.ts`

---

### Skill #5: Creating Tree Loader

**When**: You need to load data for tree view (decouple from UI)

**Template to use**: `hf-tree-loader` in .vscode/http-forge.code-snippets

**Required checks**:
```
✅ Implements IXxxModelLoader interface
✅ Returns plain model objects (no VS Code types)
✅ loadXxx() returns Promise<Model[]>
✅ loadChildren() handles parent hierarchies
✅ No UI logic inside
✅ Can be reused outside VS Code
✅ Include logger.debug() calls
✅ Full test coverage
```

**File location**: `src/presentation/components/tree-providers/loaders/`

**Related files created**:
- Tree provider in `src/presentation/components/tree-providers/`
- Tests beside implementation

---

### Skill #6: Creating Tree Provider

**When**: You render tree items in VS Code sidebar

**Template to use**: `hf-tree-provider` in .vscode/http-forge.code-snippets

**Required checks**:
```
✅ Implements vscode.TreeDataProvider<TreeItem>
✅ Uses loader for model loading
✅ getChildren() calls loader.loadChildren()
✅ modelToTreeItem() handles conversion to UI
✅ No business logic
✅ Includes iconPath assignment
✅ Includes command assignment
✅ onDidChangeTreeData event for refresh
✅ refresh() method clears cache
```

**File location**: `src/presentation/components/tree-providers/`

---

## 🚫 Golden Rules (NEVER Break These)

```
✅ MUST DO:
  • Use constructor dependency injection
  • All dependencies are INTERFACES
  • Try-catch in Handler.handle()
  • logger.debug() on method entry
  • logger.error() on errors
  • JSDoc on every public method/class
  • Unit tests for all new code
  • Return DTOs from Commands
  • Publish events via IEventBus
  • Implement proper interfaces

❌ MUST NOT DO:
  • getServiceContainer() calls
  • "as any" type casts
  • Circular dependencies
  • Shared mutable state
  • Business logic in Handlers
  • Business logic in Presentation
  • Service locator pattern
  • Direct "new" of concrete classes (except DTOs)
  • Skip error handling
  • Forget tests
```

---

## 🔄 Refactoring Flow

### When refactoring an existing feature:

```
1. Understand current code
   └─ What does it do? What messages? What services?

2. Design new structure (mental model)
   └─ Handler (message routing)
   └─ Command (use case)
   └─ Orchestrator (if needed, business logic)
   └─ DTOs (input/output)

3. Create files in this order:
   └─ DTO first (defines contract)
   └─ Command second (orchestration)
   └─ Handler third (presentation)
   └─ Tests fourth (validation)

4. Validate locally:
   └─ npm run lint:architecture
   └─ npm test
   └─ npm run type-check

5. Integrate:
   └─ Update Factory if Handler
   └─ Update command registration
   └─ Update tree provider if needed

6. Final verification:
   └─ Run all checks
   └─ Code review
   └─ Merge to main
```

---

## 🎯 Quick Reference by File Type

### New Handler?
→ Use `hf-handler` snippet
→ File: `src/presentation/webview/message-handlers/{name}-handler.ts`
→ Create Command + DTO + Tests

### New Command?
→ Use `hf-command` snippet
→ File: `src/application/commands/{name}.command.ts`
→ Create DTOs + Handler + Tests

### New DTO?
→ Use `hf-dto` snippet
→ File: `src/application/dto/{feature}.dto.ts`
→ Include Input interface + Output class

### New Tree Feature?
→ Use `hf-tree-loader` + `hf-tree-provider` snippets
→ Loader: `src/presentation/components/tree-providers/loaders/{entity}-loader.ts`
→ Provider: `src/presentation/components/tree-providers/{entity}-tree-provider.ts`

### Adding Tests?
→ Use `hf-test-handler` or `hf-test-command` snippet
→ File: `__tests__/{name}.spec.ts` (next to implementation)

---

## 🆘 If Something Goes Wrong

**Q: "I'm not sure where this file should go"**
→ Check: `docs/CUSTOM-INSTRUCTIONS.md` section "文件位置规范"

**Q: "I don't know what interfaces to create"**
→ Check: `.vscode/.copilot-instructions` section "编码规范"

**Q: "My code has getServiceContainer()"**
→ Replace with constructor parameter (interface type)
→ Pass it from HandlerFactory

**Q: "I used 'as any'"**
→ Create proper interface or type
→ See COPILOT-CORRECTION.md

**Q: "Circular dependency detected"**
→ Use HandlerFactory pattern to break cycle
→ See: `docs/CUSTOM-INSTRUCTIONS.md` → "反模式 #2"

**Q: "My tests are failing"**
→ Ensure all external dependencies are mocked
→ Check: `hf-test-handler` template structure

---

## 📊 File Organization Checklist

Before submitting code, verify:

```
Handler created?
  ☐ src/presentation/webview/message-handlers/
  ☐ Implements IMessageHandler
  ☐ Constructor DI only
  ☐ No getServiceContainer()

Command created?
  ☐ src/application/commands/
  ☐ Implements ICommand<Input, Output>
  ☐ Validates input
  ☐ Publishes events

DTO created?
  ☐ src/application/dto/
  ☐ Input interface + Output class
  ☐ readonly fields
  ☐ Factory methods

Tests created?
  ☐ __tests__/ folder
  ☐ Mock all dependencies
  ☐ Test success/error/validation paths

Integration done?
  ☐ Handler registered in Factory
  ☐ Command registered in container (if needed)
  ☐ Webview can send message

Validation passed?
  ☐ npm run lint:architecture ✅
  ☐ npm test ✅
  ☐ npm run type-check ✅
  ☐ No violations remain ✅
```

---

## 💡 Tips for Success

1. **Start small**: Refactor one handler at a time
2. **Follow templates**: Copy the snippets exactly, then customize
3. **Test as you go**: Don't skip tests, they catch errors
4. **Use logger**: Debug statements help you understand flow
5. **Document**: JSDoc is not optional
6. **Check early**: Run lint before committing
7. **Ask for review**: Use `@.vscode/.copilot-instructions review-code` in Chat

---

## 📚 Reference Files

| File | Purpose |
|------|---------|
| `.vscode/.copilot-instructions` | Architecture rules + templates overview |
| `docs/CUSTOM-INSTRUCTIONS.md` | Detailed patterns + real examples |
| `.vscode/http-forge.code-snippets` | Trigger templates with `hf-*` |
| `docs/COPILOT-CHAT-GUIDE.md` | How to use Chat effectively |
| `REFACTORING-PROMPTS.md` | Copy-paste prompt templates |
| `.refactor-validation.md` | Validation checklist |
| `REFACTORING-SKILL-CARD.md` | This file (quick reference) |

---

**Last Updated**: 2026-03-16
**Version**: 1.0
