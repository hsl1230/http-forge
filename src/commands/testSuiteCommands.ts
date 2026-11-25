/**
 * Test Suite commands.
 *
 * Single Responsibility: register every command that manages test suites
 * (create, open, run, rename, duplicate, delete, refresh).
 */

import type { TestSuite } from '@http-forge/core';
import * as vscode from 'vscode';
import { TestSuitePanel } from '../presentation/webview/panels/test-suite';
import { TestSuiteFolderTreeItem, TestSuiteTreeItem } from '../presentation/components/tree-providers/test-suites-tree-provider';
import { CoverageReportPanel } from '../presentation/webview/panels/coverage-report/coverage-report-panel';
import { COMMAND_IDS } from '../shared/constants';
import type { CommandContext } from './command-context';

/**
 * Build a virtual composite suite from multiple suites.
 * Each suite's nodes are wrapped in a block node named after the suite.
 * This reuses the existing TestSuitePanel rendering and run logic.
 */
function buildCompositeSuite(suites: TestSuite[], name: string): TestSuite {
    return {
        id: `composite-${Date.now()}`,
        name,
        nodes: suites.map(suite => ({
            type: 'block' as any,
            name: suite.name,
            nodes: (suite.nodes ?? []) as any[],
            enabled: true,
        })),
        config: {
            iterations: 1,
            delayBetweenRequests: 0,
            stopOnError: false,
            loadPersistedEnvironmentValues: false,
            usePersistentCookieJar: false,
            readFromSharedSession: false,
            writeToSharedSession: false,
        } as any,
        isTemporary: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}
export function registerTestSuiteCommands(ctx: CommandContext): void {
  const { context, testSuiteService, testSuitesTreeProvider, testSuitesView } = ctx;

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

  // Run All Suites in Folder
  context.subscriptions.push(
    vscode.commands.registerCommand('httpForge.runTestSuitesInFolder', async (item: TestSuiteFolderTreeItem) => {
      if (!item?.folderPath || !testSuiteService) return;
      const suiteIds = await testSuiteService.getSuiteIdsInFolder(item.folderPath);
      if (suiteIds.length === 0) {
        vscode.window.showInformationMessage('No test suites in this folder.');
        return;
      }
      // Build composite suite
      const suites = await Promise.all(suiteIds.map(id => testSuiteService.getSuite(id)));
      const validSuites = suites.filter(Boolean) as TestSuite[];
      const composite = buildCompositeSuite(validSuites, `Folder: ${item.folderName}`);
      TestSuitePanel.createOrShow(context.extensionUri, composite, testSuiteService);
    })
  );

  // Track the last known multi-selection so right-clicking a non-selected
  // item still includes all previously selected items.
  let lastSelection: TestSuiteTreeItem[] = [];
  if (testSuitesView) {
    context.subscriptions.push(
      testSuitesView.onDidChangeSelection(e => {
        lastSelection = (e.selection || []) as TestSuiteTreeItem[];
      })
    );
  }

  // Run Selected Test Suites
  context.subscriptions.push(
    vscode.commands.registerCommand('httpForge.runSelectedTestSuites', async (itemsOrItem: any) => {
      if (!testSuiteService) return;
      // VS Code passes only the right-clicked item. Use the tracked selection
      // (which preserves all multi-selected items even when right-clicking a
      // non-selected item) and merge with the passed item.
      const passedItems: TestSuiteTreeItem[] = Array.isArray(itemsOrItem)
        ? itemsOrItem
        : (itemsOrItem ? [itemsOrItem] : []);
      // Prefer the live view selection if it has more items than lastSelection
      let viewSelection: TestSuiteTreeItem[] = [];
      if (testSuitesView) {
        viewSelection = (testSuitesView.selection || []) as TestSuiteTreeItem[];
      }
      // Use whichever has more items (handles timing differences)
      const baseSelection = viewSelection.length >= lastSelection.length ? viewSelection : lastSelection;
      const allItems = [...passedItems, ...baseSelection];
      const seen = new Set<string>();
      const items: TestSuiteTreeItem[] = allItems.filter((i: any) => {
        const id = i?.suite?.id || i?.id;
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      if (items.length === 0) return;
      const suites = items
        .map((i: any) => (i?.suite ? i.suite : i))
        .filter(Boolean) as TestSuite[];
      if (suites.length === 0) return;
      const composite = buildCompositeSuite(suites, `Selected Suites (${suites.length})`);
      TestSuitePanel.createOrShow(context.extensionUri, composite, testSuiteService);
    })
  );

  // Run Test Suites via Quick-Pick (multi-select)
  context.subscriptions.push(
    vscode.commands.registerCommand('httpForge.runTestSuitesQuickPick', async () => {
      if (!testSuiteService) return;
      const suites = (await testSuiteService.getAllSuites()).filter(s => !s.isTemporary);
      if (suites.length === 0) {
        vscode.window.showInformationMessage('No test suites found.');
        return;
      }
      const items = suites.map(s => ({
        label: s.name,
        description: `${(s.nodes || []).filter((n: any) => n.type === 'request').length} requests`,
        suite: s,
        picked: false
      }));
      const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: 'Select test suites to run together',
        title: 'Run Test Suites'
      });
      if (!selected || selected.length === 0) return;
      const composite = buildCompositeSuite(selected.map(s => s.suite), `Selected Suites (${selected.length})`);
      TestSuitePanel.createOrShow(context.extensionUri, composite, testSuiteService);
    })
  );

  // Run All Test Suites
  context.subscriptions.push(
    vscode.commands.registerCommand('httpForge.runAllTestSuites', async () => {
      if (!testSuiteService) return;
      const suiteIds = await testSuiteService.getAllSuiteIds();
      if (suiteIds.length === 0) {
        vscode.window.showInformationMessage('No test suites found.');
        return;
      }
      const suites = await Promise.all(suiteIds.map(id => testSuiteService.getSuite(id)));
      const validSuites = suites.filter(Boolean) as TestSuite[];
      const composite = buildCompositeSuite(validSuites, 'All Test Suites');
      TestSuitePanel.createOrShow(context.extensionUri, composite, testSuiteService);
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

  // New Test Suite Folder
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.newTestSuiteFolder, async (item?: TestSuiteFolderTreeItem) => {
      if (!testSuiteService) return;
      // Title bar: item is undefined → root. Context on folder: use folder path.
      // Context on suite: use the suite's parent folder.
      let parentPath = '';
      if (item instanceof TestSuiteFolderTreeItem) {
        parentPath = item.folderPath;
      } else if (item && 'suite' in item) {
        parentPath = (item as any).suite?.folderPath || '';
      }
      const name = await vscode.window.showInputBox({
        prompt: 'Enter folder name',
        placeHolder: 'New Folder'
      });
      if (!name) return;
      const folderPath = parentPath ? `${parentPath}/${name}` : name;
      await testSuiteService.createFolder(folderPath);
      testSuitesTreeProvider.refresh();
      vscode.window.showInformationMessage(`Folder "${folderPath}" created`);
    })
  );

  // Rename Test Suite Folder
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.renameTestSuiteFolder, async (item: TestSuiteFolderTreeItem) => {
      if (!item?.folderPath || !testSuiteService) return;
      const newName = await vscode.window.showInputBox({
        prompt: 'Enter new folder name',
        value: item.folderName,
        placeHolder: 'Folder Name'
      });
      if (!newName || newName === item.folderName) return;
      const parts = item.folderPath.split('/');
      parts[parts.length - 1] = newName;
      const newPath = parts.join('/');
      await testSuiteService.renameFolder(item.folderPath, newPath);
      testSuitesTreeProvider.refresh();
      vscode.window.showInformationMessage(`Folder renamed to "${newName}"`);
    })
  );

  // Delete Test Suite Folder
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.deleteTestSuiteFolder, async (item: TestSuiteFolderTreeItem) => {
      if (!item?.folderPath || !testSuiteService) return;
      const choice = await vscode.window.showWarningMessage(
        `Delete folder "${item.folderName}"?`,
        { modal: true },
        'Move suites to parent',
        'Delete suites too'
      );
      if (!choice) return;
      const deleteSuites = choice === 'Delete suites too';
      await testSuiteService.deleteFolder(item.folderPath, deleteSuites);
      testSuitesTreeProvider.refresh();
      vscode.window.showInformationMessage(`Folder "${item.folderName}" deleted`);
    })
  );

  // Show Coverage Report
  context.subscriptions.push(
    vscode.commands.registerCommand('httpForge.showCoverageReport', async () => {
      if (!ctx.testSuiteService || !ctx.collectionService) return;
      CoverageReportPanel.createOrShow(ctx.context.extensionUri, ctx.collectionService, ctx.testSuiteService);
    })
  );
}
