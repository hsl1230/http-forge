/**
 * Registry for suite context when editing suite requests in the Request Tester.
 * Allows the SaveRequestHandler to access the suite store without constructor injection.
 */
import { ITestSuiteStore, TestSuiteService } from '@http-forge/core';

interface SuiteContext {
  suiteStore: ITestSuiteStore;
  testSuiteService: TestSuiteService;
}

const registry = new Map<string, SuiteContext>();

export function registerSuiteContext(suiteId: string, ctx: SuiteContext): void {
  registry.set(suiteId, ctx);
}

export function getSuiteContext(suiteId: string): SuiteContext | undefined {
  return registry.get(suiteId);
}

export function unregisterSuiteContext(suiteId: string): void {
  registry.delete(suiteId);
}
