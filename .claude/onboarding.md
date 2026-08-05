# Claude Code Onboarding — http-forge

Quick start for Claude Code when contributing to this repository.

1) Read the baseline docs
- `DEVELOPMENT.md` — dev environment and Node version requirements.
- `docs/ARCHITECTURE-ANALYSIS.md` — architectural overview.
- `README.md` — user-facing description and quick usage.

2) Local setup
- Use Node 20 (see `.nvmrc`) and run `npm ci`.
- Run `npm run type-check` to validate TypeScript.

When Claude Code needs to add a new command
-------------------------------------------------
1. Create a new command implementation under `src/` following the `http-forge` command pattern (see `.claude/templates/http-forge-command.ts`).
2. Add the command ID to `src/shared/constants.ts` (follow the existing `COMMAND_IDS` convention).
3. Register the command in `src/extension.ts` inside `registerCommands()` so it is loaded on activation.
4. Update `package.json` `contributes.commands` if the command should be visible in the command palette.
5. Add unit tests under `src/` or `test/` and update docs if needed.
6. Run `node .claude/commands/validate-new-feature.js <command-id>` locally (or CI will run checks).

When Claude Code needs to fix a bug
-------------------------------------
1. Reproduce the problem locally using the test suite or by exercising the extension in a development host VS Code.
2. Search for the relevant code by using the `COMMAND_IDS` or by searching for relevant providers/webview panels.
3. Follow repository patterns (error handling, DI via service-bootstrap, using the interfaces from `@http-forge/core`).
4. Run `npm run type-check`, `npm run lint`, and `npm test` before submitting a patch.

When modifying code, ensure patterns are followed
- Use the service bootstrap and dependency injection to access services rather than creating global singletons.
- Add try/catch blocks and user-friendly `vscode.window.showErrorMessage(...)` when the code interacts with VS Code APIs.
- Webview code should be encapsulated in `presentation/webview/panels/*` and exposed via static `show()` helpers.
- Keep `.claude/templates` in sync with real examples and exclude `.claude` from compilation.

Reference: `DEVELOPMENT.md` for detailed environment, linting, and testing instructions.
