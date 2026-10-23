import type {
  Collection,
  CollectionItem,
  CollectionRequestItem,
  PathParamEntry,
  RequestAuth,
  RequestScripts,
} from '@http-forge/core';

export interface CollectionRequestLookup {
  request: CollectionRequestItem;
  folderScriptsChain: RequestScripts[];
  folderAuthChain: RequestAuth[];
}

/**
 * Find a request in a collection and return the folder script/auth chains that
 * apply to it. Shared by the HTTP and WebSocket request handlers.
 */
export function findRequestInCollection(
  collection: Collection | undefined,
  requestId: string
): CollectionRequestLookup | undefined {
  return searchItems(collection?.items || [], requestId, [], []);
}

/** Resolve PathParamEntry values to plain strings for execution. */
export function resolveParamsToStrings(
  params?: Record<string, string | PathParamEntry>
): Record<string, string> | undefined {
  if (!params) return undefined;
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    result[key] = typeof value === 'string' ? value : (value.value ?? '');
  }
  return result;
}

function searchItems(
  items: CollectionItem[],
  requestId: string,
  currentScripts: RequestScripts[],
  currentAuth: RequestAuth[]
): CollectionRequestLookup | undefined {
  for (const item of items) {
    if (item.type === 'folder') {
      const nextScripts = item.scripts ? [...currentScripts, item.scripts] : currentScripts;
      const nextAuth = item.auth ? [...currentAuth, item.auth] : currentAuth;
      const found = searchItems(item.items || [], requestId, nextScripts, nextAuth);
      if (found) {
        return found;
      }
    } else if (item.id === requestId) {
      return {
        request: item,
        folderScriptsChain: currentScripts,
        folderAuthChain: currentAuth,
      };
    }
  }
  return undefined;
}
