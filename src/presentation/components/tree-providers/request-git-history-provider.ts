/**
 * Request Git History Tree Provider
 *
 * Displays the git commit history for a selected request's request.json file.
 * Each entry shows the commit hash, author, date, and message.
 */

import * as vscode from 'vscode';
import type { GitCommitEntry } from '../../../infrastructure/git/request-git-history';
import { COMMAND_IDS } from '../../../shared/constants';

// ── Tree item ─────────────────────────────────────────────────────────────────

export class GitCommitTreeItem extends vscode.TreeItem {
    constructor(public readonly commit: GitCommitEntry) {
        super(
            `${commit.shortHash}  ${commit.message}`,
            vscode.TreeItemCollapsibleState.None
        );

        this.contextValue = 'gitCommit';
        this.description = `${commit.author} · ${new Date(commit.date).toLocaleDateString()}`;
        this.tooltip = new vscode.MarkdownString(
            `**${commit.shortHash}** ${commit.message}\n\n` +
            `- Author: ${commit.author}\n` +
            `- Date: ${commit.date}\n\n` +
            `File: \`${commit.relativeFilePath}\``
        );
        this.iconPath = new vscode.ThemeIcon('git-commit');

        // Default click: open diff in VS Code
        this.command = {
            command: COMMAND_IDS.viewRequestGitDiff,
            title: 'View Diff',
            arguments: [this],
        };
    }
}

// ── Tree provider ─────────────────────────────────────────────────────────────

export class RequestGitHistoryProvider
    implements vscode.TreeDataProvider<vscode.TreeItem>
{
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private commits: GitCommitEntry[] = [];
    private loadingError: string | null = null;
    private requestLabel = '';

    /** Called by the extension when the user selects a request to show history for. */
    async showHistoryFor(
        requestLabel: string,
        loader: () => Promise<GitCommitEntry[]>
    ): Promise<void> {
        this.requestLabel = requestLabel;
        this.loadingError = null;
        this.commits = [];
        this._onDidChangeTreeData.fire(undefined);

        try {
            this.commits = await loader();
            if (this.commits.length === 0) {
                this.loadingError = `No git history found for "${requestLabel}". Make sure the workspace is a Git repository.`;
            }
        } catch (err) {
            this.loadingError = `Failed to load history: ${(err as Error).message}`;
        }

        this._onDidChangeTreeData.fire(undefined);
    }

    /** Clear the history panel (e.g. when no request is selected). */
    clear(): void {
        this.commits = [];
        this.requestLabel = '';
        this.loadingError = null;
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): vscode.TreeItem[] {
        if (this.loadingError !== null) {
            const errorItem = new vscode.TreeItem(this.loadingError, vscode.TreeItemCollapsibleState.None);
            errorItem.iconPath = new vscode.ThemeIcon('warning');
            return [errorItem];
        }

        if (this.requestLabel && this.commits.length === 0) {
            const emptyItem = new vscode.TreeItem(`No git history found for "${this.requestLabel}".`, vscode.TreeItemCollapsibleState.None);
            emptyItem.iconPath = new vscode.ThemeIcon('info');
            emptyItem.contextValue = 'gitHistoryPlaceholder';
            return [emptyItem];
        }

        return this.commits.map((c) => new GitCommitTreeItem(c));
    }
}
