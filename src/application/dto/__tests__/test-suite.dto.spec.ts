/**
 * Test Suite DTOs Tests
 */

import { BrowseDataOutput, ExportSuiteOutput, RunSuiteOutput, SaveSuiteOutput } from '../test-suite.dto';

describe('SaveSuiteOutput', () => {
  it('should create from data object', () => {
    const data = {
      id: 'suite-123',
      name: 'API Tests',
      success: true,
      requestCount: 10,
      savedAt: Date.now()
    };
    
    const output = SaveSuiteOutput.from(data);
    
    expect(output.id).toBe(data.id);
    expect(output.name).toBe(data.name);
    expect(output.requestCount).toBe(10);
  });
});

describe('RunSuiteOutput', () => {
  it('should calculate pass rate correctly', () => {
    const data = {
      executionId: 'exec-456',
      totalTests: 10,
      passedTests: 8,
      failedTests: 2,
      skippedTests: 0,
      duration: 5000,
      results: []
    };
    
    const output = RunSuiteOutput.from(data);
    
    expect(output.passRate).toBe(80);
    expect(output.totalTests).toBe(10);
    expect(output.passedTests).toBe(8);
  });

  it('should handle zero tests gracefully', () => {
    const output = new RunSuiteOutput({
      executionId: 'exec-empty',
      totalTests: 0,
      passedTests: 0
    });
    
    expect(output.passRate).toBe(0);
  });
});

describe('BrowseDataOutput', () => {
  it('should calculate count from data array', () => {
    const data = {
      id: 'suite-789',
      data: [{}, {}, {}],
      total: 10,
      offset: 0
    };
    
    const output = BrowseDataOutput.from(data);
    
    expect(output.count).toBe(3);
    expect(output.total).toBe(10);
    expect(output.offset).toBe(0);
  });
});

describe('ExportSuiteOutput', () => {
  it('should determine MIME type by format', () => {
    const output = new ExportSuiteOutput({
      id: 'suite-export',
      format: 'postman',
      content: 'json content',
      success: true
    });
    
    expect(output.mimeType).toBe('application/json');
    expect(output.size).toBeGreaterThan(0);
  });

  it('should suggest correct file extension', () => {
    const output = new ExportSuiteOutput({
      id: 'suite-exp-2',
      format: 'openapi',
      content: 'yaml content'
    });
    
    expect(output.fileName).toContain('.yaml');
  });
});
