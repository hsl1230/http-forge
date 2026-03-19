/**
 * ManageOAuth2Command Tests
 */

import { ManageOAuth2Input } from '../../../dto/oauth2.dto';
import { IEventBus } from '../../../interfaces/ievent-bus.interface';
import { IOAuth2Orchestrator } from '../../../interfaces/ioauth2-orchestrator.interface';
import { ManageOAuth2Command } from '../../oauth2/manage-oauth2.command';

describe('ManageOAuth2Command', () => {
  let command: ManageOAuth2Command;
  let mockOrchestrator: jest.Mocked<IOAuth2Orchestrator>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockLogger: any;

  beforeEach(() => {
    mockOrchestrator = {
      manageOAuth2: jest.fn()
    } as any;

    mockEventBus = { publish: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() } as any;
    mockLogger = { debug: jest.fn(), error: jest.fn() };

    command = new ManageOAuth2Command(mockOrchestrator, mockEventBus, mockLogger);
  });

  it('should require OAuth2 operation', () => {
    const input: ManageOAuth2Input = { operation: '' as any };

    expect(() => command.validateInput(input)).toThrow();
  });

  it('should manage OAuth2 successfully', async () => {
    const input: ManageOAuth2Input = {
      operation: 'authorize'
    };

    mockOrchestrator.manageOAuth2.mockResolvedValue({ success: true } as any);

    const result = await command.execute(input);

    expect(mockOrchestrator.manageOAuth2).toHaveBeenCalledWith(input);
    expect(mockEventBus.publish).toHaveBeenCalled();
  });
});
