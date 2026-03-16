/**
 * Test Suite Panel Interfaces
 */

import { SuiteConfig } from '@http-forge/core';

/**
 * Configuration for a test suite run
 */
export interface SuiteRunConfiguration {
    /** Environment ID to use */
    environmentId?: string;
    /** Number of iterations */
    iterations: number;
    /** Delay between requests in ms */
    delay: number;
    /** Stop on first error */
    stopOnError: boolean;
    /** Data file for parameterized runs */
    dataFile?: {
        path: string;
        content: string;
    };
    /** Read variables from shared session */
    readFromSharedSession: boolean;
    /** Write variables to shared session */
    writeToSharedSession: boolean;
}

/**
 * Request result for display
 */
export interface SuiteRequestResult {
    /** Unique key: collectionId:requestId */
    key: string;
    /** Iteration number (1-based) */
    iteration: number;
    /** Sequence within iteration (1-based) */
    sequence: number;
    /** Request name */
    name: string;
    /** HTTP method */
    method: string;
    /** Folder path */
    folderPath: string;
    /** Collection name */
    collectionName: string;
    /** Whether request passed */
    passed: boolean;
    /** Whether request was skipped */
    skipped: boolean;
    /** HTTP status code */
    status?: number;
    /** Status text */
    statusText?: string;
    /** Response duration in ms */
    duration: number;
    /** Error message if failed */
    error?: string;
    /** Test results */
    testResults?: Array<{
        name: string;
        passed: boolean;
        error?: string;
    }>;
    /** Full response for detail view */
    response?: any;
    /** Request headers that were sent */
    requestHeaders?: Record<string, string>;
    /** Request body that was sent */
    requestBody?: any;
}

/**
 * Messages from webview to extension
 */
export type WebviewToExtensionMessage =
    | { type: 'ready' }
    | { type: 'run'; config: SuiteRunConfiguration; selectedRequests: string[] }
    | { type: 'stop' }
    | { type: 'saveSuite'; name?: string }
    | { type: 'addRequests'; requests: Array<{ collectionId: string; requestId: string; enabled: boolean }> }
    | { type: 'removeRequest'; requestKey: string }
    | { type: 'reorderRequests'; orderedKeys: string[] }
    | { type: 'updateConfig'; config: Partial<SuiteConfig> }
    | { type: 'browseDataFile' }
    | { type: 'clearDataFile' }
    | { type: 'exportJSON' }
    | { type: 'exportHTML' }
    | { type: 'getAvailableRequests' };

/**
 * Messages from extension to webview
 */
export type ExtensionToWebviewMessage =
    | { type: 'suiteData'; suite: any; environments: any[]; selectedEnvironment: string }
    | { type: 'availableRequests'; requests: Array<AvailableRequest> }
    | { type: 'runStarted'; totalRequests: number; iterations: number }
    | { type: 'requestResult'; result: SuiteRequestResult }
    | { type: 'runProgress'; current: number; total: number; passed: number; failed: number; skipped: number }
    | { type: 'statisticsUpdate'; statistics: any }
    | { type: 'runComplete'; summary: any }
    | { type: 'runStopped' }
    | { type: 'dataFileLoaded'; path: string; content: string; rowCount: number }
    | { type: 'dataFileCleared' }
    | { type: 'suiteSaved'; suite: any };

/**
 * Available request for Add Request modal
 */
export interface AvailableRequest {
    collectionId: string;
    collectionName: string;
    requestId: string;
    name: string;
    method: string;
    folderPath: string;
}
