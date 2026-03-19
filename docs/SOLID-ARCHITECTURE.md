# HTTP Forge - SOLID Architecture

This document outlines the SOLID principles applied to the HTTP Forge VS Code extension.

## Overview

The codebase has been refactored to follow SOLID principles:

- **S**ingle Responsibility Principle
- **O**pen/Closed Principle
- **L**iskov Substitution Principle
- **I**nterface Segregation Principle
- **D**ependency Inversion Principle

## Architecture Changes

### 1. Single Responsibility Principle (SRP)

#### URL Builder (`src/services/url-builder.ts`)
- Extracted URL building logic from `HttpRequestService`
- Handles template variable replacement (`{{variable}}`)
- Handles path parameter substitution (`:param`)
- Handles query string building

#### Request Preprocessor (`src/services/request-preprocessor.ts`)
- Extracted header sanitization from `HttpRequestService`
- Extracted body encoding logic
- Handles Content-Type header management

#### Collection Runner Components (`src/services/collection-runner/`)
Extracted from `CollectionRunnerPanel` (~800 lines → ~400 lines):

- **VariableReplacer** (`variable-replacer.ts`)
  - Handles `{{variable}}` pattern replacement
  - Recursive replacement in objects/arrays
  
- **TestScriptRunner** (`test-script-runner.ts`)
  - Executes post-response test scripts
  - Provides `httpForge` and `expect` APIs
  - Sandboxed script execution
  
- **DataFileParser** (`data-file-parser.ts`)
  - Parses JSON data files into rows
  - Parses CSV files with proper quoting support
  
- **CollectionRequestExecutor** (`collection-request-executor.ts`)
  - Coordinates request execution
  - Handles URL resolution with baseUrl
  - Integrates variable replacement and test running

#### Services
Each service has a focused responsibility:
- `EnvironmentConfigService` - Environment and variable management
- `CollectionService` - Collection CRUD operations
- `HttpRequestService` - HTTP request execution
- `CookieService` - Cookie management
- `RequestHistoryService` - Request history persistence
- `OAuth2TokenManager` - OAuth 2.0 token acquisition, caching, refresh, and SecretStorage persistence
- `RequestPreparer` - Request preparation including auth injection (Bearer, Basic, API Key, OAuth2)

### 2. Open/Closed Principle (OCP)

#### Interceptor Chain (`src/services/interceptors.ts`)
- Request interceptors can modify requests before sending
- Response interceptors can process responses after receiving
- Error interceptors can handle/recover from errors
- New interceptors can be added without modifying existing code

```typescript
// Example: Adding a custom interceptor
interceptorChain.addRequestInterceptor({
  name: 'custom-auth',
  priority: 10,
  intercept(options, context) {
    options.headers = {
      ...options.headers,
      'X-Custom-Auth': 'token'
    };
    return options;
  }
});
```

#### Webview Message Router (`src/presentation/webview/shared-interfaces.ts`)
- Centralized routing system for all webview messages
- New message handlers can be registered without modifying the router
- Each handler declares which commands it supports via `getSupportedCommands()`
- O(1) command dispatch using internal command map
- Enables composition of handlers for complex panels

### 3. Liskov Substitution Principle (LSP)

All services implement their corresponding interfaces:
- `HttpRequestService` implements `IHttpRequestService`
- `CollectionService` implements `ICollectionService`
- `CookieService` implements `ICookieService`
- `EnvironmentConfigService` implements `IEnvironmentConfigService`
- `RequestHistoryService` implements `IRequestHistoryService`

Services can be substituted with any implementation of the interface, enabling:
- Mock implementations for testing
- Alternative implementations for different use cases

### 4. Interface Segregation Principle (ISP)

Interfaces are split into focused sub-interfaces:

#### Environment Config
- `IEnvironmentConfigReader` - Read-only operations
- `IEnvironmentSelector` - Environment selection
- `IVariableResolver` - Variable resolution
- `IVariableManager` - Variable CRUD operations

#### Collection Service
- `ICollectionReader` - Read-only operations
- `ICollectionWriter` - Collection CRUD
- `IRequestManager` - Request operations
- `IFolderManager` - Folder operations
- `ICollectionVariableManager` - Variable management
- `ICollectionImportExport` - Import/export operations

#### Cookie Service
- `ICookieReader` - Read-only operations
- `ICookieWriter` - Write operations

#### HTTP Request Service
- `IHttpExecutor` - Request execution
- `IUrlBuilder` - URL building

### 5. Dependency Inversion Principle (DIP)

#### Service Container (`src/services/service-container.ts`)
- Centralized dependency management
- Services are registered with identifiers
- Consumers resolve dependencies through the container

```typescript
// Register a service
container.registerSingleton<IHttpRequestService>(
  ServiceIdentifiers.HttpRequest,
  (c) => new HttpRequestService(
    c.resolve<IEnvironmentConfigService>(ServiceIdentifiers.EnvironmentConfig),
    c.resolve<IUrlBuilder>(ServiceIdentifiers.UrlBuilder),
    c.resolve<IRequestPreprocessor>(ServiceIdentifiers.RequestPreprocessor),
    c.resolve<IInterceptorChain>(ServiceIdentifiers.InterceptorChain)
  )
);

// Resolve a service
const httpService = container.resolve<IHttpRequestService>(
  ServiceIdentifiers.HttpRequest
);
```

#### Service Bootstrap (`src/services/service-bootstrap.ts`)
- Composition root for the application
- Configures all service registrations
- Provides `createTestContainer()` for testing

## File Structure

### Backend Services (TypeScript)

```
src/services/
├── interfaces/
│   ├── index.ts                      # Interface exports
│   ├── collection.interface.ts       # Collection service interface
│   ├── cookie.interface.ts           # Cookie service interface
│   ├── environment-config.interface.ts
│   ├── http-request.interface.ts     # HTTP service interface
│   └── request-history.interface.ts  # History service interface
├── collection-runner/
│   ├── index.ts                      # Collection runner exports
│   ├── interfaces.ts                 # Runner component interfaces
│   ├── variable-replacer.ts          # SRP: Variable substitution
│   ├── test-script-runner.ts         # SRP: Test script execution
│   ├── data-file-parser.ts           # SRP: Data file parsing
│   └── collection-request-executor.ts # DIP: Request orchestration
├── collection-service.ts
├── cookie-service.ts
├── environment-config-service.ts
├── http-request-service.ts
├── request-history-service.ts
├── interceptors.ts                   # OCP: Request/response interceptors
├── request-preprocessor.ts           # SRP: Header/body processing
├── url-builder.ts                    # SRP: URL building
├── service-container.ts              # DIP: Dependency injection
├── service-bootstrap.ts              # DIP: Composition root
└── index.ts                          # Service exports
```

### Frontend Webview Modules (JavaScript)

```
resources/features/request-tester/modules/
├── main.js                    # Entry point, initialization
├── message-handler.js         # Handle messages from extension
├── state.js                   # Application state management
├── elements.js                # DOM element references
├── utils.js                   # Utility functions
├── request-builder.js         # Build request configuration
├── request-executor.js        # Execute HTTP requests
├── request-loader.js          # Load request data into UI
├── request-saver.js           # Save request to collection
├── response-handler.js        # Handle and display responses
├── url-builder.js             # Build URL with variables
├── form-manager.js            # Manage form inputs
├── query-params-manager.js    # Manage query parameters
├── path-variables-manager.js  # Manage path variables
├── body-type-manager.js       # Manage request body types
├── monaco-editors-manager.js  # Monaco editor instances
├── history-renderer.js        # Render request history
├── cookie-manager.js          # Manage cookies
├── script-runner.js           # Execute pre/post scripts
├── agl-object.js              # Script API object
├── expect-chain.js            # Fluent assertion API
├── test-results.js            # Test results management
├── console-capture.js         # Capture console output
└── schema-editor-manager.js   # Body Schema & Response Schema tab editors
```

## Webview Panel Handler Architecture

### Overview

Webview panels (`RequestTesterPanel`, `EnvironmentEditorPanel`, `FolderEditorPanel`, `TestSuitePanel`) use a handler-based architecture implementing SOLID principles. This enables:

- **SRP**: Each handler has a single responsibility
- **OCP**: New handlers can be added without modifying the panel
- **LSP**: All handlers implement `IMessageHandler` interface
- **ISP**: Small focused interfaces for message handling
- **DIP**: Panels depend on abstractions, not concrete implementations

### Core Interfaces

#### IWebviewMessenger
Abstracts webview panel communication - allows handlers to send messages to webview without direct panel dependency.

```typescript
export interface IWebviewMessenger {
    postMessage(message: unknown): void;
}
```

#### IMessageHandler
Base interface for all message handlers - implementing handlers declare supported commands and handle them.

```typescript
export interface IMessageHandler {
    getSupportedCommands(): string[];
    handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean>;
}
```

#### IPanelContextProvider
Provides request/suite context to handlers - enables handlers to access current context without the panel directly managing state.

```typescript
export interface IPanelContextProvider {
    getCurrentContext(): RequestContext | undefined;
    getHistoryStoragePath(): HistoryStoragePath | undefined;
    getCollectionId(): string | undefined;
}
```

### WebviewMessageRouter

Centralized routing system using O(1) command dispatch:

```typescript
export class WebviewMessageRouter {
    private handlers: IMessageHandler[] = [];
    private commandMap: Map<string, IMessageHandler> = new Map();

    registerHandler(handler: IMessageHandler): void {
        // Build command lookup map
        for (const command of handler.getSupportedCommands()) {
            this.commandMap.set(command, handler);
        }
    }

    async route(message: any, messenger: IWebviewMessenger): Promise<boolean> {
        const command = message.command || message.type;
        const handler = this.commandMap.get(command);
        if (handler) {
            return await handler.handle(command, message, messenger);
        }
        return false;
    }
}
```

### Request Tester Panel Handlers

Each handler in `RequestTesterPanel` handles a specific concern:

| Handler | Responsibility | Commands |
|---------|----------------|----------|
| `RequestExecutionHandler` | HTTP request execution | `sendRequest`, `cancelRequest`, `sendHttpRequest` |
| `SaveRequestHandler` | Save request to collection | `saveRequest` |
| `EnvironmentSelectionHandler` | Environment selection and history | `changeEnvironment`, `openEnvironmentEditor` |
| `HistoryHandler` | Request history operations | `useHistoryEntry`, `deleteHistoryEntry`, `shareHistoryEntry` |
| `CookieHandler` | Cookie management | `getCookies`, `setCookie`, `deleteCookie`, `clearCookies` |
| `VariableHandler` | Variable management | `variableChange` |
| `SchemaHandler` | Body/response schema operations | `getBodySchema`, `saveBodySchema`, `inferBodySchema`, `validateBody`, etc. |
| `OAuth2Handler` | OAuth2 token management | `oauth2GetToken`, `oauth2RefreshToken`, `oauth2ClearToken` |
| `GraphQLHandler` | GraphQL introspection & completions | `graphqlFetchSchema`, `graphqlGetCompletions` |

### Panel Data Provider

`PanelDataProvider` implements `IPanelContextProvider` and provides data for webview initialization:

- Manages current request context
- Provides merged request data (saved + generated) to handlers
- Offers collection variable resolution
- Supplies history information grouped by ticket/branch

### Request Tester Panel Manager

Multi-panel support with LRU eviction:

```typescript
export class RequestTesterPanelManager {
    private panels: Map<string, RequestTesterPanel> = new Map();
    
    async show(context: RequestContext, forceNew: boolean = false): Promise<RequestTesterPanel> {
        // Unique panel ID from context
        const panelId = this.generatePanelId(context);
        
        // Return existing panel for this request (no duplicates)
        if (this.panels.has(panelId)) {
            return this.panels.get(panelId)!.reveal();
        }
        
        // Reuse active panel or oldest (LRU) if at max capacity
        // Create new panel otherwise
    }
    
    closeAll(): void {
        // Close all open panels
    }
}
```

### Other Panel Handlers

#### Environment Editor Panel Handler
| Handler | Responsibility |
|---------|----------------|
| `ReadyHandler` | Send initial environment data to webview |
| `ConfigHandler` | Save shared and local configuration |
| `EnvironmentCrudHandler` | Add/delete/duplicate environments |
| `FileHandler` | Open environment config files in editor |

#### Folder Editor Panel Handler
| Handler | Responsibility |
|---------|----------------|
| `ReadyHandler` | Send initial folder data |
| `SaveHandler` | Save folder properties |

#### Test Suite Panel Handler
| Handler | Responsibility |
|---------|----------------|
| `ReadyHandler` | Send initial suite and environment data |
| `SaveHandler` | Save suite and manage requests |
| `SuiteRunHandler` | Execute test suite with statistics |
| `BrowseDataHandler` | Browse and load data files |
| `ExportHandler` | Export test results to JSON/HTML |

## Webview Module Architecture

The Request Tester webview has been refactored following the same SOLID principles:

### Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `main.js` | Entry point, initialization, event binding |
| `message-handler.js` | Handle messages from VS Code extension |
| `state.js` | Application state management |
| `elements.js` | Centralized DOM element references |
| `request-builder.js` | Build request configuration from UI |
| `request-executor.js` | Execute requests via extension |
| `request-loader.js` | Load request data into UI form |
| `request-saver.js` | Save request to collection |
| `response-handler.js` | Process and display responses |
| `url-builder.js` | Build URL with variable substitution |
| `form-manager.js` | Manage form inputs (headers, etc.) |
| `query-params-manager.js` | Manage query parameters table |
| `path-variables-manager.js` | Manage path variables |
| `body-type-manager.js` | Manage request body type selection |
| `monaco-editors-manager.js` | Manage Monaco editor instances |
| `history-renderer.js` | Render request history sidebar |
| `cookie-manager.js` | Manage cookies across requests |
| `script-runner.js` | Execute pre/post request scripts |
| `agl-object.js` | Provide `forge` API object for scripts |
| `expect-chain.js` | Fluent assertion API (`forge.expect()`) |
| `test-results.js` | Manage and display test results |
| `console-capture.js` | Capture console output from scripts |
| `schema-editor-manager.js` | Body Schema & Response Schema tab editors (Monaco, toolbar, status-code sub-tabs) |

### Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              main.js                                     │
│                     (Entry point, initialization)                        │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐     ┌────────────────┐     ┌───────────────┐
│message-handler│     │    state.js    │     │   elements.js │
└───────────────┘     └────────────────┘     └───────────────┘
        │                      │                      │
        ├──────────────────────┼──────────────────────┤
        ▼                      ▼                      ▼
┌───────────────┐     ┌────────────────┐     ┌───────────────┐
│request-builder│     │request-executor│     │response-handler│
└───────────────┘     └────────────────┘     └───────────────┘
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐     ┌────────────────┐     ┌───────────────┐
│  url-builder  │     │ script-runner  │     │ test-results  │
└───────────────┘     └────────────────┘     └───────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               ▼
                    ┌────────────────────┐
                    │     utils.js       │
                    └────────────────────┘
```

---

## Testing Benefits

The SOLID architecture enables:

1. **Unit Testing**: Services can be tested in isolation
2. **Mocking**: Inject mock implementations through the container
3. **Integration Testing**: Test interactions between services

```typescript
// Create a test container with mocks
const container = createTestContainer({
  httpService: {
    execute: async (options) => mockResponse
  }
});

// Test code using the container
const service = container.httpRequest;
```

## Migration Notes

Existing code continues to work. The refactoring is backward compatible:
- Global service variables replaced with service container
- Services cast to concrete types where needed (TODO: update panels to use interfaces)
- Extension entry point uses `bootstrapServices()` for initialization

## Future Improvements

1. Update webview panels to depend on interfaces
2. Add more built-in interceptors (logging, retry, caching)
3. Implement plugin system for custom services
4. Add comprehensive unit tests using mock container
