/**
 * ManageSchemaCommand Tests
 */

import { ManageSchemaInput } from '../../../dto/schema.dto';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { ISchemaOrchestrator } from '../../../interfaces/ischema-orchestrator.interface';
import { ManageSchemaCommand } from '../../schema/manage-schema.command';

describe('ManageSchemaCommand', () => {
  let command: ManageSchemaCommand;
  let mockOrchestrator: jest.Mocked<ISchemaOrchestrator>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: any;

  beforeEach(() => {
    mockOrchestrator = {
      manageSchema: jest.fn()
    } as any;

    mockEventBus = { publish: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() } as any;
    mockLogger = { debug: jest.fn(), error: jest.fn() };

    command = new ManageSchemaCommand(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should require schema operation', () => {
    const input: ManageSchemaInput = { operation: '' as any };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should manage schema successfully', async () => {
    const input: ManageSchemaInput = {
      operation: 'fetch'
    };

    mockOrchestrator.manageSchema.mockResolvedValue({ success: true } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.manageSchema).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
