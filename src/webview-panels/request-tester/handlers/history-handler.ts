import { IEnvironmentConfigService, type IRequestHistoryService } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';
import { IPanelContextProvider } from '../interfaces';
import { EnvironmentSelectionHandler } from './environment-handler';

/**
 * Handles request history operations
 * Single Responsibility: Only manages history retrieval and manipulation
 */
export class HistoryHandler implements IMessageHandler {
  constructor(
    private historyService: IRequestHistoryService,
    private envConfigService: IEnvironmentConfigService,
    private contextProvider: IPanelContextProvider,
    private environmentHandler: EnvironmentSelectionHandler
  ) {}

  getSupportedCommands(): string[] {
    return [
      'useHistoryEntry',
      'deleteHistoryEntry',
      'requestShareHistoryEntry',
      'shareHistoryEntry',
      'requestRenameSharedGroup',
      'requestMoveSharedHistoryEntry'
    ];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    switch (command) {
      case 'useHistoryEntry':
        await this.handleUseHistoryEntry(message.entryId, messenger, message.isShared);
        return true;

      case 'deleteHistoryEntry':
        await this.handleDeleteHistoryEntry(message.entryId, messenger, message.isShared);
        return true;

      case 'requestShareHistoryEntry':
        await this.handleRequestShareHistoryEntry(message.entryId, messenger);
        return true;

      case 'shareHistoryEntry':
        await this.handleShareHistoryEntry(message.entryId, message.tag, messenger);
        return true;

      case 'requestRenameSharedGroup':
        await this.handleRequestRenameSharedGroup(message.tag, messenger);
        return true;

      case 'requestMoveSharedHistoryEntry':
        await this.handleRequestMoveSharedHistoryEntry(message.entryId, messenger);
        return true;

      default:
        return false;
    }
  }

  private async handleRequestRenameSharedGroup(tag: string, messenger: IWebviewMessenger): Promise<void> {
    const historyPath = this.contextProvider.getHistoryStoragePath();
    if (!historyPath || !tag) {
      return;
    }

    const newTag = await vscode.window.showInputBox({
      title: 'Rename shared group',
      prompt: 'Enter new shared group name',
      value: tag,
      placeHolder: 'tag-name',
      ignoreFocusOut: true
    });

    if (!newTag || !newTag.trim() || newTag.trim() === tag) {
      return;
    }

    this.historyService.renameSharedGroup(
      historyPath.environment,
      historyPath.requestPath,
      historyPath.requestId,
      tag,
      newTag.trim()
    );

    const history = this.environmentHandler.getHistoryForUI(
      historyPath.environment,
      historyPath.requestPath,
      historyPath.requestId
    );

    messenger.postMessage({
      command: 'historyUpdated',
      data: { history }
    });
  }

  private async handleRequestShareHistoryEntry(entryId: string, messenger: IWebviewMessenger): Promise<void> {
    const historyPath = this.contextProvider.getHistoryStoragePath();
    if (!historyPath) {
      return;
    }

    const tag = await vscode.window.showInputBox({
      title: 'Share history entry',
      prompt: 'Enter tag/group name for shared history',
      placeHolder: 'tag-name',
      ignoreFocusOut: true
    });

    if (!tag || !tag.trim()) {
      return;
    }

    await this.handleShareHistoryEntry(entryId, tag.trim(), messenger);
  }

  private async handleRequestMoveSharedHistoryEntry(entryId: string, messenger: IWebviewMessenger): Promise<void> {
    const historyPath = this.contextProvider.getHistoryStoragePath();
    if (!historyPath) {
      return;
    }

    const tag = await vscode.window.showInputBox({
      title: 'Move shared history entry',
      prompt: 'Enter new shared group name',
      placeHolder: 'tag-name',
      ignoreFocusOut: true
    });

    if (!tag || !tag.trim()) {
      return;
    }

    this.historyService.moveSharedEntry(
      historyPath.environment,
      historyPath.requestPath,
      historyPath.requestId,
      entryId,
      tag.trim()
    );

    const history = this.environmentHandler.getHistoryForUI(
      historyPath.environment,
      historyPath.requestPath,
      historyPath.requestId
    );

    messenger.postMessage({
      command: 'historyUpdated',
      data: { history }
    });
  }

  private async handleShareHistoryEntry(entryId: string, tag: string, messenger: IWebviewMessenger): Promise<void> {
    const historyPath = this.contextProvider.getHistoryStoragePath();
    if (!historyPath || !tag) {
      return;
    }

    this.historyService.shareEntry(
      historyPath.environment,
      historyPath.requestPath,
      historyPath.requestId,
      entryId,
      tag
    );

    const history = this.environmentHandler.getHistoryForUI(
      historyPath.environment,
      historyPath.requestPath,
      historyPath.requestId
    );

    messenger.postMessage({
      command: 'historyUpdated',
      data: { history }
    });
  }

  private async handleUseHistoryEntry(entryId: string, messenger: IWebviewMessenger, isShared?: boolean): Promise<void> {
    const historyPath = this.contextProvider.getHistoryStoragePath();
    if (!historyPath) {
      return;
    }

    let history;
    if (isShared) {
      history = this.historyService.loadSharedHistory(historyPath.environment, historyPath.requestPath, historyPath.requestId);
    } else {
      history = this.historyService.loadHistory(historyPath.environment, historyPath.requestPath, historyPath.requestId);
    }
    const entry = history?.requests.find((e: { id: string }) => e.id === entryId);

    if (entry) {
      const fullResponse = isShared
        ? this.historyService.loadSharedFullResponse(
            historyPath.environment,
            historyPath.requestPath,
            historyPath.requestId,
            entry.id
          )
        : this.historyService.loadFullResponse(
            historyPath.environment,
            historyPath.requestPath,
            historyPath.requestId,
            entry.id
          );

      messenger.postMessage({
        command: 'applyHistoryEntry',
        data: entry,
        fullResponse
      });
    }
  }

  private async handleDeleteHistoryEntry(entryId: string, messenger: IWebviewMessenger, isShared?: boolean): Promise<void> {
    const historyPath = this.contextProvider.getHistoryStoragePath();
    if (!historyPath) {
      return;
    }

    if (isShared) {
      this.historyService.deleteSharedEntry(historyPath.environment, historyPath.requestPath, historyPath.requestId, entryId);
    } else {
      this.historyService.deleteEntry(historyPath.environment, historyPath.requestPath, historyPath.requestId, entryId);
    }

    const history = this.environmentHandler.getHistoryForUI(
      historyPath.environment,
      historyPath.requestPath,
      historyPath.requestId
    );

    messenger.postMessage({
      command: 'historyUpdated',
      data: { history }
    });
  }
}
