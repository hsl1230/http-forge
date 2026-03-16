import { ICollectionService, IEnvironmentConfigService } from '@http-forge/core';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';
import { IPanelContextProvider, VariableChange } from '../interfaces';

/**
 * Handles variable management (global, environment, collection, session)
 * Single Responsibility: Only manages variable CRUD operations
 */
export class VariableHandler implements IMessageHandler {
  constructor(
    private envConfigService: IEnvironmentConfigService,
    private contextProvider: IPanelContextProvider,
    private collectionService: ICollectionService
  ) {}

  getSupportedCommands(): string[] {
    return ['variableChange'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    if (command === 'variableChange') {
      await this.handleVariableChange(message.change);
      return true;
    }
    return false;
  }

  /**
   * Get collection variables for a collection
   */
  getCollectionVariables(collectionId: string): Record<string, string> {
    const collection = this.collectionService.getCollection(collectionId);
    if (!collection) {
      // For virtual collections, just return local values
      return this.collectionService.getCollectionVariableLocals(collectionId);
    }
    return {
      ...(collection.variables || {}),
      ...this.collectionService.getCollectionVariableLocals(collectionId)
    };
  }

  private async handleVariableChange(change: VariableChange): Promise<void> {
    try {
      switch (change.type) {
        case 'global':
          this.handleGlobalVariableChange(change);
          break;
        case 'environment':
          this.handleEnvironmentVariableChange(change);
          break;
        case 'collection':
          this.handleCollectionVariableChange(change);
          break;
        case 'session':
          await this.handleSessionVariableChange(change);
          break;
      }
    } catch (error) {
      console.error(`[VariableHandler] Failed to handle variable change:`, error);
    }
  }

  private handleGlobalVariableChange(change: VariableChange): void {
    switch (change.action) {
      case 'set':
        if (change.key) {
          this.envConfigService.setGlobalVariable(change.key, change.value);
        }
        break;
      case 'unset':
        if (change.key) {
          this.envConfigService.deleteGlobalVariable(change.key);
        }
        break;
      case 'clear':
        this.envConfigService.clearGlobalVariables();
        break;
    }
  }

  private handleEnvironmentVariableChange(change: VariableChange): void {
    switch (change.action) {
      case 'set':
        if (change.key) {
          this.envConfigService.setEnvironmentVariable(change.key, change.value);
        }
        break;
      case 'unset':
        if (change.key) {
          this.envConfigService.deleteEnvironmentVariable(change.key);
        }
        break;
      case 'clear':
        this.envConfigService.clearEnvironmentVariables();
        break;
    }
  }

  private handleCollectionVariableChange(change: VariableChange): void {
    let collectionId = change.collectionId || this.contextProvider.getCollectionId();

    if (!collectionId) {
      const context = this.contextProvider.getCurrentContext();
      if (context?.collectionId) {
        const collection = this.collectionService.getCollectionById(context.collectionId);
        collectionId = collection?.id;
      }
    }

    if (!collectionId) {
      console.warn('[VariableHandler] No collection context for collection variable');
      return;
    }

    switch (change.action) {
      case 'set':
        if (change.key) {
          this.collectionService.setCollectionVariable(collectionId, change.key, change.value);
        }
        break;
      case 'unset':
        if (change.key) {
          this.collectionService.deleteCollectionVariable(collectionId, change.key);
        }
        break;
      case 'clear':
        this.collectionService.clearCollectionVariables(collectionId);
        break;
    }
  }

  private async handleSessionVariableChange(change: VariableChange): Promise<void> {
    switch (change.action) {
      case 'set':
        if (change.key) {
          await this.envConfigService.setSessionVariable(change.key, String(change.value));
        }
        break;
      case 'unset':
        if (change.key) {
          await this.envConfigService.deleteSessionVariable(change.key);
        }
        break;
      case 'clear':
        await this.envConfigService.clearSessionVariables();
        break;
    }
  }
}
