/**
 * Git history commands.
 *
 * Single Responsibility: register commands that show request git history,
 * open a diff at a specific commit, and revert request.json to a commit.
 */

import * as vscode from 'vscode';
import { GitCommitTreeItem } from '../presentation/components/tree-providers/request-git-history-provider';
import { CollectionTreeItem } from '../presentation/components/tree-providers/collections-tree-provider';
import { COMMAND_IDS } from '../shared/constants';
import type { CommandContext } from './command-context';

export function registerGitHistoryCommands(ctx: CommandContext): void {
  const { context, workspaceFolder, requestGitHistoryProvider, collectionsTreeProvider } = ctx;

  // Show git history for a request in the sidebar tree
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.showRequestGitHistory, async (item: CollectionTreeItem) => {
      if (!item?.requestId || !item?.collectionId) return;

      const { resolveRequestJsonPath, getGitLog } = await import('../infrastructure/git/request-git-history');
      const filePath = resolveRequestJsonPath(workspaceFolder, item.collectionId, item.requestId);
      if (!filePath) {
        vscode.window.showErrorMessage(`HTTP Forge: Could not locate request.json for "${item.label}".`);
        return;
      }

      await requestGitHistoryProvider.showHistoryFor(String(item.label), () => getGitLog(filePath));
      // Reveal the history view
      await vscode.commands.executeCommand('httpForge.requestHistory.focus');
    })
  );

  // View diff at a specific commit (opens VS Code diff editor)
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.viewRequestGitDiff, async (item: GitCommitTreeItem) => {
      if (!item?.commit) return;

      const { getFileAtCommit } = await import('../infrastructure/git/request-git-history');
      const { hash, shortHash, message, absoluteFilePath } = item.commit;

      // Get the file content at this commit and its parent
      const [contentAtCommit, contentAtParent] = await Promise.all([
        getFileAtCommit(absoluteFilePath, hash),
        getFileAtCommit(absoluteFilePath, `${hash}~1`).catch(() => ''),
      ]);

      if (contentAtCommit === null) {
        vscode.window.showErrorMessage(`HTTP Forge: Could not retrieve file at commit ${shortHash}.`);
        return;
      }

      // Write temp files and open diff
      const scheme = 'httpForge-git-diff';
      const leftTitle = `${shortHash}~1 (before)`;
      const rightTitle = `${shortHash}: ${message}`;

      // Use VS Code's built-in git diff via virtual document provider
      const leftUri = vscode.Uri.parse(`${scheme}:${encodeURIComponent(leftTitle)}`).with({
        scheme: 'untitled',
      });

      // Fallback: write to temp files and open standard diff
      const tmpLeft = require('os').tmpdir() + `/hf-diff-before-${shortHash}.json`;
      const tmpRight = require('os').tmpdir() + `/hf-diff-after-${shortHash}.json`;
      require('fs').writeFileSync(tmpLeft, contentAtParent ?? '');
      require('fs').writeFileSync(tmpRight, contentAtCommit);

      await vscode.commands.executeCommand(
        'vscode.diff',
        vscode.Uri.file(tmpLeft),
        vscode.Uri.file(tmpRight),
        `${leftTitle} ↔ ${rightTitle}`
      );
    })
  );

  // Revert request.json to the selected commit
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.revertRequestToCommit, async (item: GitCommitTreeItem) => {
      if (!item?.commit) return;

      const { hash, shortHash, message, absoluteFilePath } = item.commit;
      const confirm = await vscode.window.showWarningMessage(
        `Revert request to commit ${shortHash} "${message}"?\n\nThis will overwrite the current request.json on disk.`,
        { modal: true },
        'Revert'
      );
      if (confirm !== 'Revert') return;

      const { revertFileToCommit } = await import('../infrastructure/git/request-git-history');
      try {
        await revertFileToCommit(absoluteFilePath, hash);
        vscode.window.showInformationMessage(`Request reverted to ${shortHash}.`);
        collectionsTreeProvider.refresh();
      } catch (err: unknown) {
        vscode.window.showErrorMessage(`Revert failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );
}
