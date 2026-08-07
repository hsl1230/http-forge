/**
 * Empty API implementation.
 *
 * Single Responsibility: return a no-op HttpForgeApi when there is no
 * workspace folder open, so other extensions never crash on a missing API.
 */

import type { HttpForgeApi } from './index';

/**
 * Create empty API for when no workspace is open
 */
export function createEmptyApi(): HttpForgeApi {
  return {
    version: '1.0.0',
    getEnvironmentNames: () => [],
    getSelectedEnvironment: () => '',
    setSelectedEnvironment: async () => {},
    getResolvedEnvironment: () => null,
    resolveVariables: (text) => text,
    getAllCollections: () => [],
    getCollection: () => undefined,
    createCollection: async () => ({ id: '', name: '', items: [] }),
    saveCollection: async () => {},
    deleteCollection: async () => false,
    findRequest: () => undefined,
    executeRequest: async () => ({ status: 0, statusText: '', headers: {}, body: null, time: 0, cookies: [] }),
    buildUrl: () => '',
    getRequestHistory: () => [],
    getAllCookies: () => [],
    getCookieHeader: () => '',
    clearCookies: async () => {},
    openRequest: () => {},
    openRequestContext: () => {},
    openEnvironmentEditor: () => {},
    openCollectionEditor: () => {},
    refreshCollections: () => {},
    refreshEnvironments: () => {}
  };
}
