import type { CollectionService } from '@http-forge/core';
import * as vscode from 'vscode';
import { getServiceContainer } from '../../src/infrastructure/services/service-container';

// Template for adding a new http-forge command
export const COMMAND_ID = 'httpForge.sampleCommand';

export async function runSampleCommand(context: vscode.ExtensionContext) {
  try {
    const container = getServiceContainer();
    const collectionService = container.collection as unknown as CollectionService;

    if (collectionService) {
      vscode.window.showInformationMessage('Sample command completed');
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Sample command failed: ${message}`);
  }
}

// To register the command: add to registerCommands() in src/extension.ts
// context.subscriptions.push(vscode.commands.registerCommand(COMMAND_ID, () => runSampleCommand(context)));
