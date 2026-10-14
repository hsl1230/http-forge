/**
 * Environment commands.
 *
 * Single Responsibility: register every command that manages environments
 * (create, delete, duplicate, rename, select, edit, import).
 */

import * as vscode from 'vscode';
import { EnvironmentEditorPanel } from '../presentation/webview/panels/environment-editor';
import { EnvironmentTreeItem } from '../presentation/components/tree-providers/environments-tree-provider';
import { RequestTesterPanelManager } from '../presentation/webview/panels/request-tester/request-tester-panel-manager';
import { TestSuitePanel } from '../presentation/webview/panels/test-suite';
import { COMMAND_IDS } from '../shared/constants';
import type { CommandContext } from './command-context';

export function registerEnvironmentCommands(ctx: CommandContext): void {
  const { context, envConfigService, environmentsTreeProvider } = ctx;

  // Refresh Environments
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.refreshEnvironments, () => {
      environmentsTreeProvider.refresh();
    })
  );

  // New Environment
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.newEnvironment, async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter environment name',
        placeHolder: 'production'
      });
      if (name) {
        try {
          await envConfigService.createEnvironment(name);
          environmentsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Environment "${name}" created`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to create environment: ${message}`);
        }
      }
    })
  );

  // Delete Environment
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.deleteEnvironment, async (item: EnvironmentTreeItem) => {
      if (!item?.environmentId) return;

      const confirm = await vscode.window.showWarningMessage(
        `Delete environment "${item.label}"?`,
        { modal: true },
        'Delete'
      );

      if (confirm === 'Delete') {
        try {
          await envConfigService.deleteEnvironment(item.environmentId);
          environmentsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Environment "${item.label}" deleted`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to delete environment: ${message}`);
        }
      }
    })
  );

  // Duplicate Environment
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.duplicateEnvironment, async (item: EnvironmentTreeItem) => {
      if (!item?.environmentId) return;

      const newName = await vscode.window.showInputBox({
        prompt: 'Enter name for duplicated environment',
        placeHolder: `${item.environmentId}-copy`
      });

      if (newName) {
        try {
          await envConfigService.duplicateEnvironment(item.environmentId, newName);
          environmentsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Environment duplicated as "${newName}"`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to duplicate environment: ${message}`);
        }
      }
    })
  );

  // Rename Environment
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.renameEnvironment, async (item: EnvironmentTreeItem) => {
      if (!item?.environmentId) return;

      const newName = await vscode.window.showInputBox({
        prompt: 'Enter new name for environment',
        value: item.environmentId,
        valueSelection: [0, item.environmentId.length]
      });

      if (newName && newName !== item.environmentId) {
        try {
          await envConfigService.renameEnvironment(item.environmentId, newName);
          environmentsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Environment renamed to "${newName}"`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to rename environment: ${message}`);
        }
      }
    })
  );

  // Select Environment
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.selectEnvironment, async (item: EnvironmentTreeItem) => {
      if (item?.environmentId) {
        await envConfigService.setSelectedEnvironment(item.environmentId);
        environmentsTreeProvider.refresh();
        // Notify all open request panels of the environment change
        RequestTesterPanelManager.getInstance().notifyEnvironmentChange(item.environmentId);
        // Notify Test Suite panel of the environment change
        if (TestSuitePanel.currentPanel) {
          TestSuitePanel.currentPanel.notifyEnvironmentChange(item.environmentId);
        }
      }
    })
  );

  // Edit All Environments (command palette)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.editEnvironments, (selectedEnv?: string) => {
      EnvironmentEditorPanel.show(context.extensionUri, selectedEnv);
    })
  );

  // Edit single environment from tree view context menu
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.editEnvironment, (item: EnvironmentTreeItem) => {
      EnvironmentEditorPanel.show(context.extensionUri, item?.environmentId);
    })
  );

  // Reset Environment Current Values (drop pm.environment.set() session overrides)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.resetEnvironmentOverrides, async (item?: EnvironmentTreeItem) => {
      const names = envConfigService.getEnvironmentNames();
      if (names.length === 0) {
        vscode.window.showWarningMessage('No environments found.');
        return;
      }
      // Invoked from the tree: reset that environment after confirm.
      // Invoked from the palette: offer the active environment first.
      const active = envConfigService.getSelectedEnvironment();
      const ordered = [...names].sort((a, b) =>
        a === (item?.environmentId ?? active) ? -1 : b === (item?.environmentId ?? active) ? 1 : 0
      );
      const picked = item?.environmentId ?? await vscode.window.showQuickPick(ordered, {
        placeHolder: 'Select environment to reset script-set values for'
      });
      if (!picked || !names.includes(picked)) {
        return;
      }
      const confirm = await vscode.window.showWarningMessage(
        `Reset script-set values for environment "${picked}"? File values will apply again.`,
        { modal: true },
        'Reset'
      );
      if (confirm !== 'Reset') {
        return;
      }
      await envConfigService.resetEnvironmentOverrides(picked);
      environmentsTreeProvider.refresh();
      vscode.window.showInformationMessage(`Reset script-set values for environment "${picked}".`);
    })
  );

  // Import Postman environment (view title button)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.importPostmanEnvironment, async () => {
      const fileUri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'JSON Files': ['json']
        },
        title: 'Import Environment'
      });

      if (fileUri?.[0]) {
        try {
          const importedEnv = envConfigService.importPostmanEnvironmentFile(fileUri[0].fsPath);
          environmentsTreeProvider.refresh();
          vscode.window.showInformationMessage(`Imported environment "${importedEnv?.name || fileUri[0].fsPath}"`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Failed to import environment: ${message}`);
        }
      }
    })
  );
}
