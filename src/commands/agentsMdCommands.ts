/**
 * AI agent guide commands.
 *
 * Single Responsibility: register the opt-in refresh for the versioned
 * `.http-forge/AGENTS.md` guide plus the one-time stale notice shown at
 * activation. Status detection and backup-before-replace live in
 * `@http-forge/core` (`agents-md`); this module only wires VS Code UI.
 */

import { getAgentsMdStatus, refreshAgentsMd } from '@http-forge/core';
import * as path from 'path';
import * as vscode from 'vscode';
import { COMMAND_IDS } from '../shared/constants';
import type { CommandContext } from './command-context';

function forgeDirOf(ctx: Pick<CommandContext, 'workspaceFolder'>): string {
    return path.join(ctx.workspaceFolder, '.http-forge');
}

export function registerAgentsMdCommands(ctx: CommandContext): void {
    const { context } = ctx;

    // Refresh AI Agent Guide (opt-in; backs up the current file first)
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMAND_IDS.refreshAgentsMd, async () => {
            const forgeDir = forgeDirOf(ctx);
            const status = getAgentsMdStatus(forgeDir);

            if (!status.exists) {
                const result = refreshAgentsMd(forgeDir);
                vscode.window.showInformationMessage(
                    `Created .http-forge/AGENTS.md (v${result.version}).`
                );
                return;
            }

            if (!status.stale) {
                vscode.window.showInformationMessage(
                    `.http-forge/AGENTS.md is up to date (v${status.currentVersion}).`
                );
                return;
            }

            const choice = await vscode.window.showWarningMessage(
                `.http-forge/AGENTS.md is outdated (v${status.currentVersion} → v${status.latestVersion}). Refresh it? The current file will be backed up to AGENTS.md.bak.`,
                { modal: true },
                'Refresh'
            );
            if (choice !== 'Refresh') {
                return;
            }
            const result = refreshAgentsMd(forgeDir);
            vscode.window.showInformationMessage(
                `Refreshed .http-forge/AGENTS.md (v${result.previousVersion} → v${result.version}). Previous version backed up to AGENTS.md.bak.`
            );
        })
    );
}

/**
 * Show a one-time stale notice at activation. Never writes without consent —
 * the Refresh action routes through the command above.
 */
export async function notifyIfAgentsMdStale(
    ctx: Pick<CommandContext, 'workspaceFolder' | 'context'>
): Promise<void> {
    let status;
    try {
        status = getAgentsMdStatus(forgeDirOf(ctx));
    } catch {
        return;
    }
    if (!status.exists || !status.stale) {
        return;
    }
    const choice = await vscode.window.showWarningMessage(
        `HTTP Forge AI agent guide is outdated (v${status.currentVersion} → v${status.latestVersion}). Refresh it? Your current file is backed up to AGENTS.md.bak.`,
        'Refresh',
        'Later'
    );
    if (choice === 'Refresh') {
        await vscode.commands.executeCommand(COMMAND_IDS.refreshAgentsMd);
    }
}
