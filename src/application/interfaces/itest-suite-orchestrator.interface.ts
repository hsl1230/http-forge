/**
 * Test Suite Orchestrator Interface
 * 
 * Defines the contract for test suite-related business logic operations.
 */

import {
    BrowseDataInput,
    ExportSuiteInput,
    RunSuiteInput,
    SaveSuiteInput
} from '../dto/test-suite.dto';

/**
 * Interface for test suite orchestration operations
 */
export interface ITestSuiteOrchestrator {
  /**
   * Run a test suite
   */
  runSuite(input: RunSuiteInput): Promise<any>;

  /**
   * Save a test suite
   */
  saveSuite(input: SaveSuiteInput): Promise<any>;

  /**
   * Browse suite test data
   */
  browseSuiteData(input: BrowseDataInput): Promise<any>;

  /**
   * Export suite results
   */
  exportResults(input: ExportSuiteInput): Promise<any>;
}
