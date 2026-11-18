import { describe, expect, it } from '@jest/globals';
import type { ICollectionService, IEnvironmentConfigService, IHttpRequestService } from '@http-forge/core';
import { RequestPreviewHandler } from '../presentation/webview/panels/request-tester/handlers/request-preview-handler';
import type { IPanelContextProvider } from '../presentation/webview/panels/request-tester/interfaces';

function createMessenger() {
  const messages: any[] = [];
  return {
    messages,
    postMessage: (message: any) => messages.push(message)
  };
}

function createHandler(overrides: {
  environmentVariables?: Record<string, string>;
  collectionVariables?: Record<string, string>;
  collectionLocals?: Record<string, string>;
} = {}) {
  const environmentVariables = overrides.environmentVariables || {};
  const collectionVariables = overrides.collectionVariables || {};
  const collectionLocals = overrides.collectionLocals || {};

  const resolve = (text: string, extraVariables: Record<string, string>) =>
    String(text).replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const name = String(key).trim();
      if (name in extraVariables) return extraVariables[name];
      if (name in environmentVariables) return environmentVariables[name];
      return match;
    });

  const envConfigService = {
    getSelectedEnvironment: () => 'dev',
    getResolvedEnvironment: () => ({
      name: 'dev',
      headers: {},
      variables: environmentVariables
    }),
    resolveVariablesWithExtra: (text: string, extra: Record<string, string>) => resolve(text, extra),
    resolveVariablesInObjectWithExtra: (obj: Record<string, any>, extra: Record<string, string>) =>
      Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, resolve(String(value), extra)]))
  } as unknown as IEnvironmentConfigService;

  const httpService = {
    buildUrl: (path: string, params: Record<string, string>, query: Record<string, string>) => {
      const queryString = new URLSearchParams(query).toString();
      return `${path}${queryString ? `?${queryString}` : ''}`;
    }
  } as unknown as IHttpRequestService;

  const collectionService = {
    getCollectionVariables: () => collectionVariables,
    getCollectionVariableLocals: () => collectionLocals
  } as unknown as ICollectionService;

  const contextProvider = {
    getCollectionId: () => 'collection-1'
  } as unknown as IPanelContextProvider;

  return new RequestPreviewHandler(envConfigService, httpService, collectionService, contextProvider);
}

describe('RequestPreviewHandler', () => {
  it('resolves collection variables and script-written locals below environment precedence', async () => {
    const handler = createHandler({
      environmentVariables: { envOnly: 'env', shared: 'from-env' },
      collectionVariables: { baseUrl: 'https://api.example.com', shared: 'from-collection' },
      collectionLocals: { token: 'abc' }
    });
    const messenger = createMessenger();

    await handler.handle('resolveUrlPreview', {
      request: {
        path: '{{baseUrl}}/users/{{token}}/{{shared}}/{{envOnly}}',
        query: { auth: '{{token}}' }
      },
      sequence: 1
    }, messenger as any);

    expect(messenger.messages).toEqual([
      {
        command: 'resolvedUrlPreview',
        sequence: 1,
        url: 'https://api.example.com/users/abc/from-env/env?auth=abc'
      }
    ]);
  });

  it('lets request-local script variables override collection and environment values', async () => {
    const handler = createHandler({
      environmentVariables: { token: 'from-env' },
      collectionLocals: { token: 'from-collection' }
    });
    const messenger = createMessenger();

    await handler.handle('resolveUrlPreview', {
      request: { path: 'https://api.example.com/{{token}}' },
      sequence: 2,
      sessionVariables: { token: 'from-script' }
    }, messenger as any);

    expect(messenger.messages[0]).toMatchObject({
      command: 'resolvedUrlPreview',
      url: 'https://api.example.com/from-script'
    });
  });
});
