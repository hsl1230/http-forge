/**
 * Collection tree helpers shared by command modules.
 *
 * Single Responsibility: only collection-tree traversal + reordering logic,
 * so commands never duplicate these algorithms.
 */

import type { Collection, CollectionItem, CollectionService } from '@http-forge/core';

/**
 * Move an item up or down within its parent container
 */
export async function moveItemInDirection(
  collectionService: CollectionService,
  collectionId: string,
  itemId: string,
  direction: 'up' | 'down'
): Promise<boolean> {
  const collection = collectionService.getCollection(collectionId);
  if (!collection) return false;

  // Find the parent container and the item's current position
  const { parent, items } = findParentContaining(collection, itemId);
  if (!items) return false;

  const orderedIds = items.map((item) => item.id);
  const currentIndex = orderedIds.indexOf(itemId);

  if (currentIndex === -1) return false;

  // Calculate new index
  let newIndex: number;
  if (direction === 'up') {
    if (currentIndex === 0) return false; // Already at top
    newIndex = currentIndex - 1;
  } else {
    if (currentIndex === orderedIds.length - 1) return false; // Already at bottom
    newIndex = currentIndex + 1;
  }

  // Swap positions
  orderedIds.splice(currentIndex, 1);
  orderedIds.splice(newIndex, 0, itemId);

  // Save new order
  return await collectionService.reorderItems(
    collectionId,
    parent?.id,
    orderedIds
  );
}

/**
 * Find the parent container (folder or collection root) that contains an item
 */
export function findParentContaining(collection: Collection, itemId: string): { parent: any | undefined; items: any[] | undefined } {
  // Check root level
  if (collection.items.some((item) => item.id === itemId)) {
    return { parent: undefined, items: collection.items };
  }

  // Search in folders
  return findParentInItems(collection.items, itemId);
}

function findParentInItems(items: CollectionItem[], itemId: string): { parent: any | undefined; items: any[] | undefined } {
  for (const item of items) {
    if (item.type === 'folder' && item.items) {
      if (item.items.some((child) => child.id === itemId)) {
        return { parent: item, items: item.items };
      }
      const result = findParentInItems(item.items, itemId);
      if (result.items) {
        return result;
      }
    }
  }
  return { parent: undefined, items: undefined };
}

/**
 * Count total requests in a collection (recursively)
 */
export function countRequests(collection: Collection): number {
  let count = 0;
  function walk(items: CollectionItem[]) {
    for (const item of items) {
      if (item.type === 'request') {
        count++;
      } else if (item.type === 'folder' && item.items) {
        walk(item.items);
      }
    }
  }
  walk(collection.items || []);
  return count;
}

/**
 * Collect all requests from a collection (recursively)
 */
export function collectAllRequests(collection: Collection): any[] {
  const requests: any[] = [];
  function walk(items: CollectionItem[]) {
    for (const item of items) {
      if (item.type === 'request') {
        requests.push(item);
      } else if (item.type === 'folder' && item.items) {
        walk(item.items);
      }
    }
  }
  walk(collection.items || []);
  return requests;
}

/**
 * Find a request by ID in a collection (recursively)
 */
export function findRequestInCollection(collection: Collection | undefined, requestId: string): any | undefined {
  if (!collection) return undefined;
  function walk(items: CollectionItem[]): any | undefined {
    for (const item of items) {
      if (item.type === 'request' && item.id === requestId) {
        return item;
      } else if (item.type === 'folder' && item.items) {
        const found = walk(item.items);
        if (found) return found;
      }
    }
    return undefined;
  }
  return walk(collection.items || []);
}
