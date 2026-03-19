/**
 * EnvironmentsModelLoader Tests
 */

import { EnvironmentsModelLoader } from '../environments-model-loader';

describe('EnvironmentsModelLoader', () => {
  let loader: EnvironmentsModelLoader;
  let mockService: any;
  let mockLogger: any;

  beforeEach(() => {
    mockService = {
      getEnvironments: jest.fn(),
      getEnvironmentVariables: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      error: jest.fn()
    };

    loader = new EnvironmentsModelLoader(mockService, mockLogger);
  });

  it('should load all environments', async () => {
    const mockEnvironments = [
      { id: 'env-1', name: 'Development' },
      { id: 'env-2', name: 'Production' }
    ];

    mockService.getEnvironments.mockResolvedValue(mockEnvironments);

    const result = await loader.loadEnvironments();

    expect(result).toHaveLength(2);
    expect(mockService.getEnvironments).toHaveBeenCalled();
  });

  it('should load variables for environment', async () => {
    const mockVariables = [
      { name: 'apiUrl', value: 'http://localhost:3000' },
      { name: 'token', value: 'dev-token' }
    ];

    mockService.getEnvironmentVariables.mockResolvedValue(mockVariables);

    const result = await loader.loadChildren({ id: 'env-123', name: 'Test', variables: {} });

    expect(result).toHaveLength(2);
    expect(mockService.getEnvironmentVariables).toHaveBeenCalledWith('env-123');
  });

  it('should handle errors gracefully', async () => {
    mockService.getEnvironments.mockRejectedValue(new Error('Network error'));

    await expect(loader.loadEnvironments()).rejects.toThrow('Network error');
  });
});
