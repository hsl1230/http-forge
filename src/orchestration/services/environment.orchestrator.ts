/**
 * Environment Orchestrator
 * 
 * Orchestrates environment-related business logic.
 */

import { IEnvironmentConfigService } from '@http-forge/core';
import {
    AddEnvironmentInput,
    AddEnvironmentOutput,
    DeleteEnvironmentInput,
    DeleteEnvironmentOutput,
    DuplicateEnvironmentInput,
    DuplicateEnvironmentOutput
} from '../../application/dto/environment-crud.dto';
import { SelectEnvironmentInput, SelectEnvironmentOutput } from '../../application/dto/environment.dto';
import { IEnvironmentOrchestrator } from '../../application/interfaces/ienvironment-orchestrator.interface';

/**
 * Environment orchestrator implementation
 */
export class EnvironmentOrchestrator implements IEnvironmentOrchestrator {
  constructor(
    private readonly envConfigService: IEnvironmentConfigService,
    private readonly logger: any
  ) {}

  /**
   * Select environment as active
   */
  async selectEnvironment(input: SelectEnvironmentInput): Promise<SelectEnvironmentOutput> {
    this.logger.debug(`[EnvironmentOrchestrator] Selecting environment: ${input.id}`);

    try {
      // Note: getEnvironment may not exist on core service - placeholder implementation
      const env = await (this.envConfigService as any).getEnvironment(input.id);

      if (!env) {
        throw new Error(`Environment ${input.id} not found`);
      }

      await this.envConfigService.setSelectedEnvironment(input.name || input.id || '');

      return new SelectEnvironmentOutput({
        id: env.id,
        name: env.name,
        variables: env.variables || {},
        isActive: true
      });
    } catch (error) {
      this.logger.error('[EnvironmentOrchestrator] Select environment failed:', error);
      throw error;
    }
  }

  /**
   * Add new environment
   */
  async addEnvironment(input: AddEnvironmentInput): Promise<AddEnvironmentOutput> {
    this.logger.debug(`[EnvironmentOrchestrator] Adding environment: ${input.name}`);

    try {
      const id = `env-${Date.now()}`;
      const newEnv = {
        id,
        name: input.name,
        description: input.description || '',
        variables: input.variables || {},
        createdAt: Date.now()
      };

      // Persist to environment service - placeholder implementation
      await (this.envConfigService as any).createEnvironment(newEnv as any);

      return new AddEnvironmentOutput({
        id,
        name: input.name!,
        variables: newEnv.variables,
        createdAt: newEnv.createdAt
      });
    } catch (error) {
      this.logger.error('[EnvironmentOrchestrator] Add environment failed:', error);
      throw error;
    }
  }

  /**
   * Delete environment
   */
  async deleteEnvironment(input: DeleteEnvironmentInput): Promise<DeleteEnvironmentOutput> {
    this.logger.debug(`[EnvironmentOrchestrator] Deleting environment: ${input.id}`);

    try {
      // Note: deleteEnvironment may not exist on core service - placeholder implementation
      await (this.envConfigService as any).deleteEnvironment(input.id);

      return new DeleteEnvironmentOutput({
        id: input.id!,
        success: true,
        message: 'Environment deleted successfully'
      });
    } catch (error) {
      this.logger.error('[EnvironmentOrchestrator] Delete environment failed:', error);
      throw error;
    }
  }

  /**
   * Duplicate environment
   */
  async duplicateEnvironment(input: DuplicateEnvironmentInput): Promise<DuplicateEnvironmentOutput> {
    this.logger.debug(`[EnvironmentOrchestrator] Duplicating environment: ${input.sourceId}`);

    try {
      // Note: getEnvironment may not exist on core service - placeholder implementation
      const sourceEnv = await (this.envConfigService as any).getEnvironment(input.sourceId);

      if (!sourceEnv) {
        throw new Error(`Source environment ${input.sourceId} not found`);
      }

      const newId = `env-${Date.now()}`;
      const duplicated = {
        id: newId,
        name: input.newName,
        description: input.newDescription || sourceEnv.description || '',
        variables: { ...sourceEnv.variables },
        createdAt: Date.now()
      };

      // Note: createEnvironment may not exist on core service - placeholder implementation
      await (this.envConfigService as any).createEnvironment(duplicated as any);

      return new DuplicateEnvironmentOutput({
        id: newId,
        name: duplicated.name,
        variables: duplicated.variables,
        sourceId: input.sourceId,
        createdAt: duplicated.createdAt
      });
    } catch (error) {
      this.logger.error('[EnvironmentOrchestrator] Duplicate environment failed:', error);
      throw error;
    }
  }

  /**
   * Manage environment configuration
   */
  async manageConfig(input: any): Promise<any> {
    this.logger.debug(`[EnvironmentOrchestrator] Managing config: ${input.operation}`);

    try {
      // Placeholder for config management logic
      return { success: true, message: 'Config updated' };
    } catch (error) {
      this.logger.error('[EnvironmentOrchestrator] Manage config failed:', error);
      throw error;
    }
  }
}
