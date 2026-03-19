/**
 * Test Suites Model Loader
 */

export interface TestSuiteModel {
  id: string;
  name: string;
  description?: string;
  requestCount: number;
  children?: TestSuiteModel[];
}

export interface ITestSuitesModelLoader {
  loadSuites(): Promise<TestSuiteModel[]>;
  loadChildren(parent?: TestSuiteModel): Promise<TestSuiteModel[]>;
}

export interface ITestSuiteService {
  getAllSuites(): Promise<any[]>;
  getSuiteChildren(id: string): Promise<any[]>;
}

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class TestSuitesModelLoader implements ITestSuitesModelLoader {
  constructor(
    private service: ITestSuiteService,
    private logger: ILogger
  ) {}

  async loadSuites(): Promise<TestSuiteModel[]> {
    try {
      this.logger.debug('[TestSuitesModelLoader] Loading test suites');
      const suites = await this.service.getAllSuites();
      return suites.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        requestCount: s.requests?.length || 0
      }));
    } catch (error) {
      this.logger.error('[TestSuitesModelLoader] Failed to load suites', error);
      throw error;
    }
  }

  async loadChildren(parent?: TestSuiteModel): Promise<TestSuiteModel[]> {
    if (!parent) {
      return this.loadSuites();
    }

    try {
      this.logger.debug('[TestSuitesModelLoader] Loading children', { parentId: parent.id });
      const children = await this.service.getSuiteChildren(parent.id);
      return children.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        requestCount: s.requests?.length || 0
      }));
    } catch (error) {
      this.logger.error('[TestSuitesModelLoader] Failed to load children', error);
      throw error;
    }
  }
}
