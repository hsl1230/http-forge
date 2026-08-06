/**
 * Test Suite commands.
 *
 * Single Responsibility: register every command that manages test suites
 * (create, open, run, rename, duplicate, delete, refresh).
 */

import type { TestSuite } from '@http-forge/core';
import * as vscode from 'vscode';
import { TestSuitePanel } from '../presentation/webview/panels/test-suite';
import { TestSuiteTreeItem } from '../presentation/components/tree-providers/test-suites-tree-provider';
import { COMMAND_IDS } from '../shared/constants';
import type { CommandContext } from './command-context';

export function registerTestSuiteCommands(ctx: CommandContext): void {
  const { context, testSuiteService, testSuitesTreeProvider } = ctx;

  // Refresh Test Suites
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.refreshTestSuites, () => {
      testSuitesTreeProvider.refresh();
    })
  );

  // New Test Suite
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.newTestSuite, async () => {
      const name = await vscode.window.showInputBox({
        prompt: 'Enter test suite name',
        placeHolder: 'My Test Suite'
      });
      if (name && testSuiteService) {
        const suite = await testSuiteService.createSuite(name);
        testSuitesTreeProvider.refresh();
        // Open the newly created suite
        TestSuitePanel.createOrShow(context.extensionUri, suite, testSuiteService);
        vscode.window.showInformationMessage(`Test Suite "${name}" created`);
      }
    })
  );

  // Open Test Suite
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.openTestSuite, async (suite: TestSuite) => {
      if (suite && testSuiteService) {
        TestSuitePanel.createOrShow(context.extensionUri, suite, testSuiteService);
      }
    })
  );

  // Run Test Suite (from tree view context menu)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.runTestSuite, async (item: TestSuiteTreeItem) => {
      if (item?.suite && testSuiteService) {
        TestSuitePanel.createOrShow(context.extensionUri, item.suite, testSuiteService);
        // Auto-start run could be triggered here if needed
      }
    })
  );

  // Delete Test Suite
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.deleteTestSuite, async (item: TestSuiteTreeItem) => {
      if (!item?.suite || !testSuiteService) return;

      const confirm = await vscode.window.showWarningMessage(
        `Delete test suite "${item.suite.name}"?`,
        { modal: true },
        'Delete'
      );

      if (confirm === 'Delete') {
        await testSuiteService.deleteSuite(item.suite.id);
        testSuitesTreeProvider.refresh();
        vscode.window.showInformationMessage('Test Suite deleted');
      }
    })
  );

  // Rename Test Suite
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.renameTestSuite, async (item: TestSuiteTreeItem) => {
      if (!item?.suite || !testSuiteService) return;

      const newName = await vscode.window.showInputBox({
        prompt: 'Enter new name for test suite',
        value: item.suite.name,
        placeHolder: 'Test Suite Name'
      });

      if (newName && newName !== item.suite.name) {
        const updatedSuite = { ...item.suite, name: newName };
        await testSuiteService.updateSuite(updatedSuite);
        testSuitesTreeProvider.refresh();
      }
    })
  );

  // Duplicate Test Suite
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.duplicateTestSuite, async (item: TestSuiteTreeItem) => {
      if (!item?.suite || !testSuiteService) return;

      const newName = await vscode.window.showInputBox({
        prompt: 'Enter name for the duplicated test suite',
        value: `${item.suite.name} (Copy)`
      });

      if (newName) {
        await testSuiteService.duplicateSuite(item.suite.id, newName);
        testSuitesTreeProvider.refresh();
        vscode.window.showInformationMessage(`Test Suite "${newName}" created`);
      }
    })
  );
}
