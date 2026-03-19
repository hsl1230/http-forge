import { type HistoryEntry, IEnvironmentConfigService, type IRequestHistoryService } from '@http-forge/core';
import * as vscode from 'vscode';
import { COMMAND_IDS } from '../../../../../shared/constants';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { HistoryUIEntry, IPanelContextProvider } from '../interfaces';

/**
 * Handles environment-related webview messages
 * Single Responsibility: Only manages environment changes and data
 */
export class EnvironmentSelectionHandler implements IMessageHandler {
  constructor(
    private envConfigService: IEnvironmentConfigService,
    private historyService: IRequestHistoryService,
    private contextProvider: IPanelContextProvider
  ) {}

  getSupportedCommands(): string[] {
    return ['changeEnvironment', 'openEnvironmentEditor'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    switch (command) {
      case 'changeEnvironment':
        await this.handleChangeEnvironment(message.environment, messenger);
        return true;

      case 'openEnvironmentEditor':
        // Pass the selected environment to focus on it in the editor
        const selectedEnv = message.environment || this.envConfigService.getSelectedEnvironment();
        await vscode.commands.executeCommand(COMMAND_IDS.editEnvironments, selectedEnv);
        return true;

      default:
        return false;
    }
  }

  /**
   * Handle environment change and notify webview (can be called externally)
   */
  public async handleEnvironmentChanged(environment: string, messenger: IWebviewMessenger): Promise<void> {
    await this.handleChangeEnvironment(environment, messenger);
  }

  /**
   * Get environment data for webview initialization
   */
  getEnvironmentData() {
    const selectedEnv = this.envConfigService.getSelectedEnvironment();
    const resolvedEnv = this.envConfigService.getResolvedEnvironment(selectedEnv);
    const globalVariables = this.envConfigService.getGlobalVariables();
    const sessionVariables = this.envConfigService.getSessionVariables();

    return {
      selectedEnvironment: selectedEnv,
      resolvedEnvironment: resolvedEnv,
      globalVariables,
      sessionVariables
    };
  }

  private async handleChangeEnvironment(environment: string, messenger: IWebviewMessenger): Promise<void> {
    await this.envConfigService.setSelectedEnvironment(environment);
    const resolvedEnv = this.envConfigService.getResolvedEnvironment(environment);

    const historyPath = this.contextProvider.getHistoryStoragePath();
    let history: HistoryUIEntry[] = [];
    if (historyPath) {
      history = this.getHistoryForUI(historyPath.environment, historyPath.requestPath, historyPath.requestId);
    }

    messenger.postMessage({
      command: 'environmentChanged',
      data: {
        selectedEnvironment: environment,
        resolvedEnvironment: resolvedEnv,
        history
      }
    });
  }

  /**
   * Get history entries formatted for UI display
   */
  getHistoryForUI(environment: string, storagePath: string, endpointId: string): HistoryUIEntry[] {
    const context = this.contextProvider.getCurrentContext();
    const currentBranch = context?.group?.branch || '';
    const localGrouped = this.historyService.getEntriesGroupedByTicket(environment, storagePath, endpointId);
    const sharedGrouped = this.historyService.getSharedEntriesGroupedByTicket(environment, storagePath, endpointId);

    const sharedGroups = this.buildHistoryGroups(sharedGrouped, currentBranch, true);
    const localGroups = this.buildHistoryGroups(localGrouped, currentBranch, false);
    const result = [...sharedGroups, ...localGroups];

    result.sort((a, b) => {
      if (a.isShared && !b.isShared) return -1;
      if (!a.isShared && b.isShared) return 1;
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      const aTime = a.entries[0]?.timestamp || 0;
      const bTime = b.entries[0]?.timestamp || 0;
      return bTime - aTime;
    });

    return result;
  }

  private buildHistoryGroups(
    grouped: Map<string, HistoryEntry[]>,
    currentBranch: string,
    isShared: boolean
  ): HistoryUIEntry[] {
    const result: HistoryUIEntry[] = [];

    for (const [key, entries] of grouped) {
      const sortedEntries = [...entries].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const ticket = sortedEntries[0]?.ticket || null;
      const branch = sortedEntries[0]?.branch || key;

      // If branch is "unknown", group entries by year-month instead
      if (branch === 'unknown' && !ticket) {
        const byYearMonth = new Map<string, typeof sortedEntries>();

        for (const entry of sortedEntries) {
          const date = new Date(entry.timestamp || Date.now());
          const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!byYearMonth.has(yearMonth)) {
            byYearMonth.set(yearMonth, []);
          }
          byYearMonth.get(yearMonth)!.push(entry);
        }

        // Create a group for each year-month
        for (const [yearMonth, monthEntries] of byYearMonth) {
          const [year, month] = yearMonth.split('-');
          const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'short' });
          result.push({
            ticket: null,
            branch: `${monthName} ${year}`,
            isCurrent: false,
            isShared,
            entries: monthEntries
          });
        }
      } else {
        result.push({
          ticket,
          branch,
          isCurrent: !isShared && branch === currentBranch,
          isShared,
          entries: sortedEntries
        });
      }
    }

    return result;
  }
}
