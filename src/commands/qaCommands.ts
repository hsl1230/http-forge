/**
 * QA Check commands.
 *
 * Single Responsibility: register the one-shot "QA Check API" command that
 * runs the core discover → generate → run → report pipeline inside VS Code —
 * prompts for target inputs, executes with progress, then presents the report
 * in an output channel with a pass/fail summary.
 *
 * All QA logic lives in @http-forge/core (`runQaCheck`). This file is a thin
 * VS Code adapter: prompt collection + result presentation only.
 */

import { renderQaReportTable, runQaCheck } from '@http-forge/core';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CopilotAiProvider } from '../infrastructure/copilot-ai-provider';
import { COMMAND_IDS } from '../shared/constants';
import type { CommandContext } from './command-context';

export function registerQaCommands(ctx: CommandContext): void {
  const {
    context,
    container,
    collectionService,
    envConfigService,
    configService,
    testSuiteService,
    collectionsTreeProvider,
    testSuitesTreeProvider,
    workspaceFolder,
  } = ctx;
  void container;

  const output = vscode.window.createOutputChannel('HTTP Forge QA');

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.qaCheck, async () => {
      const collections = collectionService.getAllCollections();
      if (collections.length === 0) {
        void vscode.window.showErrorMessage(
          'No collections found. Create a collection first, then run QA Check.'
        );
        return;
      }

      const collectionPick = await vscode.window.showQuickPick(
        collections.map((c) => ({ label: c.name, description: c.id })),
        { placeHolder: 'Target collection for QA-generated requests', ignoreFocusOut: true }
      );
      if (!collectionPick) return;

      const projectPath = await vscode.window.showInputBox({
        prompt: 'Backend project root to scan',
        value: workspaceFolder,
        ignoreFocusOut: true,
      });
      if (projectPath === undefined) return;

      const baseUrl = await vscode.window.showInputBox({
        prompt: 'Running server base URL (leave empty for a dry-run plan)',
        placeHolder: 'http://localhost:3000',
        ignoreFocusOut: true,
      });
      if (baseUrl === undefined) return;
      const dryRun = baseUrl.trim().length === 0;

      const environments = envConfigService.getAllEnvironments();
      const selected = envConfigService.getSelectedEnvironment();
      const envPick = await vscode.window.showQuickPick(
        environments.map((e) => ({
          label: e.name + (e.name === selected ? ' (selected)' : ''),
          description: e.name,
        })),
        { placeHolder: 'Environment for variable resolution', ignoreFocusOut: true }
      );
      if (envPick === undefined) return;
      const environment = envPick?.description;

      const aiPick = await vscode.window.showQuickPick(['No', 'Yes'], {
        placeHolder: 'Propose AI-written assertions after the run? (needs Copilot)',
        ignoreFocusOut: true,
      });
      if (!aiPick) return;
      const aiAssertions = aiPick === 'Yes';

      try {
        const report = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: dryRun ? 'QA Check: discovering…' : 'QA Check: discovering, generating, running…',
            cancellable: false,
          },
          () =>
            runQaCheck(
              { collection: collectionService, testSuite: testSuiteService, config: configService },
              workspaceFolder,
              {
                projectPath: projectPath.trim() || workspaceFolder,
                collectionRef: collectionPick.description ?? collectionPick.label,
                baseUrl: dryRun ? undefined : baseUrl.trim().replace(/\/+$/, ''),
                environment,
                dryRun,
                aiAssertions,
                aiProvider: aiAssertions ? new CopilotAiProvider() : undefined,
              }
            )
        );

        collectionsTreeProvider.refresh();
        testSuitesTreeProvider.refresh();

        const table = renderQaReportTable(report);
        output.clear();
        output.appendLine(table);
        output.show(true);

        const summary =
          report.status === 'pass'
            ? `QA passed: ${report.results.passed}/${report.discovered} endpoints green.`
            : report.status === 'fail'
              ? `QA failed: ${report.results.failed}/${report.discovered} endpoints red. See HTTP Forge QA output.`
              : report.status === 'drift'
                ? `QA blocked: project drifted (${report.drift.reason ?? 'changed since stored scan'}).`
                : `QA dry-run: ${report.discovered} endpoints, ${report.created} to create — re-run with a base URL to execute.`;
        if (report.status === 'pass' || report.status === 'dry-run') {
          const save = await vscode.window.showInformationMessage(
            summary,
            ...(report.status === 'pass' ? ['Save report'] : [])
          );
          if (save === 'Save report') {
            const uri = await vscode.window.showSaveDialog({
              defaultUri: vscode.Uri.file(path.join(workspaceFolder, 'qa-report.json')),
              filters: { JSON: ['json'] },
            });
            if (uri) {
              await fs.promises.writeFile(uri.fsPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
              void vscode.window.showInformationMessage(`QA report saved to ${uri.fsPath}`);
            }
          }
        } else {
          void vscode.window.showErrorMessage(summary);
        }
      } catch (error) {
        void vscode.window.showErrorMessage(`QA Check failed: ${(error as Error).message}`);
      }
    })
  );
}
