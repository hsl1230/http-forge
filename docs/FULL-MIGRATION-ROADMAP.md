# Full-Scale Refactoring Roadmap

Complete plan for refactoring the entire HTTP Forge codebase to DDD architecture in one comprehensive migration.

---

## 📊 Refactoring Scope

### Handlers to Migrate (28 Total)

**Request Tester Panel (9 handlers)**:
1. ✅ RequestExecutionHandler → RequestExecutionCommand + ExecuteRequestDTO
2. ✅ CookieHandler → CookieCommand + CookieDTO
3. ✅ HistoryHandler → HistoryCommand + HistoryDTO
4. ✅ EnvironmentHandler → EnvironmentSelectionCommand + EnvironmentSelectionDTO
5. ✅ VariableHandler → VariableCommand + VariableDTO
6. ✅ GraphQLHandler → GraphQLCommand + GraphQLDTO
7. ✅ SchemaHandler → SchemaCommand + SchemaDTO
8. ✅ OAuth2Handler → OAuth2Command + OAuth2DTO
9. ✅ SaveRequestHandler → SaveRequestCommand + SaveRequestDTO

**Environment Editor Panel (3 handlers)**:
10. ✅ EnvironmentCrudHandler → EnvironmentCrudCommand + EnvironmentCrudDTO
11. ✅ ConfigHandler → ConfigCommand + ConfigDTO
12. ✅ FileHandler → FileCommand + FileDTO

**Test Suite Panel (4 handlers)**:
13. ✅ SaveHandler → SaveSuiteCommand + SaveSuiteDTO
14. ✅ SuiteRunHandler → RunSuiteCommand + RunSuiteDTO
15. ✅ BrowseDataHandler → BrowseDataCommand + BrowseDataDTO
16. ✅ ExportHandler → ExportSuiteCommand + ExportSuiteDTO

**Collection Editor Panel (2 handlers)**:
17. ✅ SaveHandler → SaveCollectionCommand + SaveCollectionDTO
18. ✅ UpdateHandler → UpdateCollectionCommand + UpdateCollectionDTO

**Folder Editor Panel (1 handler)**:
19. ✅ SaveHandler → SaveFolderCommand + SaveFolderDTO

**Tree Providers (Need Model Loaders)**:
20. ✅ Collections Tree Provider → Collections Model Loader + New Provider
21. ✅ Environments Tree Provider → Environments Model Loader + New Provider
22. ✅ Test Suites Tree Provider → TestSuites Model Loader + New Provider

**Total New Files**: ~85 files
- 19 Commands
- 19 DTOs (or shared across related features)
- 19 Handlers (V2 versions, keeping originals for backwards compatibility during transition)
- 3 Model Loaders
- ~42 Test files

---

## 🏗️ New Directory Structure

```
src/
├── presentation/                      # ✨ NEW LAYER
│   ├── webview/
│   │   ├── message-handlers/          # ✨ NEW (moved & refactored)
│   │   │   ├── request-execution-handler-v2.ts
│   │   │   ├── cookie-handler-v2.ts
│   │   │   ├── history-handler-v2.ts
│   │   │   ├── environment-selection-handler-v2.ts
│   │   │   ├── variable-handler-v2.ts
│   │   │   ├── graphql-handler-v2.ts
│   │   │   ├── schema-handler-v2.ts
│   │   │   ├── oauth2-handler-v2.ts
│   │   │   ├── save-request-handler-v2.ts
│   │   │   ├── __tests__/
│   │   │   │   ├── request-execution-handler-v2.spec.ts
│   │   │   │   ├── cookie-handler-v2.spec.ts
│   │   │   │   └── ... (all handler tests)
│   │   │   └── handler-factory-v2.ts  # ✨ Factory for DI
│   │   └── shared-interfaces.ts
│   └── components/
│       ├── tree-providers/            # ✨ REFACTORED
│       │   ├── loaders/
│       │   │   ├── collections-model-loader.ts
│       │   │   ├── environments-model-loader.ts
│       │   │   ├── test-suites-model-loader.ts
│       │   │   └── __tests__/
│       │   │       ├── collections-model-loader.spec.ts
│       │   │       └── ...
│       │   ├── collections-tree-provider-v2.ts
│       │   ├── environments-tree-provider-v2.ts
│       │   ├── test-suites-tree-provider-v2.ts
│       │   └── __tests__/
│       │       ├── collections-tree-provider-v2.spec.ts
│       │       └── ...
│       └── panels/                     # ✨ NEW (panel containers)
│           ├── request-tester-panel-v2.ts
│           ├── environment-editor-panel-v2.ts
│           ├── collection-editor-panel-v2.ts
│           ├── test-suite-panel-v2.ts
│           └── folder-editor-panel-v2.ts
│
├── application/                        # ✨ NEW LAYER
│   ├── commands/                       # ✨ (request, environment, collection, etc)
│   │   ├── request/
│   │   │   ├── execute-request.command.ts
│   │   │   ├── save-request.command.ts
│   │   │   ├── manage-cookies.command.ts
│   │   │   ├── manage-history.command.ts
│   │   │   ├── manage-variables.command.ts
│   │   │   ├── __tests__/
│   │   │   │   ├── execute-request.command.spec.ts
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   ├── environment/
│   │   │   ├── manage-environments.command.ts
│   │   │   ├── manage-config.command.ts
│   │   │   ├── __tests__/
│   │   │   └── index.ts
│   │   ├── collection/
│   │   │   ├── save-collection.command.ts
│   │   │   ├── update-collection.command.ts
│   │   │   ├── __tests__/
│   │   │   └── index.ts
│   │   ├── suite/
│   │   │   ├── run-test-suite.command.ts
│   │   │   ├── save-suite.command.ts
│   │   │   ├── browse-suite-data.command.ts
│   │   │   ├── export-suite-results.command.ts
│   │   │   ├── __tests__/
│   │   │   └── index.ts
│   │   ├── folder/
│   │   │   ├── save-folder.command.ts
│   │   │   ├── __tests__/
│   │   │   └── index.ts
│   │   ├── schema/
│   │   │   ├── manage-schema.command.ts
│   │   │   ├── __tests__/
│   │   │   └── index.ts
│   │   └── index.ts (export all)
│   │
│   ├── dto/                            # ✨ (organized by domain)
│   │   ├── request.dto.ts              # ExecuteRequestInput, ExecuteRequestOutput
│   │   ├── history.dto.ts              # UseHistoryInput, UseHistoryOutput
│   │   ├── cookie.dto.ts               # ManageCookieInput, ManageCookieOutput
│   │   ├── variable.dto.ts             # ManageVariableInput, ManageVariableOutput
│   │   ├── environment.dto.ts          # EnvironmentInput, EnvironmentOutput
│   │   ├── environment-crud.dto.ts     # AddEnvironmentInput, etc
│   │   ├── collection.dto.ts           # SaveCollectionInput, UpdateCollectionOutput
│   │   ├── test-suite.dto.ts           # SaveSuiteInput, RunSuiteOutput
│   │   ├── folder.dto.ts               # SaveFolderInput, SaveFolderOutput
│   │   ├── schema.dto.ts               # ManageSchemaInput, ManageSchemaOutput
│   │   ├── oauth2.dto.ts               # OAuth2Input, OAuth2Output
│   │   ├── graphql.dto.ts              # GraphQLInput, GraphQLOutput
│   │   └── index.ts
│   │
│   └── interfaces/                     # ✨ Application layer contracts
│       ├── icommand.ts
│       ├── ievent-bus.ts
│       └── index.ts
│
├── orchestration/                      # ✨ NEW LAYER (business logic)
│   ├── services/                       # Move complex orchestration here
│   │   ├── request-orchestrator.ts
│   │   ├── environment-orchestrator.ts
│   │   ├── collection-orchestrator.ts
│   │   ├── suite-orchestrator.ts
│   │   ├── schema-orchestrator.ts
│   │   ├── __tests__/
│   │   └── index.ts
│   └── interfaces/
│       └── index.ts
│
├── infrastructure/                     # ✨ RENAMED (was services/)
│   ├── services/                       # Keep existing services
│   │   ├── service-bootstrap.ts        # Updated DI registration
│   │   ├── service-container.ts        # Updated identifiers
│   │   ├── console-service.ts
│   │   └── ...
│   └── event-bus/                      # ✨ NEW
│       ├── event-bus.ts
│       ├── domain-event.ts
│       └── __tests__/
│
├── shared/                             # (remains same)
│   ├── types/
│   ├── constants.ts
│   ├── utils.ts
│   └── index.ts
│
├── webview-panels/                     # DEPRECATED (keep for backwards compat)
│   ├── request-tester/
│   │   ├── handlers/                   # DEPRECATED (use presentation/webview/message-handlers)
│   │   └── ... (keep during transition)
│   └── ...
│
└── providers/                          # DEPRECATED (keep for backwards compat)
    ├── collections-tree-provider.ts   # DEPRECATED (use presentation/components/tree-providers)
    └── ...
```

---

## 🎯 Migration Strategy (All-At-Once)

### Phase 1: Foundation (1-2 Days)
```
1. Create new directory structure
2. Create application/dto/ with all DTOs
3. Create application/commands/ (empty shells)
4. Create orchestration/ with initial services
5. Create infrastructure/event-bus/
6. Update service-bootstrap.ts with new registrations
7. Create presentation/ directory structure
```

### Phase 2: Commands (1 Day)
```
1. Fill in all application/commands/ implementations
2. Each command: Input validation + Orchestrator delegation + Event publishing
3. Test each command
```

### Phase 3: Handlers & Model Loaders (1-2 Days)
```
1. Create all presentation/webview/message-handlers/ V2 handlers
2. Create HandlerFactoryV2 for dependency injection
3. Create presentation/components/tree-providers/loaders/
4. Create new tree providers V2
5. Test all handlers
```

### Phase 4: Integration & Validation (1 Day)
```
1. Update panel registrations to use V2 versions
2. Run full test suite
3. Validate no getServiceContainer() calls
4. Verify circular dependencies broken
5. Check type safety
```

### Phase 5: Cleanup (1 Day)
```
1. Remove old handler/provider files (or move to deprecated/)
2. Remove old model loading logic from panels
3. Clean up imports across codebase
4. Update documentation
```

**Total Timeline**: 4-7 days for full migration

---

## ✅ Execution Checklist

### Pre-Migration Setup
- [ ] Create feature branch: `refactor/full-ddd-migration`
- [ ] Run pre-check: `./scripts/pre-refactor-check.sh full-migration`
- [ ] Backup current state

### Phase 1: Structure
- [ ] Create `src/presentation/` directory
- [ ] Create `src/application/` directory
- [ ] Create `src/orchestration/` directory
- [ ] Create subdirectories for all DTOs, Commands, Handlers
- [ ] Create test directories for each layer

### Phase 2: DTOs
- [ ] Create all 12 DTO files in `src/application/dto/`
- [ ] Each DTO: Input interface + Output class + Factory method
- [ ] All tests: 100% coverage

### Phase 3: Commands
- [ ] Implement all 19 commands in `src/application/commands/`
- [ ] Each command validates input + delegates to orchestrator
- [ ] All commands publish events
- [ ] All tests: 80% coverage minimum

### Phase 4: Handlers & Loaders
- [ ] Create all handler V2 implementations
- [ ] Create model loader implementations
- [ ] Create new tree provider V2 implementations
- [ ] All tests: 80% coverage minimum

### Phase 5: Integration
- [ ] Update service bootstrap to register all new services
- [ ] Update HandlerFactory to use V2 handlers
- [ ] Update panel registrations
- [ ] Update tree provider registrations
- [ ] Run full test suite: `npm test`
- [ ] Run lint: `npm run lint:architecture`
- [ ] Verify no violations

### Post-Migration
- [ ] Run: `./scripts/post-refactor-check.sh`
- [ ] All checks pass
- [ ] Create pull request
- [ ] Code review
- [ ] Merge to main

---

## 🚀 Master Refactoring Prompt

Use this prompt in Copilot Chat to generate ALL refactoring code at once:

```markdown
# Full-Scale HTTP Forge DDD Refactoring

@.vscode/.copilot-instructions @docs/CUSTOM-INSTRUCTIONS.md

## Scope
Refactor entire HTTP Forge extension from mixed architecture to complete DDD implementation.

## Target Structure
```
src/
├── presentation/               (UI Layer)
├── application/                (Use Cases)
│   ├── commands/              (Orchestration)
│   ├── dto/                   (Data Transfer)
│   └── interfaces/
├── orchestration/              (Domain Logic)
├── infrastructure/             (Technical Details)
└── shared/
```

## Handlers to Refactor (19 Total)

### Request Tester Panel
1. RequestExecutionHandler → ExecuteRequestCommand + ExecuteRequestDTO
2. CookieHandler → ManageCookiesCommand + CookieDTO
3. HistoryHandler → ManageHistoryCommand + HistoryDTO
4. EnvironmentHandler → SelectEnvironmentCommand + EnvironmentSelectionDTO
5. VariableHandler → ManageVariablesCommand + VariableDTO
6. GraphQLHandler → ManageGraphQLCommand + GraphQLDTO
7. SchemaHandler → ManageSchemaCommand + SchemaDTO
8. OAuth2Handler → ManageOAuth2Command + OAuth2DTO
9. SaveRequestHandler → SaveRequestCommand + SaveRequestDTO

### Environment Editor Panel
10. EnvironmentCrudHandler → ManageEnvironmentsCommand + EnvironmentCrudDTO
11. ConfigHandler → ManageConfigCommand + ConfigDTO
12. FileHandler → ManageConfigFilesCommand + FileDTO

### Test Suite Panel
13. SaveHandler (Suite) → SaveTestSuiteCommand + SaveSuiteDTO
14. SuiteRunHandler → RunTestSuiteCommand + RunSuiteDTO
15. BrowseDataHandler → BrowseSuiteDataCommand + BrowseDataDTO
16. ExportHandler → ExportSuiteResultsCommand + ExportSuiteDTO

### Collection Editor Panel
17. SaveHandler (Collection) → SaveCollectionCommand + SaveCollectionDTO
18. UpdateHandler → UpdateCollectionCommand + UpdateCollectionDTO

### Folder Editor Panel
19. SaveHandler (Folder) → SaveFolderCommand + SaveFolderDTO

## New Files to Create

### DTOs (12 files in src/application/dto/)
```
- request.dto.ts              # ExecuteRequestInput/Output
- history.dto.ts              # UseHistoryInput/Output
- cookie.dto.ts               # ManageCookieInput/Output
- variable.dto.ts             # ManageVariableInput/Output
- environment.dto.ts          # SelectEnvironmentInput/Output
- environment-crud.dto.ts     # EnvironmentCrudInput/Output
- collection.dto.ts           # SaveCollectionInput/UpdateOutput
- test-suite.dto.ts           # SaveSuiteInput/RunSuiteOutput
- folder.dto.ts               # SaveFolderInput/Output
- schema.dto.ts               # ManageSchemaInput/Output
- oauth2.dto.ts               # OAuth2Input/Output
- graphql.dto.ts              # GraphQLInput/Output
```

### Commands (19 files in src/application/commands/)
```
request/
  - execute-request.command.ts
  - save-request.command.ts
  - manage-cookies.command.ts
  - manage-history.command.ts
  - manage-variables.command.ts

environment/
  - select-environment.command.ts
  - manage-environments.command.ts
  - manage-config.command.ts

collection/
  - save-collection.command.ts
  - update-collection.command.ts

suite/
  - run-test-suite.command.ts
  - save-test-suite.command.ts
  - browse-suite-data.command.ts
  - export-suite-results.command.ts

folder/
  - save-folder.command.ts

schema/
  - manage-schema.command.ts

oauth2/
  - manage-oauth2.command.ts

graphql/
  - manage-graphql.command.ts
```

### Handlers V2 (19 files in src/presentation/webview/message-handlers/)
One handler for each command above, with same file names but with "-v2" suffix

### Model Loaders (3 files in src/presentation/components/tree-providers/loaders/)
```
- collections-model-loader.ts
- environments-model-loader.ts
- test-suites-model-loader.ts
```

### Tests (60+ files in __tests__/ folders)
- All DTOs: 100% coverage
- All Commands: 80% coverage (success + error + validation)
- All Handlers: 80% coverage (success + error + validation)
- All Loaders: 80% coverage (normal + edge cases)
- All Tree Providers: 80% coverage

## Requirements

### DTO Pattern
```typescript
export interface ExecuteRequestInput {
  request: any;
  environment: any;
  // ... other fields
}

export class ExecuteRequestOutput {
  readonly statusCode: number;
  readonly body: string;
  
  static from(data: any): ExecuteRequestOutput {
    return new ExecuteRequestOutput(data);
  }
}
```

### Command Pattern
```typescript
export class ExecuteRequestCommand implements ICommand<ExecuteRequestInput, ExecuteRequestOutput> {
  constructor(
    private orchestrator: IRequestOrchestrator,
    private eventBus: IEventBus
  ) {}

  validateInput(input: ExecuteRequestInput): void {
    if (!input.request) throw new Error('request required');
  }

  async execute(input: ExecuteRequestInput): Promise<ExecuteRequestOutput> {
    this.validateInput(input);
    const result = await this.orchestrator.executeRequest(input.request, input.environment);
    this.eventBus.publish({ type: 'RequestExecuted', data: result });
    return ExecuteRequestOutput.from(result);
  }
}
```

### Handler Pattern
```typescript
export class ExecuteRequestHandlerV2 implements IMessageHandler {
  constructor(
    private command: IExecuteRequestCommand,
    private logger: ILogger
  ) {}

  getSupportedCommands(): string[] {
    return ['sendRequest', 'sendHttpRequest'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    this.logger.debug('[ExecuteRequestHandlerV2] Handling', { command, message });
    
    try {
      const input: ExecuteRequestInput = { request: message.request, environment: message.environment };
      const output = await this.command.execute(input);
      messenger.postMessage({ type: 'success', command, data: output });
      return true;
    } catch (error) {
      this.logger.error('[ExecuteRequestHandlerV2] Error', error);
      messenger.postMessage({ type: 'error', command, error: (error as Error).message });
      return true;
    }
  }
}
```

### Architecture Rules
- ✅ NO getServiceContainer() anywhere
- ✅ ALL dependencies via constructor (interfaces only)
- ✅ NO "as any" type casts
- ✅ NO circular dependencies
- ✅ Full try-catch error handling
- ✅ logger.debug() for tracing
- ✅ Events published for state changes
- ✅ Immutable DTOs (readonly fields)
- ✅ Comprehensive tests

## Quality Gates
- [ ] npm run lint:architecture ✅
- [ ] npm run type-check ✅
- [ ] npm test ✅
- [ ] 80% code coverage ✅
- [ ] No violations ✅

## Deliverables
- [ ] All 12 DTO files (src/application/dto/)
- [ ] All 19 Command files (src/application/commands/*)
- [ ] All 19 Handler V2 files (src/presentation/webview/message-handlers/)
- [ ] All 3 Model Loaders (src/presentation/components/tree-providers/loaders/)
- [ ] 60+ Test files across all layers
- [ ] Updated service-bootstrap.ts
- [ ] Updated HandlerFactory
- [ ] Updated panel registrations

Ready to generate the full refactored codebase!
```

---

## 📈 File Creation Order

1. **First**: Create all DTOs (dependencies for Commands)
2. **Second**: Create all Commands (dependencies for Handlers)
3. **Third**: Create all Handlers and Loaders
4. **Fourth**: Create all Tests
5. **Fifth**: Create infrastructure updates (event-bus, service-bootstrap)
6. **Sixth**: Create factory classes and panel updates

---

## 🔗 File Dependencies

```
DTOs (no dependencies)
  ↓
Commands (depends on DTOs + Orchestrators)
  ↓
Handlers (depends on Commands + Logger)
  ↓
HandlerFactory (depends on Handlers + DI Container)
  ↓
Panel Registration (depends on HandlerFactory)
```

---

## 🎓 Copilot Generation Strategy

### Split into Multiple Generations
Since generating all 85 files at once might be too large:

**Generation 1**: All DTOs (12 files)
```
@REFACTORING-PROMPTS.md Template #3 (Create New Feature)
Applied to: All 12 DTOs
```

**Generation 2**: Request Command Group (5 commands)
**Generation 3**: Environment Command Group (3 commands)
**Generation 4**: Collection Command Group (2 commands)
**Generation 5**: Suite Command Group (4 commands)
**Generation 6**: Single-File Commands (3 commands: Folder, Schema, OAuth2, GraphQL)
**Generation 7**: Handlers Group 1 (9 handlers for request-tester)
**Generation 8**: Handlers Group 2 (6 handlers for envs/collection/suite)
**Generation 9**: Tree Loaders & Providers (3+3 files)
**Generation 10**: Tests (in batches per layer)
**Generation 11**: Infrastructure Updates & Factories
**Generation 12**: Final Integration & Cleanup

---

## ⚡ Speed Optimization

To minimize total time:

1. **Parallelize where possible**:
   - All DTOs in one generation (no dependencies)
   - Groups of related commands together
   - Groups of related handlers together

2. **Use templates consistently**:
   - All DTOs follow same pattern
   - All Commands follow same pattern
   - All Handlers follow same pattern
   - All Tests follow same pattern

3. **Validation approach**:
   - After each generation batch, run checks
   - Fix issues before proceeding to next batch
   - This prevents cascading errors

---

## 🎯 Success Criteria

After full migration, ALL of these must be true:

```
✅ No getServiceContainer() calls anywhere in new code
✅ All dependencies injected via constructor
✅ All constructor parameters are INTERFACES
✅ No "as any" type casts
✅ No circular dependencies detected
✅ All new tests passing (npm test)
✅ Linter passing (npm run lint:architecture)
✅ TypeScript errors: 0
✅ Code coverage: 80%+
✅ Pull request approved by review
✅ Merged to main
```

---

## 📝 Step-by-Step Execution

### Day 1: Setup & DTOs
```bash
# 1. Prepare
./scripts/pre-refactor-check.sh full-migration

# 2. Create directories manually or as part of generation

# 3. Generate all DTOs using Generation 1 prompt
# (paste MASTER PROMPT into Copilot Chat, constrain to DTOs only)

# 4. Validate DTOs
./scripts/post-refactor-check.sh
git diff --stat  # Review scope

# 5. Commit checkpoint
git add src/application/dto/
git commit -m "refactor: create all DTOs for DDD architecture"
```

### Day 2-3: Commands
```bash
# Generate commands in groups:
# - Request commands (5 files)
# - Environment commands (3 files)
# - Collection commands (2 files)
# - Suite commands (4 files)
# - Single-file commands (3 files)

# After each batch:
npm test
npm run lint:architecture

# Commit checkpoints
git commit -m "refactor: implement [group-name] commands"
```

### Day 4: Handlers
```bash
# Generate handlers in 2 groups:
# - Request tester handlers (9 files)
# - Other handlers (6 files)

# Validate and test after each group
./scripts/post-refactor-check.sh

# Commit
git commit -m "refactor: implement all handlers V2"
```

### Day 5: Tree Providers & Loaders
```bash
# Generate model loaders (3 files)
# Generate new tree providers (3 files)
# 
npm test
git commit -m "refactor: implement model loaders and tree providers"
```

### Day 6: Infrastructure & Integration
```bash
# Generate event-bus
# Update service-bootstrap.ts
# Create HandlerFactory
# 
npm run lint:architecture
./scripts/post-refactor-check.sh
git commit -m "refactor: update infrastructure and factories"
```

### Day 7: Cleanup & Merge
```bash
# Final validation
npm test -- --coverage
npm run build
git push origin refactor/full-ddd-migration

# Create PR, get review, merge
```

---

## 💾 Backup Strategy

Before starting:
```bash
# Git handles version control
# But also backup locally:
cp -r src src.backup.$(date +%s)

# After each phase:
git commit -m "checkpoint: phase "[N] complete"
```

---

## 🆘 If Something Goes Wrong

1. **Rollback**: `git reset --hard HEAD~N`
2. **Check logs**: `git log --oneline | head -20`
3. **Review diff**: `git diff $LAST_GOOD_COMMIT`
4. **Identify issue**: Use `COPILOT-CORRECTION.md`
5. **Fix**: Ask me specifically what needs fixing
6. **Continue**: Resume from checkpoint

---

## 📊 Progress Tracking

Use this checklist to track progress:

- [ ] Phase 1: DTOs (12 files) - Est. 2 hours
- [ ] Phase 2: Request Commands (5 files) - Est. 2 hours
- [ ] Phase 3: Environment Commands (3 files) - Est. 1.5 hours
- [ ] Phase 4: Collection Commands (2 files) - Est. 1 hour
- [ ] Phase 5: Suite Commands (4 files) - Est. 2 hours
- [ ] Phase 6: Single Commands (3 files) - Est. 1.5 hours
- [ ] Phase 7: Request Handlers (9 files) - Est. 3 hours
- [ ] Phase 8: Other Handlers (6 files) - Est. 2.5 hours
- [ ] Phase 9: Loaders & Providers (6 files) - Est. 2.5 hours
- [ ] Phase 10: Tests (60+ files) - Est. 8 hours
- [ ] Phase 11: Infrastructure (2-3 files) - Est. 1.5 hours
- [ ] Phase 12: Integration & Cleanup - Est. 2 hours

**Total**: ~32 hours (4 days of intensive work, or spread over 1-2 weeks at normal pace)

---

**Version**: 1.0  
**Created**: 2026-03-16  
**Scope**: Complete HTTP Forge Extension  
**Approach**: All-at-once migration with checkpoint strategy
