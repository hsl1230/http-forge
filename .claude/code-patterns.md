# Code patterns — http-forge

This file extracts common implementation patterns to help Claude Code create consistent code.

Command pattern
- Commands are registered in `src/extension.ts` within `registerCommands()`.
- Commands typically get services from the DI container (via `services`) or use local variables (e.g. `collectionService`, `envConfigService`).
- Use `vscode.window.showInputBox` / `showQuickPick` for interactive flows.
- Example error handling pattern:
  ```ts
  try {
    await service.doSomething();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to do something: ${message}`);
  }
  ```

Provider pattern
- Tree providers implement `vscode.TreeDataProvider<T>` and expose `refresh()` methods.
- Panels use static `show()` helpers and a manager (`RequestTesterPanelManager`) to control reuse/creation.

Using `@http-forge/core`
- Import typed interfaces from `@http-forge/core` (e.g. `CollectionService`, `TestSuiteService`).
- Work through DI container (the bootstrap provides typed services via `bootstrapServices` and `getServiceContainer`).

Error handling and user feedback
- Use `vscode.window.showInformationMessage` and `showWarningMessage` for success/info flows.
- Use `console.error` for lower-level logs that shouldn't show to users.

Testing patterns
- Unit tests are configured via `jest.config.js` with `ts-jest` and a `__mocks__/vscode.ts` helper.
- Tests should mock VS Code APIs and services where possible.

Formatting & linting
- Run `npm run format` (Prettier) and `npm run lint` (ESLint) before committing.
