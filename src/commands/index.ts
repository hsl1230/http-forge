/**
 * Command registration facade.
 *
 * Single Responsibility: aggregate every domain command registrar. The
 * composition root calls exactly one function to wire all commands, keeping
 * extension.ts free of registration detail.
 */

import { registerAiCommands } from './aiCommands';
import { registerCollectionCommands } from './collectionCommands';
import { registerConsoleCommands } from './consoleCommands';
import { registerDiscoveryCommands } from './discoveryCommands';
import { registerEnvironmentCommands } from './environmentCommands';
import { registerGitHistoryCommands } from './gitHistoryCommands';
import { registerOpenApiCommands } from './openApiCommands';
import { registerRequestCommands } from './requestCommands';
import { registerTestSuiteCommands } from './testSuiteCommands';
import type { CommandContext } from './command-context';

/**
 * Register every HTTP Forge command. Call once from activate().
 */
export function registerAllCommands(ctx: CommandContext): void {
  registerCollectionCommands(ctx);
  registerRequestCommands(ctx);
  registerEnvironmentCommands(ctx);
  registerTestSuiteCommands(ctx);
  registerConsoleCommands(ctx);
  registerOpenApiCommands(ctx);
  registerGitHistoryCommands(ctx);
  registerAiCommands(ctx);
  registerDiscoveryCommands(ctx);
}
