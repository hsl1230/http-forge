# Full Migration: 12-Part Generation Strategy

This document contains **12 separate Copilot prompts** to generate all 85 refactored files in sequence.

Run each prompt in Copilot Chat one after another. After each generation, run validation.

---

## 🚀 Getting Started

### Pre-Generation Checklist
```bash
# 1. Run full migration setup
./scripts/full-migration.sh

# 2. You should see:
#    - New directories created
#    - Feature branch created
#    - Baseline captured
#    - .MIGRATION-GUIDE.md created

# 3. Verify directories exist
ls -la src/presentation
ls -la src/application
ls -la src/orchestration
```

### Quick Validation After Each Phase
```bash
# After each generation batch:
npm test                           # Should pass
npm run lint:architecture          # Should pass (if configured)
./scripts/post-refactor-check.sh   # Should pass
git status                         # See files created
```

---

## GENERATION #1: DTOs (12 files)

**Estimated Time**: 1-2 hours  
**Files Created**: 12 (all in `src/application/dto/`)

### Copy & Paste This Into Copilot Chat:

```markdown
# Phase 1: Create All DTOs for HTTP Forge DDD Architecture

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md

**Task**: Create 12 Data Transfer Object (DTO) files for HTTP Forge application layer.

**Location**: All files in `src/application/dto/`

## Requirements

Each DTO file must follow this pattern:

```typescript
// Example: request.dto.ts

/**
 * Request Execution DTOs
 */

export interface ExecuteRequestInput {
  request: any;
  environment?: any;
  authentication?: any;
  // ... other required fields
}

export class ExecuteRequestOutput {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
  readonly duration: number;
  
  constructor(data: any) {
    this.statusCode = data.statusCode;
    this.headers = data.headers || {};
    this.body = data.body || '';
    this.duration = data.duration || 0;
  }
  
  static from(data: any): ExecuteRequestOutput {
    return new ExecuteRequestOutput(data);
  }
}
```

## The 12 DTO Files to Create

### 1. `src/application/dto/request.dto.ts`
- `ExecuteRequestInput` - For sending requests
- `ExecuteRequestOutput` - Response with status, headers, body, duration

### 2. `src/application/dto/history.dto.ts`
- `UseHistoryEntryInput` - Select history entry
- `UseHistoryEntryOutput` - Loaded request data

### 3. `src/application/dto/cookie.dto.ts`
- `ManageCookieInput` - Add/update/delete cookie
- `ManageCookieOutput` - Confirmation + updated list

### 4. `src/application/dto/variable.dto.ts`
- `ManageVariableInput` - Add/update/delete variable
- `ManageVariableOutput` - Confirmation + variable info

### 5. `src/application/dto/environment.dto.ts`
- `SelectEnvironmentInput` - Environment name/ID
- `SelectEnvironmentOutput` - Resolved variables

### 6. `src/application/dto/environment-crud.dto.ts`
- `AddEnvironmentInput` - Name, description
- `AddEnvironmentOutput` - Created environment
- `DeleteEnvironmentInput` - Environment name
- `DeleteEnvironmentOutput` - Confirmation
- `DuplicateEnvironmentInput` - Source name, new name
- `DuplicateEnvironmentOutput` - New environment

### 7. `src/application/dto/collection.dto.ts`
- `SaveCollectionInput` - Collection data with items
- `SaveCollectionOutput` - Saved collection info
- `UpdateCollectionInput` - Collection updates
- `UpdateCollectionOutput` - Updated info

### 8. `src/application/dto/test-suite.dto.ts`
- `SaveSuiteInput` - Suite data with requests
- `SaveSuiteOutput` - Saved suite info
- `RunSuiteInput` - Suite ID/data, options
- `RunSuiteOutput` - Test results, statistics
- `BrowseDataInput` - Suite ID
- `BrowseDataOutput` - Test data
- `ExportSuiteInput` - Suite ID, format
- `ExportSuiteOutput` - Export result

### 9. `src/application/dto/folder.dto.ts`
- `SaveFolderInput` - Folder data (name, parent)
- `SaveFolderOutput` - Folder info

### 10. `src/application/dto/schema.dto.ts`
- `ManageSchemaInput` - Operation type (fetch, cache, clear), endpoint
- `ManageSchemaOutput` - Schema data or confirmation

### 11. `src/application/dto/oauth2.dto.ts`
- `ManageOAuth2Input` - OAuth2 config, credentials
- `ManageOAuth2Output` - Token, expiry, refresh status

### 12. `src/application/dto/graphql.dto.ts`
- `ManageGraphQLInput` - Operation (fetch schema, get completions), endpoint
- `ManageGraphQLOutput` - Schema or completions data

## Architecture Rules

✅ **MUST HAVE**:
- Input: Interface (not class)
- Output: Class with readonly fields
- Factory method: `static from(data: any): T`
- JSDoc on all classes and methods
- No business logic (data transfer only)
- All Output fields are `readonly`

❌ **MUST NOT HAVE**:
- Circular references between DTOs
- Business logic or calculations
- Direct dependencies on services
- Getters/setters (use readonly fields)
- Mutable objects

## Testing Requirements

Each DTO must have export in:
- `src/application/dto/index.ts` - Export all DTOs

Later (Phase 5), we'll create tests:
- `src/application/dto/__tests__/[name].dto.spec.ts` - 100% coverage

## Validation After Generation

After I generate these files:
```bash
npm test                 # Should pass (no failing tests yet)
npm run type-check       # Should have 0 errors
ls -la src/application/dto/*.ts | wc -l  # Should print 12
```

Ready to generate all 12 DTO files!
```

### After Generation, Run:

```bash
npm test
npm run type-check
git add src/application/dto/
git commit -m "refactor: create all DTOs"
```

---

## GENERATION #2: Request Commands (5 files)

**Estimated Time**: 1.5 hours  
**Files Created**: 5 (in `src/application/commands/request/`)

### Copy & Paste This Into Copilot Chat:

```markdown
# Phase 2a: Create Request Command Group (5 commands)

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md @src/application/dto/

**Task**: Create 5 command files for request operations.

**Location**: `src/application/commands/request/`

## Requirements

Each command must:

```typescript
// Example pattern
import { ICommand } from '../icommand.interface';

interface ExecuteRequestInput {
  // From request.dto.ts
}

class ExecuteRequestOutput {
  // From request.dto.ts
}

export class ExecuteRequestCommand implements ICommand<ExecuteRequestInput, ExecuteRequestOutput> {
  constructor(
    private orchestrator: IRequestOrchestrator,
    private eventBus: IEventBus,
    private logger: ILogger
  ) {}

  validateInput(input: ExecuteRequestInput): void {
    if (!input.request) throw new Error('request required');
    // ... more validations
  }

  async execute(input: ExecuteRequestInput): Promise<ExecuteRequestOutput> {
    this.validateInput(input);
    this.logger.debug('[ExecuteRequestCommand] Executing', input);
    
    try {
      const result = await this.orchestrator.executeRequest(input);
      this.eventBus.publish({ type: 'RequestExecuted', data: result });
      return ExecuteRequestOutput.from(result);
    } catch (error) {
      this.logger.error('[ExecuteRequestCommand] Failed', error);
      throw error;
    }
  }
}
```

## The 5 Commands to Create

### 1. `src/application/commands/request/execute-request.command.ts`
- Class: `ExecuteRequestCommand`
- Input: `ExecuteRequestInput` (from request.dto.ts)
- Output: `ExecuteRequestOutput`
- Delegates to: `IRequestOrchestrator.executeRequest()`
- Events: `RequestExecuted`

### 2. `src/application/commands/request/save-request.command.ts`
- Class: `SaveRequestCommand`
- Input: `SaveRequestInput` (from request.dto.ts - add if missing)
- Output: `SaveRequestOutput` (confirmation)
- Delegates to: `IRequestOrchestrator.saveRequest()`
- Events: `RequestSaved`

### 3. `src/application/commands/request/manage-cookies.command.ts`
- Class: `ManageCookiesCommand`
- Input: `ManageCookieInput` (from cookie.dto.ts)
- Output: `ManageCookieOutput`
- Delegates to: `IRequestOrchestrator.manageCookies()`
- Events: `CookieUpdated`

### 4. `src/application/commands/request/manage-history.command.ts`
- Class: `ManageHistoryCommand`
- Input: `UseHistoryEntryInput` (from history.dto.ts)
- Output: `UseHistoryEntryOutput`
- Delegates to: `IRequestOrchestrator.useHistoryEntry()`
- Events: `HistoryEntryUsed`

### 5. `src/application/commands/request/manage-variables.command.ts`
- Class: `ManageVariablesCommand`
- Input: `ManageVariableInput` (from variable.dto.ts)
- Output: `ManageVariableOutput`
- Delegates to: `IRequestOrchestrator.manageVariables()`
- Events: `VariableUpdated`

## Architecture Rules

✅ **MUST HAVE**:
- Implements `ICommand<Input, Output>`
- Constructor DI with INTERFACES only
- `validateInput()` method that throws on invalid
- `async execute()` returns Output DTO
- Event publishing via `eventBus.publish()`
- Try-catch for error handling
- logger.debug() calls

❌ **MUST NOT HAVE**:
- Business logic (delegate to orchestrator)
- getServiceContainer() calls
- Direct service instantiation
- as any type casts
- Circular dependencies

## Testing Requirements

Tests will be created in Phase 5:
- `src/application/commands/request/__tests__/[name].command.spec.ts`

Each test file must:
- Mock orchestrator and eventBus
- Test success path
- Test error path
- Test validation path
- 80%+ coverage

Ready to generate 5 request commands!
```

### After Generation, Run:

```bash
npm test
npm run type-check
git add src/application/commands/request/
git commit -m "refactor: create request commands"
```

---

## GENERATION #3: Environment Commands (3 files)

**Estimated Time**: 1 hour  
**Files Created**: 3 (in `src/application/commands/environment/`)

### Copy & Paste This Into Copilot Chat:

```markdown
# Phase 2b: Create Environment Command Group (3 commands)

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md @src/application/dto/

**Task**: Create 3 command files for environment operations.

**Location**: `src/application/commands/environment/`

## The 3 Commands to Create

### 1. `src/application/commands/environment/select-environment.command.ts`
- Class: `SelectEnvironmentCommand`
- Input: `SelectEnvironmentInput` (from environment.dto.ts)
- Output: `SelectEnvironmentOutput`
- Delegates to: `IEnvironmentOrchestrator.selectEnvironment()`
- Events: `EnvironmentSelected`

### 2. `src/application/commands/environment/manage-environments.command.ts`
- Class: `ManageEnvironmentsCommand`
- Input: `AddEnvironmentInput | DeleteEnvironmentInput | DuplicateEnvironmentInput` (from environment-crud.dto.ts)
- Output: `AddEnvironmentOutput | DeleteEnvironmentOutput | DuplicateEnvironmentOutput`
- Delegates to: `IEnvironmentOrchestrator.addEnvironment()`, `.deleteEnvironment()`, `.duplicateEnvironment()`
- Events: `EnvironmentCreated`, `EnvironmentDeleted`, `EnvironmentDuplicated`

### 3. `src/application/commands/environment/manage-config.command.ts`
- Class: `ManageConfigCommand`
- Input: `ManageConfigInput` (from environment-crud.dto.ts - add if missing)
- Output: `ManageConfigOutput`
- Delegates to: `IEnvironmentOrchestrator.manageConfig()` or directly to service
- Events: `ConfigUpdated`

## Requirements

Same as request commands:
- Implements ICommand<Input, Output>
- Constructor DI only
- validateInput() throws on invalid
- async execute() returns DTO
- Events published
- Try-catch error handling
- logger.debug() calls

Ready to generate 3 environment commands!
```

### After Generation, Run:

```bash
npm test
npm run type-check
git add src/application/commands/environment/
git commit -m "refactor: create environment commands"
```

---

## GENERATION #4: Collection Commands (2 files)

**Estimated Time**: 45 minutes  
**Files Created**: 2 (in `src/application/commands/collection/`)

### Copy & Paste This Into Copilot Chat:

```markdown
# Phase 2c: Create Collection Command Group (2 commands)

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md @src/application/dto/

**Task**: Create 2 command files for collection operations.

**Location**: `src/application/commands/collection/`

## The 2 Commands to Create

### 1. `src/application/commands/collection/save-collection.command.ts`
- Class: `SaveCollectionCommand`
- Input: `SaveCollectionInput` (from collection.dto.ts)
- Output: `SaveCollectionOutput`
- Delegates to: `ICollectionOrchestrator.saveCollection()`
- Events: `CollectionSaved`

### 2. `src/application/commands/collection/update-collection.command.ts`
- Class: `UpdateCollectionCommand`
- Input: `UpdateCollectionInput` (from collection.dto.ts)
- Output: `UpdateCollectionOutput`
- Delegates to: `ICollectionOrchestrator.updateCollection()`
- Events: `CollectionUpdated`

## Requirements

Same pattern as previous commands.

Ready to generate 2 collection commands!
```

### After Generation, Run:

```bash
npm test
npm run type-check
git add src/application/commands/collection/
git commit -m "refactor: create collection commands"
```

---

## GENERATION #5: Suite Commands (4 files)

**Estimated Time**: 1.5 hours  
**Files Created**: 4 (in `src/application/commands/suite/`)

### Copy & Paste This Into Copilot Chat:

```markdown
# Phase 2d: Create Test Suite Command Group (4 commands)

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md @src/application/dto/

**Task**: Create 4 command files for test suite operations.

**Location**: `src/application/commands/suite/`

## The 4 Commands to Create

### 1. `src/application/commands/suite/run-test-suite.command.ts`
- Class: `RunTestSuiteCommand`
- Input: `RunSuiteInput` (from test-suite.dto.ts)
- Output: `RunSuiteOutput`
- Delegates to: `ITestSuiteOrchestrator.runSuite()`
- Events: `SuiteRunCompleted` (with results)

### 2. `src/application/commands/suite/save-test-suite.command.ts`
- Class: `SaveTestSuiteCommand`
- Input: `SaveSuiteInput` (from test-suite.dto.ts)
- Output: `SaveSuiteOutput`
- Delegates to: `ITestSuiteOrchestrator.saveSuite()`
- Events: `SuiteSaved`

### 3. `src/application/commands/suite/browse-suite-data.command.ts`
- Class: `BrowseSuiteDataCommand`
- Input: `BrowseDataInput` (from test-suite.dto.ts)
- Output: `BrowseDataOutput`
- Delegates to: `ITestSuiteOrchestrator.browseSuiteData()`
- Events: `SuiteDataBrowsed`

### 4. `src/application/commands/suite/export-suite-results.command.ts`
- Class: `ExportSuiteResultsCommand`
- Input: `ExportSuiteInput` (from test-suite.dto.ts)
- Output: `ExportSuiteOutput`
- Delegates to: `ITestSuiteOrchestrator.exportResults()`
- Events: `SuiteResultsExported`

## Requirements

Same pattern as previous commands.

Ready to generate 4 suite commands!
```

### After Generation, Run:

```bash
npm test
npm run type-check
git add src/application/commands/suite/
git commit -m "refactor: create test suite commands"
```

---

## GENERATION #6: Single Commands (3 files)

**Estimated Time**: 1 hour  
**Files Created**: 3 (folder, schema, oauth2, graphql split)

### Copy & Paste This Into Copilot Chat:

```markdown
# Phase 2e: Create Single Commands (3 domains)

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md @src/application/dto/

**Task**: Create 3 single command files.

**Location**: `src/application/commands/[folder|schema|oauth2|graphql]/`

## The 3 Commands to Create

### 1. `src/application/commands/folder/save-folder.command.ts`
- Class: `SaveFolderCommand`
- Input: `SaveFolderInput` (from folder.dto.ts)
- Output: `SaveFolderOutput`
- Delegates to: `IFolderOrchestrator.saveFolder()`
- Events: `FolderSaved`

### 2. `src/application/commands/schema/manage-schema.command.ts`
- Class: `ManageSchemaCommand`
- Input: `ManageSchemaInput` (from schema.dto.ts)
- Output: `ManageSchemaOutput`
- Delegates to: `ISchemaOrchestrator.manageSchema()`
- Events: `SchemaManaged`
- Note: Handles fetch, cache, clear operations

### 3. `src/application/commands/oauth2/manage-oauth2.command.ts`
- Class: `ManageOAuth2Command`
- Input: `ManageOAuth2Input` (from oauth2.dto.ts)
- Output: `ManageOAuth2Output`
- Delegates to: `IOAuth2Orchestrator.manageOAuth2()`
- Events: `OAuth2TokenUpdated`

You may also add:

### 4. `src/application/commands/graphql/manage-graphql.command.ts` (bonus)
- Class: `ManageGraphQLCommand`
- Input: `ManageGraphQLInput` (from graphql.dto.ts)
- Output: `ManageGraphQLOutput`
- Delegates to: `IGraphQLOrchestrator.manageGraphQL()`
- Events: `GraphQLDataUpdated`

## Requirements

Same pattern as previous commands.

Ready to generate single commands!
```

### After Generation, Run:

```bash
npm test
npm run type-check
git add src/application/commands/
git commit -m "refactor: create single-domain commands"
```

---

## GENERATION #7: Request Tester Handlers (9 files)

**Estimated Time**: 2-3 hours  
**Files Created**: 9 (in `src/presentation/webview/message-handlers/`)

⚠️ **Skip to Phase #8 after brief validation** - Handlers are large, might need split if Copilot hits limits.

### Copy & Paste This Into Copilot Chat:

```markdown
# Phase 3a: Create Request Tester Message Handlers V2 (9 handlers)

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md @src/application/dto @src/application/commands

**Task**: Create 9 handler V2 files for request tester messages.

**Location**: `src/presentation/webview/message-handlers/`

## Requirements

Each handler must:

```typescript
// Example pattern
export class ExecuteRequestHandlerV2 implements IMessageHandler {
  constructor(
    private command: ExecuteRequestCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['sendRequest', 'sendHttpRequest'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[ExecuteRequestHandlerV2] Handling', command);
    
    try {
      const input: ExecuteRequestInput = {
        request: message.request,
        environment: message.environment
      };
      const output = await this.command.execute(input);
      messenger.postMessage({ type: 'success', command, data: output });
      return true;
    } catch (error) {
      this.logger.error('[ExecuteRequestHandlerV2] Error', error);
      messenger.postMessage({ 
        type: 'error', 
        command, 
        error: (error as Error).message 
      });
      return true;
    }
  }
}
```

## The 9 Handlers to Create

### 1. `src/presentation/webview/message-handlers/execute-request-handler-v2.ts`
- Class: `ExecuteRequestHandlerV2`
- Commands: `sendRequest`, `sendHttpRequest`
- Uses: `ExecuteRequestCommand`

### 2. `src/presentation/webview/message-handlers/cookie-handler-v2.ts`
- Class: `CookieHandlerV2`
- Commands: Cookie-related (add, delete, update, etc)
- Uses: `ManageCookiesCommand`

### 3. `src/presentation/webview/message-handlers/history-handler-v2.ts`
- Class: `HistoryHandlerV2`
- Commands: History-related (use entry, delete, etc)
- Uses: `ManageHistoryCommand`

### 4. `src/presentation/webview/message-handlers/environment-selection-handler-v2.ts`
- Class: `EnvironmentSelectionHandlerV2`
- Commands: Environment selection/switching
- Uses: `SelectEnvironmentCommand`

### 5. `src/presentation/webview/message-handlers/variable-handler-v2.ts`
- Class: `VariableHandlerV2`
- Commands: Variable operations
- Uses: `ManageVariablesCommand`

### 6. `src/presentation/webview/message-handlers/graphql-handler-v2.ts`
- Class: `GraphQLHandlerV2`
- Commands: GraphQL schema, completions, cache
- Uses: `ManageGraphQLCommand`

### 7. `src/presentation/webview/message-handlers/schema-handler-v2.ts`
- Class: `SchemaHandlerV2`
- Commands: Schema inference, management
- Uses: `ManageSchemaCommand`

### 8. `src/presentation/webview/message-handlers/oauth2-handler-v2.ts`
- Class: `OAuth2HandlerV2`
- Commands: OAuth2 flow, token management
- Uses: `ManageOAuth2Command`

### 9. `src/presentation/webview/message-handlers/save-request-handler-v2.ts`
- Class: `SaveRequestHandlerV2`
- Commands: Save request operations
- Uses: `SaveRequestCommand`

## Architecture Rules

✅ **MUST HAVE**:
- Implements IMessageHandler
- Constructor DI with INTERFACES only
- getSupportedCommands() returns string[]
- handle() method with try-catch
- Uses command.execute() NOT getServiceContainer()
- messenger.postMessage() for responses
- logger.debug() on entry, logger.error() on catch
- Proper error messages to webview

❌ **MUST NOT HAVE**:
- getServiceContainer() calls
- as any type casts
- Direct service instantiation
- Business logic (delegate to command)

## Testing

Tests created in Phase 5:
- `src/presentation/webview/message-handlers/__tests__/[name]-handler-v2.spec.ts`

Ready to generate 9 request tester handlers!
```

### After Generation, Run:

```bash
npm test
npm run type-check
git add src/presentation/webview/message-handlers/*request*
git add src/presentation/webview/message-handlers/*cookie*
git add src/presentation/webview/message-handlers/*history*
git add src/presentation/webview/message-handlers/*variable*
git add src/presentation/webview/message-handlers/*graphql*
git add src/presentation/webview/message-handlers/*schema*
git add src/presentation/webview/message-handlers/*oauth2*
git commit -m "refactor: create request tester handlers V2"
```

---

## GENERATION #8: Other Handlers (6 files)

**Estimated Time**: 1.5 hours  
**Files Created**: 6 (environment, collection, folder handlers)

### Copy & Paste This Into Copilot Chat:

```markdown
# Phase 3b: Create Other Message Handlers V2 (6 handlers)

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md @src/application/dto @src/application/commands

**Task**: Create 6 handler V2 files for environment, collection, test suite, and folder operations.

**Location**: `src/presentation/webview/message-handlers/`

## The 6 Handlers to Create

### Environment Editors (2)
1. `src/presentation/webview/message-handlers/environment-crud-handler-v2.ts`
   - Class: `EnvironmentCrudHandlerV2`
   - Commands: addEnvironment, deleteEnvironment, duplicateEnvironment
   - Uses: `ManageEnvironmentsCommand`

2. `src/presentation/webview/message-handlers/environment-config-handler-v2.ts`
   - Class: `EnvironmentConfigHandlerV2`
   - Commands: Config file operations
   - Uses: `ManageConfigCommand`

### Collection Editors (2)
3. `src/presentation/webview/message-handlers/save-collection-handler-v2.ts`
   - Class: `SaveCollectionHandlerV2`
   - Commands: Save collection
   - Uses: `SaveCollectionCommand`

4. `src/presentation/webview/message-handlers/update-collection-handler-v2.ts`
   - Class: `UpdateCollectionHandlerV2`
   - Commands: Update collection
   - Uses: `UpdateCollectionCommand`

### Test Suite (1)
5. `src/presentation/webview/message-handlers/test-suite-handler-v2.ts`
   - Class: `TestSuiteHandlerV2`
   - Commands: Run suite, save suite, export, browse data
   - Uses: Multiple suite commands (RunTestSuiteCommand, SaveTestSuiteCommand, etc)

### Folder Editor (1)
6. `src/presentation/webview/message-handlers/save-folder-handler-v2.ts`
   - Class: `SaveFolderHandlerV2`
   - Commands: Save folder
   - Uses: `SaveFolderCommand`

## Same Requirements as Phase 3a

Constructor DI, try-catch error handling, no getServiceContainer(), etc.

Ready to generate 6 other handlers!
```

### After Generation, Run:

```bash
npm test
npm run type-check
git add src/presentation/webview/message-handlers/
git commit -m "refactor: create remaining handlers V2"
```

---

## GENERATION #9: Model Loaders & Tree Providers (6 files)

**Estimated Time**: 2 hours  
**Files Created**: 6 (3 loaders + 3 providers)

### Copy & Paste This Into Copilot Chat:

```markdown
# Phase 4: Create Model Loaders & Tree Providers V2 (6 files)

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md

**Task**: Create 3 model loaders and 3 tree providers following DDD pattern.

**Locations**:
- Loaders: `src/presentation/components/tree-providers/loaders/`
- Providers: `src/presentation/components/tree-providers/`

## Model Loader Pattern

```typescript
// Loaders return plain objects (reusable outside VS Code)
export interface ICollectionsModelLoader {
  loadCollections(): Promise<CollectionModel[]>;
  loadChildren(parent?: CollectionModel): Promise<CollectionModel[]>;
}

export class CollectionsModelLoader implements ICollectionsModelLoader {
  constructor(private service: ICollectionService, private logger: ILogger) {}

  async loadCollections(): Promise<CollectionModel[]> {
    try {
      this.logger.debug('[CollectionsModelLoader] Loading collections');
      const collections = await this.service.getAllCollections();
      return collections.map(c => CollectionModel.from(c));
    } catch (error) {
      this.logger.error('[CollectionsModelLoader] Failed', error);
      throw error;
    }
  }

  async loadChildren(parent?: CollectionModel): Promise<CollectionModel[]> {
    // Load child items
  }
}
```

## Tree Provider Pattern

```typescript
// Providers convert models to TreeItems (VS Code specific)
export class CollectionsTreeProviderV2 implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeItem | undefined>();

  constructor(private loader: ICollectionsModelLoader, private logger: ILogger) {}

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    const models = await this.loader.loadChildren(element?.collectionModel);
    return models.map(m => this.modelToTreeItem(m));
  }

  private modelToTreeItem(model: CollectionModel): TreeItem {
    const item = new TreeItem(model.name);
    item.iconPath = icon for collection;
    item.command = { command: 'httpForge.selectCollection', arguments: [model] };
    return item;
  }
}
```

## The 6 Files to Create

### Loaders (3 files in `src/presentation/components/tree-providers/loaders/`)

1. `collections-model-loader.ts`
   - Class: `CollectionsModelLoader`
   - Interface: `ICollectionsModelLoader`
   - Methods: `loadCollections()`, `loadChildren(parent?)`
   - Returns: `CollectionModel[]` (plain objects)

2. `environments-model-loader.ts`
   - Class: `EnvironmentsModelLoader`
   - Interface: `IEnvironmentsModelLoader`
   - Methods: `loadEnvironments()`, `loadChildren(parent?)`

3. `test-suites-model-loader.ts`
   - Class: `TestSuitesModelLoader`
   - Interface: `ITestSuitesModelLoader`
   - Methods: `loadSuites()`, `loadChildren(parent?)`

### Providers (3 files in `src/presentation/components/tree-providers/`)

4. `collections-tree-provider-v2.ts`
   - Class: `CollectionsTreeProviderV2`
   - Implements: `vscode.TreeDataProvider<TreeItem>`
   - Uses: `ICollectionsModelLoader`
   - Method: `modelToTreeItem()` (UI conversion only)

5. `environments-tree-provider-v2.ts`
   - Class: `EnvironmentsTreeProviderV2`
   - Implements: `vscode.TreeDataProvider<TreeItem>`
   - Uses: `IEnvironmentsModelLoader`

6. `test-suites-tree-provider-v2.ts`
   - Class: `TestSuitesTreeProviderV2`
   - Implements: `vscode.TreeDataProvider<TreeItem>`
   - Uses: `ITestSuitesModelLoader`

## Requirements

✅ **Loaders MUST**:
- Return plain objects (reusable)
- Have interface contracts
- No VS Code types
- Full error handling
- logger.debug() calls

✅ **Providers MUST**:
- Implement vscode.TreeDataProvider
- Use loader for data (not direct service)
- modelToTreeItem() for UI only (no logic)
- onDidChangeTreeData for refresh

Ready to generate model loaders and tree providers!
```

### After Generation, Run:

```bash
npm test
npm run type-check
git add src/presentation/components/tree-providers/
git commit -m "refactor: create model loaders and tree providers V2"
```

---

## GENERATION #10: All Test Files (60+ files)

**Estimated Time**: 6-8 hours  
**Files Created**: 60+

⚠️ **This might need to be split into multiple generations by layer**

### Copy & Paste This Into Copilot Chat:

```markdown
# Phase 5: Create Comprehensive Test Suite (60+ test files)

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md

**Task**: Create complete test coverage for all new code layers.

**Locations**:
- DTO tests: `src/application/dto/__tests__/`
- Command tests: `src/application/commands/[group]/__tests__/`
- Handler tests: `src/presentation/webview/message-handlers/__tests__/`
- Loader tests: `src/presentation/components/tree-providers/loaders/__tests__/`
- Provider tests: `src/presentation/components/tree-providers/__tests__/`

## Test Structure

```typescript
// DTO Test Example
describe('ExecuteRequestOutput', () => {
  it('should create from data', () => {
    const data = { statusCode: 200, body: 'test' };
    const output = ExecuteRequestOutput.from(data);
    expect(output.statusCode).toBe(200);
    expect(output.body).toBe('test');
  });

  it('should have readonly fields', () => {
    const output = new ExecuteRequestOutput({ statusCode: 200 });
    expect(() => { output.statusCode = 400; }).toThrow();
  });
});

// Command Test Example
describe('ExecuteRequestCommand', () => {
  let command: ExecuteRequestCommand;
  let mockOrchestrator: jest.Mocked<IRequestOrchestrator>;
  let mockEventBus: jest.Mocked<IEventBus>;

  beforeEach(() => {
    mockOrchestrator = { executeRequest: jest.fn() } as any;
    mockEventBus = { publish: jest.fn() } as any;
    command = new ExecuteRequestCommand(mockOrchestrator, mockEventBus, logger);
  });

  it('should execute request', async () => {
    mockOrchestrator.executeRequest.mockResolvedValue({ statusCode: 200 });
    const input = { request: {} };
    const output = await command.execute(input);
    expect(output).toBeTruthy();
  });

  it('should throw on invalid input', async () => {
    const input = { request: null } as any;
    expect(() => command.validateInput(input)).toThrow();
  });

  it('should publish event', async () => {
    mockOrchestrator.executeRequest.mockResolvedValue({ statusCode: 200 });
    await command.execute({ request: {} });
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});

// Handler Test Example
describe('ExecuteRequestHandlerV2', () => {
  let handler: ExecuteRequestHandlerV2;
  let mockCommand: jest.Mocked<ExecuteRequestCommand>;

  beforeEach(() => {
    mockCommand = { execute: jest.fn() } as any;
    handler = new ExecuteRequestHandlerV2(mockCommand, logger);
  });

  it('should handle success', async () => {
    mockCommand.execute.mockResolvedValue({ statusCode: 200 });
    const result = await handler.handle('sendRequest', {}, messenger);
    expect(result).toBe(true);
    expect(messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' })
    );
  });

  it('should handle error', async () => {
    mockCommand.execute.mockRejectedValue(new Error('Test error'));
    await handler.handle('sendRequest', {}, messenger);
    expect(messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' })
    );
  });
});
```

## Requirements

✅ **DTO Tests**:
- 100% coverage (all fields, all factory methods)
- Test immutability (readonly fields)
- Test factory methods

✅ **Command Tests**:
- Mock all dependencies
- Test success path
- Test error path
- Test validation
- Verify event publishing
- 80%+ coverage

✅ **Handler Tests**:
- Mock all dependencies
- Test success path
- Test error path
- Verify postMessage calls
- 80%+ coverage

✅ **Loader Tests**:
- Mock services
- Test successful load
- Test error handling
- Test hierarchy loading
- 80%+ coverage

✅ **Provider Tests**:
- Mock loader
- Test getChildren()
- Test modelToTreeItem()
- Test TreeItem conversion
- 80%+ coverage

## Test File Locations

```
src/application/dto/__tests__/
  - request.dto.spec.ts
  - history.dto.spec.ts
  - cookie.dto.spec.ts
  - variable.dto.spec.ts
  - environment.dto.spec.ts
  - environment-crud.dto.spec.ts
  - collection.dto.spec.ts
  - test-suite.dto.spec.ts
  - folder.dto.spec.ts
  - schema.dto.spec.ts
  - oauth2.dto.spec.ts
  - graphql.dto.spec.ts

src/application/commands/request/__tests__/
  - execute-request.command.spec.ts
  - save-request.command.spec.ts
  - manage-cookies.command.spec.ts
  - manage-history.command.spec.ts
  - manage-variables.command.spec.ts

src/application/commands/environment/__tests__/
  - select-environment.command.spec.ts
  - manage-environments.command.spec.ts
  - manage-config.command.spec.ts

src/application/commands/collection/__tests__/
  - save-collection.command.spec.ts
  - update-collection.command.spec.ts

src/application/commands/suite/__tests__/
  - run-test-suite.command.spec.ts
  - save-test-suite.command.spec.ts
  - browse-suite-data.command.spec.ts
  - export-suite-results.command.spec.ts

src/application/commands/[folder|schema|oauth2|graphql]/__tests__/
  - [command].spec.ts (one test file per command)

src/presentation/webview/message-handlers/__tests__/
  - execute-request-handler-v2.spec.ts
  - cookie-handler-v2.spec.ts
  - history-handler-v2.spec.ts
  - environment-selection-handler-v2.spec.ts
  - variable-handler-v2.spec.ts
  - graphql-handler-v2.spec.ts
  - schema-handler-v2.spec.ts
  - oauth2-handler-v2.spec.ts
  - save-request-handler-v2.spec.ts
  - environment-crud-handler-v2.spec.ts
  - environment-config-handler-v2.spec.ts
  - save-collection-handler-v2.spec.ts
  - update-collection-handler-v2.spec.ts
  - test-suite-handler-v2.spec.ts
  - save-folder-handler-v2.spec.ts

src/presentation/components/tree-providers/loaders/__tests__/
  - collections-model-loader.spec.ts
  - environments-model-loader.spec.ts
  - test-suites-model-loader.spec.ts

src/presentation/components/tree-providers/__tests__/
  - collections-tree-provider-v2.spec.ts
  - environments-tree-provider-v2.spec.ts
  - test-suites-tree-provider-v2.spec.ts
```

Ready to generate all tests (generate by layer for size)!
```

### Generate in 3 Sub-Batches:

**Sub-Batch 1**: DTO & Command Tests
**Sub-Batch 2**: Handler Tests
**Sub-Batch 3**: Loader & Provider Tests

### After Each Sub-Batch, Run:

```bash
npm test
npm test -- --coverage
git add src/
git commit -m "refactor: add tests for [layer]"
```

---

## GENERATION #11: Infrastructure Updates (3-4 files)

**Estimated Time**: 1.5 hours  
**Files Created**: 3-4

### Copy & Paste This Into Copilot Chat:

```markdown
# Phase 6a: Create Event Bus & Update Service Bootstrap

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md

**Task**: Create event bus infrastructure and update DI container.

**Locations**:
- `src/infrastructure/event-bus/event-bus.ts`
- `src/infrastructure/event-bus/domain-event.ts`
- `src/services/service-bootstrap.ts` (UPDATE)
- `src/services/service-container.ts` (UPDATE)

## Files to Create/Update

### 1. `src/infrastructure/event-bus/domain-event.ts`
```typescript
export interface IDomainEvent {
  type: string;
  data: any;
  timestamp: number;
}

export class DomainEvent implements IDomainEvent {
  type: string;
  data: any;
  timestamp: number = Date.now();

  constructor(type: string, data?: any) {
    this.type = type;
    this.data = data;
  }
}
```

### 2. `src/infrastructure/event-bus/event-bus.ts`
```typescript
export interface IEventBus {
  publish(event: IDomainEvent): void;
  subscribe(eventType: string, handler: (event: IDomainEvent) => void): void;
}

export class EventBus implements IEventBus {
  private handlers: Map<string, Function[]> = new Map();

  publish(event: IDomainEvent): void {
    const handlers = this.handlers.get(event.type) || [];
    handlers.forEach(h => h(event));
  }

  subscribe(eventType: string, handler: (event: IDomainEvent) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
}
```

### 3. Update `src/services/service-container.ts`
Add all new command identifiers and register them.

### 4. Update `src/services/service-bootstrap.ts`
Register all new commands, handlers, loaders with DI container.

Example registration:
```typescript
export function registerApplicationCommands(container: ServiceContainer): void {
  // Request Commands
  container.register(ServiceIdentifiers.ExecuteRequestCommand, ExecuteRequestCommand);
  container.register(ServiceIdentifiers.ManageCookiesCommand, ManageCookiesCommand);
  // ... more commands

  // Handlers
  container.register(ServiceIdentifiers.ExecuteRequestHandlerV2, ExecuteRequestHandlerV2);
  // ... more handlers

  // Loaders
  container.register(ServiceIdentifiers.CollectionsModelLoader, CollectionsModelLoader);
  // ... more loaders

  // Event Bus
  container.register(ServiceIdentifiers.EventBus, new EventBus());
}
```

Ready to create event bus and update bootstrap!
```

### After Generation, Run:

```bash
npm test
npm run type-check
git add src/infrastructure/
git add src/services/
git commit -m "refactor: create event bus and update DI container"
```

---

## GENERATION #12: HandlerFactory & Panel Integration (Final)

**Estimated Time**: 2 hours  
**Files Created**: 2-3

### Copy & Paste This Into Copilot Chat:

```markdown
# Phase 6b: Create Handler Factories & Update Panel Registration

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md

**Task**: Create factories for handlers and update panel registrations.

**Locations**:
- `src/presentation/webview/message-handlers/handler-factory-v2.ts` (NEW)
- `src/extension.ts` (UPDATE)
- Panel registration files (UPDATE)

## Files to Create

### 1. `src/presentation/webview/message-handlers/handler-factory-v2.ts`

```typescript
export class HandlerFactoryV2 {
  static createHandlers(container: ServiceContainer): IMessageHandler[] {
    return [
      // Request Tester Handlers
      new ExecuteRequestHandlerV2(
        container.resolve(ServiceIdentifiers.ExecuteRequestCommand),
        container.resolve(ServiceIdentifiers.Logger)
      ),
      new CookieHandlerV2(...),
      new HistoryHandlerV2(...),
      // ... other handlers

      // Environment Handlers
      new EnvironmentCrudHandlerV2(...),
      new EnvironmentConfigHandlerV2(...),

      // Collection Handlers
      new SaveCollectionHandlerV2(...),
      new UpdateCollectionHandlerV2(...),

      // Suite Handlers
      new TestSuiteHandlerV2(...),

      // Folder Handlers
      new SaveFolderHandlerV2(...)
    ];
  }
}
```

### 2. Update Panel Registrations

Update each panel to:
- Use HandlerFactoryV2 instead of old factory
- Register V2 handlers
- Register V2 tree providers
- Update all dependencies

Example:
```typescript
// In request-tester-panel.ts
const handlers = HandlerFactoryV2.createHandlers(container);
const treeProvider = new CollectionsTreeProviderV2(
  container.resolve(ServiceIdentifiers.CollectionsModelLoader),
  logger
);
```

### 3. Update `src/extension.ts`

Ensure:
- Event bus is initialized in bootstrap
- All new commands are registered
- All panels use V2 handlers
- Tree providers use V2 implementations

Ready to create factories and update registrations!
```

### After Generation, Run:

```bash
npm test
npm run type-check
npm run build
./scripts/post-refactor-check.sh
git add src/
git commit -m "refactor: create factories and complete system integration"
```

---

## 🎯 Final Validation & Completion

After all 12 generations:

```bash
# Final comprehensive validation
echo "🔍 Final Validation Started"

# 1. Type check
npm run type-check
if [ $? -ne 0 ]; then echo "❌ Type check failed"; exit 1; fi

# 2. Linting
npm run lint:architecture
if [ $? -ne 0 ]; then echo "❌ Linting failed"; exit 1; fi

# 3. Tests with coverage
npm test -- --coverage
if [ $? -ne 0 ]; then echo "❌ Tests failed"; exit 1; fi

# 4. Build
npm run build
if [ $? -ne 0 ]; then echo "❌ Build failed"; exit 1; fi

# 5. Post-refactor check
./scripts/post-refactor-check.sh
if [ $? -ne 0 ]; then echo "❌ Post-check failed"; exit 1; fi

# All green!
echo "✅ ALL VALIDATIONS PASSED!"
git log --oneline | head -15
git push origin refactor/full-ddd-migration-$(date +%s)

echo ""
echo "Next: Create PR and submit for review"
```

---

## 📈 Summary

| # | Phase | Duration | Files | Status |
|---|-------|----------|-------|--------|
| 1 | DTOs | 1-2h | 12 | ⏳ Pending |
| 2 | Commands (Request) | 1.5h | 5 | ⏳ Pending |
| 3 | Commands (Environment) | 1h | 3 | ⏳ Pending |
| 4 | Commands (Collection) | 45m | 2 | ⏳ Pending |
| 5 | Commands (Suite) | 1.5h | 4 | ⏳ Pending |
| 6 | Commands (Single) | 1h | 3 | ⏳ Pending |
| 7 | Handlers (Request) | 2-3h | 9 | ⏳ Pending |
| 8 | Handlers (Other) | 1.5h | 6 | ⏳ Pending |
| 9 | Loaders & Providers | 2h | 6 | ⏳ Pending |
| 10 | Tests | 6-8h | 60+ | ⏳ Pending |
| 11 | Infrastructure | 1.5h | 3 | ⏳ Pending |
| 12 | Factories & Integration | 2h | 2-3 | ⏳ Pending |
| | **TOTAL** | **~23-28 hours** | **~115 files** | **⏳ Ready to Start** |

---

**Version**: 1.0  
**Created**: 2026-03-16  
**Approach**: 12-part generation strategy for complete DDD refactoring
