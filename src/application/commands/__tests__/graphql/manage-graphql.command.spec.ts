/**
 * ManageGraphQLCommand Tests
 */

import { ManageGraphQLInput } from '../../../dto/graphql.dto';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { IGraphQLOrchestrator } from '../../../interfaces/igraphql-orchestrator.interface';
import { ManageGraphQLCommand } from '../../graphql/manage-graphql.command';

describe('ManageGraphQLCommand', () => {
  let command: ManageGraphQLCommand;
  let mockOrchestrator: jest.Mocked<IGraphQLOrchestrator>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: any;

  beforeEach(() => {
    mockOrchestrator = {
      manageGraphQL: jest.fn()
    } as any;

    mockEventBus = { publish: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() } as any;
    mockLogger = { debug: jest.fn(), error: jest.fn() };

    command = new ManageGraphQLCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should require GraphQL operation', () => {
    const input: ManageGraphQLInput = { operation: '' as any };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should manage GraphQL successfully', async () => {
    const input: ManageGraphQLInput = {
      operation: 'fetchSchema'
    };

    mockOrchestrator.manageGraphQL.mockResolvedValue({ success: true } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.manageGraphQL).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
