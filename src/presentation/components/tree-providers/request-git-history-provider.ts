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
    implements vscode.TreeDataProvider<GitCommitTreeItem>
{
    private _onDidChangeTreeData = new vscode.EventEmitter<void | GitCommitTreeItem | null | undefined>();
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
        this._onDidChangeTreeData.fire();

        try {
            this.commits = await loader();
            if (this.commits.length === 0) {
                this.loadingError = `No git history found for "${requestLabel}". Make sure the workspace is a Git repository.`;
            }
        } catch (err) {
            this.loadingError = `Failed to load history: ${(err as Error).message}`;
        }

        this._onDidChangeTreeData.fire();
    }

    /** Clear the history panel (e.g. when no request is selected). */
    clear(): void {
        this.commits = [];
        this.requestLabel = '';
        this.loadingError = null;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: GitCommitTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): GitCommitTreeItem[] {
        if (this.loadingError !== null) {
            const item = new vscode.TreeItem(this.loadingError);
            item.iconPath = new vscode.ThemeIcon('warning');
            // We can't return a mixed list easily, so return the error commit-like item
            // by wrapping in a fake entry
            return [];
        }
        return this.commits.map((c) => new GitCommitTreeItem(c));
    }
}
