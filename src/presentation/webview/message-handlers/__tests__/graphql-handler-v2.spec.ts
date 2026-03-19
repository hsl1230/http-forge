/**
 * GraphQLHandlerV2 Tests
 */

import { ManageGraphQLCommand } from '../../../../application/commands';
import { GraphQLHandlerV2 } from '../graphql-handler-v2';

describe('GraphQLHandlerV2', () => {
  let handler: GraphQLHandlerV2;
  let mockCommand: jest.Mocked<ManageGraphQLCommand>;
  let mockLogger: any;

  beforeEach(() => {
    mockCommand = {
      execute: jest.fn(),
      validateInput: jest.fn()
    } as any;

    mockLogger = { debug: jest.fn(), error: jest.fn() };

    handler = new GraphQLHandlerV2(mockCommand, mockLogger);
  });

  it('should support GraphQL commands', () => {
    const commands = handler.getSupportedCommands();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should fetch GraphQL schema', async () => {
    const mockMessenger = { postMessage: jest.fn() };
    mockCommand.execute.mockResolvedValue({ success: true, completions: [] } as any);

    await handler.handle('graphqlFetchSchema', { endpoint: 'http://graphql.test' }, mockMessenger);

    expect(mockCommand.execute).toHaveBeenCalled();
  });
});
