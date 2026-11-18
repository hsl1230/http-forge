import { describe, expect, it, jest } from '@jest/globals';
import type { ICollectionService, IEnvironmentConfigService } from '@http-forge/core';
import type { IWebviewMessenger } from '../presentation/webview/shared-interfaces';
import { ReadyHandler as CollectionReadyHandler } from '../presentation/webview/panels/collection-editor/handlers/ready-handler';
import { ReadyHandler as FolderReadyHandler } from '../presentation/webview/panels/folder-editor/handlers/ready-handler';

function createEnvConfigService(): IEnvironmentConfigService {
  const resolvedEnvironment = {
    name: 'dev',
    headers: {},
    variables: { baseUrl: 'https://dev.example.test', token: 'env-token' }
  };

  return {
    getSelectedEnvironment: jest.fn(() => 'dev'),
    getResolvedEnvironment: jest.fn(() => resolvedEnvironment),
    getGlobalVariables: jest.fn(() => ({ apiKey: 'global-key' }))
  } as unknown as IEnvironmentConfigService;
}

function createMessenger(): IWebviewMessenger & { postMessage: jest.Mock } {
  return { postMessage: jest.fn() } as unknown as IWebviewMessenger & { postMessage: jest.Mock };
}

describe('Collection editor ready handler', () => {
  it('sends the active environment and global variables for script completions', async () => {
    const collection = {
      id: 'collection-1',
      name: 'Example',
      variables: { collectionToken: 'collection-token' },
      items: []
    };
    const collectionService = {
      getCollection: jest.fn(() => collection),
      getCollectionVariableLocals: jest.fn(() => ({ runtime: 'value' }))
    } as unknown as ICollectionService;
    const messenger = createMessenger();

    const handler = new CollectionReadyHandler(collectionService, 'collection-1', createEnvConfigService());
    await handler.sendInitialData(messenger);

    expect(messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'init',
        collection,
        resolvedEnvironment: expect.objectContaining({
          name: 'dev',
          variables: expect.objectContaining({ baseUrl: 'https://dev.example.test' })
        }),
        globalVariables: { apiKey: 'global-key' }
      })
    );
  });
});

describe('Folder editor ready handler', () => {
  it('sends collection variables plus the active environment and globals', async () => {
    const folder = {
      id: 'folder-1',
      type: 'folder',
      name: 'Users',
      items: [{ id: 'request-1', type: 'request', name: 'List users' }]
    };
    const collection = {
      id: 'collection-1',
      name: 'Example',
      variables: { collectionToken: 'collection-token' },
      items: [folder]
    };
    const collectionService = {
      getCollection: jest.fn(() => collection)
    } as unknown as ICollectionService;
    const messenger = createMessenger();

    const handler = new FolderReadyHandler(
      collectionService,
      'collection-1',
      'folder-1',
      createEnvConfigService()
    );
    await handler.sendInitialData(messenger);

    expect(messenger.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'init',
        collectionVariables: { collectionToken: 'collection-token' },
        resolvedEnvironment: expect.objectContaining({
          name: 'dev',
          variables: expect.objectContaining({ token: 'env-token' })
        }),
        globalVariables: { apiKey: 'global-key' }
      })
    );
  });
});
