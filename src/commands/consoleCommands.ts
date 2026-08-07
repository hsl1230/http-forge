/**
 * Console commands.
 *
 * Single Responsibility: register commands that surface the HTTP Forge
 * console output channel (show / clear).
 */

import * as vscode from 'vscode';
import { COMMAND_IDS } from '../shared/constants';
import type { CommandContext } from './command-context';

export function registerConsoleCommands(ctx: CommandContext): void {
  const { context, container } = ctx;

  // Show Console
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.showConsole, () => {
      container.console.show();
    })
  );

  // Clear Console
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.clearConsole, () => {
      container.console.clear();
    })
  );
}
