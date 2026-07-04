import type { RequestAuth } from '@http-forge/core';

export function resolveInheritedAuth(
  requestAuth: RequestAuth | undefined,
  folderAuthChain: RequestAuth[],
  collectionAuth: RequestAuth | undefined
): RequestAuth | undefined {
  if (requestAuth && requestAuth.type && requestAuth.type !== 'inherit') {
    return requestAuth.type === 'none' ? undefined : requestAuth;
  }

  for (let index = folderAuthChain.length - 1; index >= 0; index--) {
    const auth = folderAuthChain[index];
    if (auth?.type && auth.type !== 'inherit') {
      return auth.type === 'none' ? undefined : auth;
    }
  }

  if (collectionAuth && collectionAuth.type && collectionAuth.type !== 'inherit') {
    return collectionAuth.type === 'none' ? undefined : collectionAuth;
  }

  return undefined;
}