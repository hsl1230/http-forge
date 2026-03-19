# Refactoring Prompt Templates

Copy and paste these templates directly into Copilot Chat when requesting refactoring work.
Remember to fill in the `[PLACEHOLDERS]` with your specific details.

---

## Template #1: Refactor Single Handler

```markdown
# Refactor [HANDLER_NAME] to DDD Architecture

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md

**Current File**: src/webview-panels/request-tester/handlers/[HANDLER_FILE].ts

**Task**: Refactor this handler from mixed design to DDD architecture following
the architecture rules defined in `.vscode/.copilot-instructions`.

**Current Issues**:
- Uses getServiceContainer() (Service Locator anti-pattern)
- [ANY OTHER ISSUES: mixed concerns, no tests, as any casts, etc]

**Target Architecture**:
```
Webview Message 
  → Handler (Presentation): Route & validate
  → Command (Application): Orchestrate use case
  → Orchestrator/Service (Orchestration): Business logic
```

**Requirements**:

1. **New Handler** (`src/presentation/webview/message-handlers/[HANDLER_FILE]-v2.ts`):
   - Copy `hf-handler` template from `.vscode/http-forge.code-snippets`
   - No getServiceContainer() calls
   - All dependencies via constructor (INTERFACES only)
   - getSupportedCommands() returns string[]
   - handle() method with try-catch
   - Uses messenger.postMessage() for responses
   - logger.debug() on entry/exit
   - No "as any" type casts

2. **New Command** (`src/application/commands/[COMMAND_NAME].command.ts`):
   - Copy `hf-command` template
   - Implements ICommand<Input, Output>
   - validateInput() method
   - Delegates to orchestrator
   - Publishes events via eventBus
   - Returns Output DTO

3. **New DTOs** (`src/application/dto/[FEATURE].dto.ts`):
   - Copy `hf-dto` template
   - Input interface (fields use ? for optional)
   - Output class (fields use readonly)
   - Factory method (from() or fromCore())

4. **New Tests** (`src/presentation/webview/message-handlers/__tests__/[HANDLER_FILE]-v2.spec.ts`):
   - Copy `hf-test-handler` template
   - Mock all external dependencies
   - Test success path
   - Test error path
   - Test validation
   - 80%+ coverage

**Validation Checklist**:
- [ ] No getServiceContainer() anywhere
- [ ] No "as any" type casts
- [ ] All dependencies are interfaces
- [ ] Files in correct directories
- [ ] Full test coverage
- [ ] npm run lint:architecture passes
- [ ] npm test passes

**Deliverables**:
- [ ] [HANDLER_FILE]-v2.ts (new Handler)
- [ ] [COMMAND_NAME].command.ts (new Command)
- [ ] [FEATURE].dto.ts (new DTOs)
- [ ] [HANDLER_FILE]-v2.spec.ts (tests)

Ready to generate!
```

---

## Template #2: Extract Tree Loader

```markdown
# Extract Model Loader from [TREE_PROVIDER_NAME]TreeProvider

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md section "3️⃣ Presentation Layer (展示层)"

**Current File**: src/providers/[TREE_PROVIDER].ts

**Goal**: Separate model loading from UI logic following DDD principles.

**Current Problem**:
- Model loading mixed with TreeItem UI logic in single file
- Can't reuse loader outside VS Code
- Hard to test model logic independently

**Target Architecture**:
```
ModelLoader (Business Logic)  →  Load models from services
    ↓
TreeProvider (Presentation)  →  Convert models to TreeItems
```

**Create Two Files**:

**1. Model Loader** (`src/presentation/components/tree-providers/loaders/[entity]-model-loader.ts`):
- Copy `hf-tree-loader` template from snippets
- Interface: `I[Entity]ModelLoader`
- Methods:
  - load[Entities](): Promise<Model[]>
  - loadChildren(parent?: Model): Promise<Model[]>
- Return plain objects (no VS Code types)
- Include logger.debug() calls
- Full JSDoc

**2. Tree Provider** (`src/presentation/components/tree-providers/[entity]-tree-provider-v2.ts`):
- Copy `hf-tree-provider` template from snippets
- Implements vscode.TreeDataProvider<TreeItem>
- Uses loader for data
- getChildren() calls loader.loadChildren()
- modelToTreeItem() handles UI conversion ONLY
- Zero business logic
- Full test coverage

**Key Constraints**:
- Loader must work outside VS Code context (reusable)
- Provider must only handle UI logic
- No circular dependencies
- No getServiceContainer()
- No "as any" casts

**Tests Required**:
- Loader tests: model loading, hierarchies, edge cases
- Provider tests: UI conversion, icons, commands
- 80%+ coverage minimum

**Deliverables**:
- [ ] [entity]-model-loader.ts (in loaders/)
- [ ] [entity]-tree-provider-v2.ts (in tree-providers/)
- [ ] Tests for both

Ready to generate!
```

---

## Template #3: Create New Feature (End-to-End)

```markdown
# Create [FEATURE_NAME] Feature following DDD Architecture

@docs/CUSTOM-INSTRUCTIONS.md @.vscode/.copilot-instructions

**Feature Requirement**: [DESCRIBE WHAT THE FEATURE DOES]

**Message Flow**:
```
Webview sends: '[MESSAGE_TYPE]' with { [DATA_FIELDS] }
  ↓
Handler receives & validates
  ↓
Command orchestrates
  ↓
Orchestrator executes business logic
  ↓
Response: { [RESPONSE_FIELDS] } sent to Webview
```

**New Files to Create**:

1. **DTO** (`src/application/dto/[feature].dto.ts`)
   - Input interface with fields
   - Output class with factory method
   - Use `hf-dto` template

2. **Command** (`src/application/commands/[feature].command.ts`)
   - Implement ICommand<Input, Output>
   - Validate input
   - Delegate to orchestrator
   - Publish events
   - Use `hf-command` template

3. **Handler** (`src/presentation/webview/message-handlers/[feature]-handler.ts`)
   - Implement IMessageHandler
   - Route messages to command
   - Handle responses
   - Use `hf-handler` template

4. **Tests** (multiple files with `__tests__/` naming)
   - Handler tests with `hf-test-handler` template
   - Command tests with `hf-test-command` template
   - 80%+ coverage

**Architectural Requirements**:
- No getServiceContainer()
- All dependencies via constructor
- All dependencies are INTERFACES
- Proper error handling (try-catch)
- FSDoc on all classes/methods
- Full test coverage
- Events published via eventBus
- Immutable DTOs (readonly)

**Quality Gates**:
- npm run lint:architecture ✅
- npm run type-check ✅
- npm test ✅
- Code review approved ✅

Ready to generate!
```

---

## Template #4: Refactor Existing Service

```markdown
# Refactor [SERVICE_NAME] to DDD Architecture

@docs/CUSTOM-INSTRUCTIONS.md @.vscode/.copilot-instructions

**Current File**: src/services/[SERVICE_FILE].ts

**Current State**: Mixed concerns (presentation + business logic)

**Target State**: Clean separation following DDD

**Analysis**:
- This file currently handles: [WHAT IT DOES]
- Should be split into:
  - Handler (message routing)
  - Command (use case)
  - Orchestrator (business logic)
  - Infrastructure (technical details)

**Refactoring Steps**:

1. Identify operations (public methods)
   Current methods: [LIST THEM]
   
2. Group by responsibility:
   - [OPERATION A] → Presentation concern → Handler
   - [OPERATION B] → Use case → Command
   - [OPERATION C] → Business rule → Orchestrator
   - [OPERATION D] → Technical → Infrastructure

3. Create new files following architecture

4. Write tests for each new piece

**Constraints**:
- No breaking changes to public API (or plan migration)
- All new code follows DDD rules
- Comprehensive test coverage
- All dependencies injected

**Deliverables**:
- [ ] New structure diagram
- [ ] All new files created
- [ ] All tests passing
- [ ] Ready to integrate

Ready to analyze and refactor!
```

---

## Template #5: Add Tests to Existing Feature

```markdown
# Add/Improve Tests for [FEATURE_NAME]

@.vscode/http-forge.code-snippets

**File(s) to Test**: [LIST FILES]

**Current Coverage**: [CURRENT %]
**Target Coverage**: 85%+

**Test Scope**:
- [ ] Unit tests for each class
- [ ] Mock all external dependencies
- [ ] Success path tests
- [ ] Error path tests
- [ ] Validation tests
- [ ] Integration points

**Use Templates**:
- Handler tests: `hf-test-handler` snippet
- Command tests: `hf-test-command` snippet
- Other tests: Jest best practices

**Test Structure**:
```
src/[TYPE]/__tests__/[name].spec.ts

beforeEach() {
  // Setup mocks
}

describe('Feature', () => {
  it('should [expected behavior]', () => { ... })
  it('should handle [error case]', () => { ... })
  it('should validate [input]', () => { ... })
})
```

**Quality Requirements**:
- 85%+ line coverage
- 100% branch coverage for critical paths
- Clear test descriptions
- Proper mocking (no real service calls)
- Jest framework

Ready to generate tests!
```

---

## Template #6: Code Review via Copilot Chat

```markdown
# Architecture Review

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md

Please review this code against HTTP Forge DDD architecture:

[PASTE YOUR CODE HERE]

**Check List**:
□ Correct layer (Presentation/Application/Orchestration/Infrastructure)
□ Follows SOLID principles
□ No service locator (getServiceContext)
□ No type casts (as any)
□ Proper interfaces used
□ Error handling in place
□ JSDoc complete
□ Tests included

**Provide Feedback On**:
1. Architecture compliance
2. Any violations found
3. Specific fixes needed
4. Severity (critical/warning/info)

Tag issues with:
🔴 Critical - Must fix before merge
🟡 Warning - Should fix
🔵 Info - Nice to have
```

---

## Template #7: Gradual Integration (V2 Pattern)

```markdown
# Deploy [FEATURE] Handler V2 Alongside V1

@docs/CUSTOM-INSTRUCTIONS.md

**Goal**: Deploy new DDD-compliant handler with fallback to old handler

**Steps**:

1. **Create V2 Implementation**:
   - File: [name]-handler-v2.ts
   - Use `hf-handler` template
   - Full DDD compliance

2. **Keep V1 for Fallback**:
   - Keep existing handler
   - Add deprecation warning
   - Plan removal in 2 weeks

3. **Update Factory**:
   ```typescript
   // HandlerFactory.ts
   [
     new [Name]HandlerV2(...),  // Try new first
     new [Name]Handler(...)      // Fallback to old
   ]
   ```

4. **Gradual Rollout**:
   - Week 1: Deploy with V2 primary, V1 fallback
   - Monitor for issues
   - Week 2: Remove V1 if successful

5. **Tests**:
   - V2 tests required
   - Integration tests with both
   - E2E tests in extension

Ready to generate!
```

---

## Using These Templates

1. **Copy the template** that matches your task
2. **Fill in the [PLACEHOLDERS]** with your specific information
3. **Paste into Copilot Chat**
4. **Wait for code generation**
5. **Run validation**: `./scripts/post-refactor-check.sh`

---

## Pro Tips

- Always include architecture files in `@[file]` references
- Be specific about file names and paths
- Include current problems to explain why refactoring is needed
- List constraints (no breaking changes, performance, etc)
- Specify test coverage requirements
- Use checklists to track deliverables

---

**Version**: 1.0  
**Last Updated**: 2026-03-16
