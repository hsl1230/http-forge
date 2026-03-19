/**
 * Environment Editor Handlers
 * 
 * Exports all message handlers for the Environment Editor panel.
 * Note: ReadyHandler is internal - panels import directly from ./handlers/ready-handler
 * 
 * SOLID Principles:
 * - Single Responsibility: Each handler manages one concern
 * - Open/Closed: New handlers can be added without modifying existing code
 * - Dependency Inversion: All handlers implement IMessageHandler interface
 */

export { ConfigHandler } from './config-handler';
export { EnvironmentCrudHandler } from './environment-handler';
export { FileHandler } from './file-handler';

