import { describe, expect, it } from '@jest/globals';
import type { CollectionRequest } from '@http-forge/core';
import { mergeCollectionRequests } from '../presentation/webview/panels/request-tester/panel-data-provider';

function request(overrides: Partial<CollectionRequest> = {}): CollectionRequest {
  return {
    id: 'request-1',
    name: 'Get user',
    method: 'GET',
    url: '/users/:id',
    ...overrides
  };
}

describe('mergeCollectionRequests', () => {
  it('does not restore a header that was removed from the saved request', () => {
    const base = request({
      headers: [
        { key: 'Authorization', value: 'Bearer stale' },
        { key: 'Accept', value: 'application/json' }
      ]
    });
    const saved = request({
      headers: [{ key: 'Accept', value: 'application/json' }]
    });

    const merged = mergeCollectionRequests(base, saved);

    expect(merged.headers).toEqual([{ key: 'Accept', value: 'application/json' }]);
  });

  it('does not restore a query parameter that was removed from the saved request', () => {
    const base = request({
      query: [
        { key: 'page', value: '1' },
        { key: 'limit', value: '20' }
      ]
    });
    const saved = request({
      query: [{ key: 'limit', value: '20' }]
    });

    const merged = mergeCollectionRequests(base, saved);

    expect(merged.query).toEqual([{ key: 'limit', value: '20' }]);
  });

  it('does not restore a path parameter that was removed from the saved request', () => {
    const base = request({ params: { id: '1', tenant: 'acme' } });
    const saved = request({ params: { id: '1' } });

    const merged = mergeCollectionRequests(base, saved);

    expect(merged.params).toEqual({ id: '1' });
  });

  it('preserves saved WebSocket drafts and subprotocols', () => {
    const websocket = {
      subprotocols: ['chat'],
      messages: [{ id: 'm1', type: 'text' as const, data: 'hello' }]
    };
    const merged = mergeCollectionRequests(
      request({ method: 'WS', url: 'wss://example.test/socket' }),
      request({ method: 'WS', url: 'wss://example.test/socket', websocket })
    );

    expect(merged.websocket).toEqual(websocket);
  });
});
