/**
 * API discovery commands.
 *
 * Single Responsibility: register the "Discover APIs" command that scans the
 * workspace and populates the Discovered APIs tree view.
 */

import * as vscode from 'vscode';
import { COMMAND_IDS } from '../shared/constants';
import type { CommandContext } from './command-context';

export function registerDiscoveryCommands(ctx: CommandContext): void {
  const { context, discoveredApisTreeProvider } = ctx;

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.discoverApis, async () => {
      await discoveredApisTreeProvider.scan();
    })
  );
}
