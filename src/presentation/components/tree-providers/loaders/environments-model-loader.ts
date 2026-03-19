/**
 * Environments Model Loader
 */

export interface EnvironmentModel {
  id: string;
  name: string;
  description?: string;
  variables: Record<string, any>;
  isActive?: boolean;
}

export interface IEnvironmentsModelLoader {
  loadEnvironments(): Promise<EnvironmentModel[]>;
  loadChildren(parent?: EnvironmentModel): Promise<EnvironmentModel[]>;
}

export interface IEnvironmentService {
  getAllEnvironments(): Promise<any[]>;
  getEnvironmentChildren(id: string): Promise<any[]>;
}

export interface ILogger {
  debug(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

export class EnvironmentsModelLoader implements IEnvironmentsModelLoader {
  constructor(
    private service: IEnvironmentService,
    private logger: ILogger
  ) {}

  async loadEnvironments(): Promise<EnvironmentModel[]> {
    try {
      this.logger.debug('[EnvironmentsModelLoader] Loading environments');
      const environments = await this.service.getAllEnvironments();
      return environments.map(e => ({
        id: e.id,
        name: e.name,
        description: e.description,
        variables: e.variables || {},
        isActive: e.isActive
      }));
    } catch (error) {
      this.logger.error('[EnvironmentsModelLoader] Failed to load environments', error);
      throw error;
    }
  }

  async loadChildren(parent?: EnvironmentModel): Promise<EnvironmentModel[]> {
    if (!parent) {
      return this.loadEnvironments();
    }

    try {
      this.logger.debug('[EnvironmentsModelLoader] Loading children', { parentId: parent.id });
      const children = await this.service.getEnvironmentChildren(parent.id);
      return children.map(e => ({
        id: e.id,
        name: e.name,
        description: e.description,
        variables: e.variables || {},
        isActive: e.isActive
      }));
    } catch (error) {
      this.logger.error('[EnvironmentsModelLoader] Failed to load children', error);
      throw error;
    }
  }
}
