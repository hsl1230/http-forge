# Copilot Code Correction Guide

Quick reference for common mistakes I might make during refactoring.
If I generate code with any of these patterns, use this guide to correct me.

---

## 🔴 Critical Violations (Must Fix)

### Violation #1: Service Locator Pattern

**Pattern I might generate**:
```typescript
export class MyHandler implements IMessageHandler {
  constructor(private contextProvider: IPanelContextProvider) {}

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    // ❌ WRONG!
    const service = getServiceContainer().someService;
    await service.doSomething();
  }
}
```

**How to fix**:
1. Add service to constructor as interface parameter
2. Remove getServiceContainer() call
3. Pass dependency from HandlerFactory

**Corrected code**:
```typescript
export class MyHandler implements IMessageHandler {
  constructor(
    private someService: ISomeService,  // ✅ Now injected
    private contextProvider: IPanelContextProvider
  ) {}

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    // ✅ CORRECT
    await this.someService.doSomething();
  }
}
```

**Tell me**: "Add ISomeService to the constructor and remove getServiceContainer()"

---

### Violation #2: 'as any' Type Casts

**Pattern I might generate**:
```typescript
export class MyCommand implements ICommand<Input, Output> {
  async execute(input: Input): Promise<Output> {
    const result = await this.orchestrator.execute(input);
    
    // ❌ WRONG!
    return result as any;
  }
}
```

**How to fix**:
1. Create proper Output type/class
2. Use factory method to convert
3. Never cast to 'any'

**Corrected code**:
```typescript
export class MyCommand implements ICommand<Input, Output> {
  async execute(input: Input): Promise<Output> {
    const result = await this.orchestrator.execute(input);
    
    // ✅ CORRECT - Use factory method
    return MyOutput.from(result);
  }
}

export class MyOutput {
  static from(data: any): MyOutput {
    return new MyOutput({
      field1: data.field1,
      field2: data.field2
    });
  }
}
```

**Tell me**: "Create a factory method instead of 'as any'"

---

### Violation #3: Circular Dependencies

**Pattern I might generate**:
```typescript
// Handler depends on DataProvider
export class MyHandler implements IMessageHandler {
  constructor(private dataProvider: PanelDataProvider) {}
}

// DataProvider depends on Handler
export class PanelDataProvider {
  constructor(private handler: MyHandler) {}
}
```

**How to fix**:
1. Use HandlerFactory to break the cycle
2. Pass context provider separately
3. Lazy initialization if needed

**Corrected code**:
```typescript
// ✅ Factory breaks the cycle
export class HandlerFactory {
  static createHandlers(contextProvider: IPanelContextProvider): IMessageHandler[] {
    return [
      new MyHandler(contextProvider),  // No circular reference
      // ... other handlers
    ];
  }
}

// Handlers receive context, not vice versa
export class MyHandler implements IMessageHandler {
  constructor(private contextProvider: IPanelContextProvider) {}
}

export class PanelDataProvider implements IPanelContextProvider {
  // No reference back to handlers
}
```

**Tell me**: "Break the circular dependency using HandlerFactory pattern"

---

### Violation #4: getServiceContainer() Hidden in Method

**Pattern I might generate**:
```typescript
export class MyHandler implements IMessageHandler {
  constructor(private contextProvider: IPanelContextProvider) {}

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    // ❌ WRONG! getServiceContainer inside method
    this.logger = getServiceContainer().logger;
    // ...
  }
}
```

**How to fix**:
1. Move to constructor
2. Inject logger as dependency

**Corrected code**:
```typescript
export class MyHandler implements IMessageHandler {
  constructor(
    private contextProvider: IPanelContextProvider,
    private logger: ILogger  // ✅ Inject as parameter
  ) {}

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    // ✅ Use injected logger
    this.logger.debug('Handling command');
  }
}
```

**Tell me**: "Move the logger to the constructor parameter"

---

## 🟡 Warning Issues (Should Fix)

### Warning #1: Missing Error Handling

**Pattern I might generate**:
```typescript
async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
  const result = await this.command.execute(message);
  messenger.postMessage({ type: 'success', data: result });
  return true;
  // ❌ No error handling!
}
```

**How to fix**:
1. Add try-catch block
2. Log errors
3. Send error message to webview

**Corrected code**:
```typescript
async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
  try {
    const result = await this.command.execute(message);
    messenger.postMessage({ type: 'success', data: result });
    return true;
  } catch (error) {
    this.logger.error('Execution failed', error);
    messenger.postMessage({ 
      type: 'error', 
      error: (error as Error).message 
    });
    return true;
  }
}
```

**Tell me**: "Add try-catch error handling to the handle method"

---

### Warning #2: Missing JSDoc

**Pattern I might generate**:
```typescript
export class MyCommand implements ICommand<Input, Output> {
  constructor(private orchestrator: IOrchestrator) {}

  async execute(input: Input): Promise<Output> {
    // No JSDoc!
  }
}
```

**How to fix**:
1. Add JSDoc to class
2. Add JSDoc to methods
3. Document parameters and return types

**Corrected code**:
```typescript
/**
 * Command: Execute my feature
 * 
 * Responsibilities:
 * - Validate input
 * - Delegate to orchestrator
 * - Return result DTO
 */
export class MyCommand implements ICommand<Input, Output> {
  constructor(private orchestrator: IOrchestrator) {}

  /**
   * Execute the command
   * @param input Command input DTO
   * @returns Result as DTO
   */
  async execute(input: Input): Promise<Output> {
    // ...
  }
}
```

**Tell me**: "Add JSDoc comments to all classes and methods"

---

### Warning #3: Missing Tests

**Pattern I might generate**:
```typescript
// Handler with NO tests!
export class MyHandler implements IMessageHandler {
  // ...
}
```

**How to fix**:
1. Create test file
2. Use hf-test-handler template
3. Test success/error/validation paths

**Corrected code**:
```typescript
// {name}-handler.spec.ts
describe('MyHandler', () => {
  let handler: MyHandler;
  let mockCommand: jest.Mocked<IMyCommand>;

  beforeEach(() => {
    mockCommand = { execute: jest.fn() } as any;
    handler = new MyHandler(mockCommand, logger);
  });

  it('should handle success', async () => {
    mockCommand.execute.mockResolvedValue({ success: true });
    const result = await handler.handle('myCommand', {}, messenger);
    expect(result).toBe(true);
  });

  it('should handle error', async () => {
    mockCommand.execute.mockRejectedValue(new Error('Test error'));
    await handler.handle('myCommand', {}, messenger);
    expect(messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' })
    );
  });
});
```

**Tell me**: "Add comprehensive unit tests using the hf-test-handler template"

---

### Warning #4: Mutable State in DTO

**Pattern I might generate**:
```typescript
export class MyOutput {
  // ❌ WRONG! Not readonly
  statusCode: number;
  data: any;
  
  constructor(data: { statusCode: number; data: any }) {
    this.statusCode = data.statusCode;
    this.data = data.data;
  }
}
```

**How to fix**:
1. Add readonly to fields
2. Ensure immutability

**Corrected code**:
```typescript
export class MyOutput {
  readonly statusCode: number;
  readonly data: any;
  
  constructor(data: { statusCode: number; data: any }) {
    this.statusCode = data.statusCode;
    this.data = data.data;
  }
}
```

**Tell me**: "Add 'readonly' to all DTO fields"

---

### Warning #5: Command Validates Nothing

**Pattern I might generate**:
```typescript
export class MyCommand implements ICommand<Input, Output> {
  async execute(input: Input): Promise<Output> {
    // ❌ No validation!
    const result = await this.orchestrator.execute(input);
    return MyOutput.from(result);
  }
}
```

**How to fix**:
1. Add validateInput() method
2. Throw if invalid
3. Check required fields

**Corrected code**:
```typescript
export class MyCommand implements ICommand<Input, Output> {
  async execute(input: Input): Promise<Output> {
    this.validateInput(input);  // ✅ Validate
    const result = await this.orchestrator.execute(input);
    return MyOutput.from(result);
  }

  private validateInput(input: Input): void {
    if (!input.requiredField) {
      throw new Error('requiredField is required');
    }
  }
}
```

**Tell me**: "Add input validation to the command"

---

## 🔵 Info Issues (Nice to Have)

### Info #1: Missing Logger Calls

**Pattern I might generate**:
```typescript
async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
  const result = await this.command.execute(message);
  // ❌ No logging
  messenger.postMessage({ type: 'success', data: result });
  return true;
}
```

**How to fix**:
1. Add logger.debug() at entry
2. Add logger.debug() at important points
3. Add logger.error() on catch

**Corrected code**:
```typescript
async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
  this.logger.debug('[MyHandler] Handling command', { command, message });
  
  try {
    const result = await this.command.execute(message);
    this.logger.debug('[MyHandler] Success', result);
    messenger.postMessage({ type: 'success', data: result });
    return true;
  } catch (error) {
    this.logger.error('[MyHandler] Failed', error);
    // ...
  }
}
```

**Tell me**: "Add logger.debug() and logger.error() calls"

---

### Info #2: Handler Doesn't Validate Input

**Pattern I might generate**:
```typescript
async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
  // ❌ No basic validation before delegating
  await this.command.execute(message);
}
```

**How to fix**:
1. Add validateInput() method
2. Check message structure
3. Let Command do business validation

**Corrected code**:
```typescript
async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
  try {
    this.validateInput(message);  // Basic checks
    const result = await this.command.execute(message);  // Business validation in Command
    // ...
  }
}

private validateInput(message: any): void {
  if (!message.requiredField) {
    throw new Error('requiredField is required in message');
  }
}
```

**Tell me**: "Add basic input validation to the handler"

---

### Info #3: Event Not Published

**Pattern I might generate**:
```typescript
export class MyCommand implements ICommand<Input, Output> {
  constructor(private orchestrator: IOrchestrator) {}

  async execute(input: Input): Promise<Output> {
    const result = await this.orchestrator.execute(input);
    // ❌ No event published!
    return MyOutput.from(result);
  }
}
```

**How to fix**:
1. Inject eventBus
2. Publish event after success
3. Other features can subscribe

**Corrected code**:
```typescript
export class MyCommand implements ICommand<Input, Output> {
  constructor(
    private orchestrator: IOrchestrator,
    private eventBus: IEventBus
  ) {}

  async execute(input: Input): Promise<Output> {
    const result = await this.orchestrator.execute(input);
    
    this.eventBus.publish({
      type: 'MyCommandExecuted',
      data: result,
      timestamp: Date.now()
    });
    
    return MyOutput.from(result);
  }
}
```

**Tell me**: "Publish an event after execution"

---

## How to Use This Guide

When I generate code and it violates these patterns:

1. **Identify the violation** (look above)
2. **Copy the corrected code** from this guide
3. **Tell me what's wrong** using the suggested phrasing
4. **I'll fix it** in the generated code

### Example Conversation

```
You: "The Handler has getServiceContainer() calls"
Me: [Generates new code without them]

You: "add JSDoc to all methods"
Me: [Adds complete JSDoc]

You: "Missing try-catch in handle()"
Me: [Adds error handling]
```

---

## Reference

| Violation | Severity | Fix Method |
|-----------|----------|-----------|
| getServiceContainer() | Critical | Inject as parameter |
| as any casts | Critical | Create proper type + factory |
| Circular dependencies | Critical | Use Factory pattern |
| Missing error handling | Warning | Add try-catch |
| Missing JSDoc | Warning | Add documentation |
| No tests | Warning | Create test file |
| Mutable DTO | Warning | Add readonly |
| No validation | Warning | Add validateInput() |
| No logger calls | Info | Add debug/error logging |

---

**Version**: 1.0  
**Last Updated**: 2026-03-16
