/**
 * Test Suite Management DTOs
 * 
 * Data transfer objects for managing and executing test suites in the application layer.
 * Handles suite save, execution, data browsing, and export operations.
 */

// ============= SAVE SUITE =============

/**
 * Input DTO for saving a test suite
 */
export interface SaveSuiteInput {
  /**
   * Suite name
   */
  name: string;

  /**
   * Suite description
   */
  description?: string;

  /**
   * Suite requests
   */
  requests?: any[];

  /**
   * Suite configuration
   */
  config?: any;

  /**
   * Suite variables
   */
  variables?: any[];
}

/**
 * Output DTO for suite save operation
 */
export class SaveSuiteOutput {
  /**
   * Suite identifier
   */
  readonly id: string;

  /**
   * Suite name
   */
  readonly name: string;

  /**
   * Whether save was successful
   */
  readonly success: boolean;

  /**
   * Request count in suite
   */
  readonly requestCount: number;

  /**
   * Save timestamp
   */
  readonly savedAt: number;

  constructor(data: any) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.success = data.success || false;
    this.requestCount = data.requestCount || 0;
    this.savedAt = data.savedAt || Date.now();
  }

  /**
   * Factory method to create SaveSuiteOutput from raw data
   * @param data Raw save result
   * @returns SaveSuiteOutput instance
   */
  static from(data: any): SaveSuiteOutput {
    return new SaveSuiteOutput(data);
  }
}

// ============= RUN SUITE =============

/**
 * Input DTO for running a test suite
 */
export interface RunSuiteInput {
  /**
   * Suite identifier
   */
  id: string;

  /**
   * Suite data
   */
  suite?: any;

  /**
   * Execution environment
   */
  environment?: any;

  /**
   * Run options
   */
  options?: {
    parallel?: boolean;
    stopOnError?: boolean;
    timeout?: number;
  };
}

/**
 * Output DTO for suite execution results
 */
export class RunSuiteOutput {
  /**
   * Suite execution identifier
   */
  readonly executionId: string;

  /**
   * Total tests run
   */
  readonly totalTests: number;

  /**
   * Passed test count
   */
  readonly passedTests: number;

  /**
   * Failed test count
   */
  readonly failedTests: number;

  /**
   * Skipped test count
   */
  readonly skippedTests: number;

  /**
   * Total execution duration
   */
  readonly duration: number;

  /**
   * Detailed test results
   */
  readonly results: any[];

  /**
   * Pass rate percentage
   */
  readonly passRate: number;

  constructor(data: any) {
    this.executionId = data.executionId || '';
    this.totalTests = data.totalTests || 0;
    this.passedTests = data.passedTests || 0;
    this.failedTests = data.failedTests || 0;
    this.skippedTests = data.skippedTests || 0;
    this.duration = data.duration || 0;
    this.results = data.results || [];
    this.passRate = this.totalTests > 0 ? (this.passedTests / this.totalTests) * 100 : 0;
  }

  /**
   * Factory method to create RunSuiteOutput from raw data
   * @param data Raw execution result
   * @returns RunSuiteOutput instance
   */
  static from(data: any): RunSuiteOutput {
    return new RunSuiteOutput(data);
  }
}

// ============= BROWSE DATA =============

/**
 * Input DTO for browsing test suite data
 */
export interface BrowseDataInput {
  /**
   * Suite identifier
   */
  id: string;

  /**
   * Data path filter
   */
  path?: string;

  /**
   * Pagination options
   */
  limit?: number;
  offset?: number;
}

/**
 * Output DTO for test data browsing
 */
export class BrowseDataOutput {
  /**
   * Suite identifier
   */
  readonly id: string;

  /**
   * Test data items
   */
  readonly data: any[];

  /**
   * Total item count
   */
  readonly total: number;

  /**
   * Items returned in this response
   */
  readonly count: number;

  /**
   * Current offset
   */
  readonly offset: number;

  constructor(data: any) {
    this.id = data.id || '';
    this.data = data.data || [];
    this.total = data.total || 0;
    this.count = this.data.length;
    this.offset = data.offset || 0;
  }

  /**
   * Factory method to create BrowseDataOutput from raw data
   * @param data Raw browse result
   * @returns BrowseDataOutput instance
   */
  static from(data: any): BrowseDataOutput {
    return new BrowseDataOutput(data);
  }
}

// ============= EXPORT SUITE =============

/**
 * Input DTO for exporting a test suite
 */
export interface ExportSuiteInput {
  /**
   * Suite identifier
   */
  id: string;

  /**
   * Export format: 'json', 'postman', 'openapi'
   */
  format: 'json' | 'postman' | 'openapi';

  /**
   * Optional export options
   */
  options?: any;
}

/**
 * Output DTO for suite export operation
 */
export class ExportSuiteOutput {
  /**
   * Suite identifier
   */
  readonly id: string;

  /**
   * Export format used
   */
  readonly format: string;

  /**
   * Whether export was successful
   */
  readonly success: boolean;

  /**
   * Exported content
   */
  readonly content: string;

  /**
   * Export file size in bytes
   */
  readonly size: number;

  /**
   * Suggested file name
   */
  readonly fileName: string;

  /**
   * MIME type of export
   */
  readonly mimeType: string;

  constructor(data: any) {
    this.id = data.id || '';
    this.format = data.format || 'json';
    this.success = data.success || false;
    this.content = data.content || '';
    this.size = this.content.length;
    this.fileName = data.fileName || `suite-export.${this.getMimeExtension()}`;
    this.mimeType = data.mimeType || this.getMimeType();
  }

  private getMimeType(): string {
    switch (this.format) {
      case 'postman':
        return 'application/json';
      case 'openapi':
        return 'application/yaml';
      default:
        return 'application/json';
    }
  }

  private getMimeExtension(): string {
    switch (this.format) {
      case 'postman':
        return 'json';
      case 'openapi':
        return 'yaml';
      default:
        return 'json';
    }
  }

  /**
   * Factory method to create ExportSuiteOutput from raw data
   * @param data Raw export result
   * @returns ExportSuiteOutput instance
   */
  static from(data: any): ExportSuiteOutput {
    return new ExportSuiteOutput(data);
  }
}
