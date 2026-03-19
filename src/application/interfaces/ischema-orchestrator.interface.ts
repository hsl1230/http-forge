/**
 * Schema Orchestrator Interface
 */

import { ManageSchemaInput } from '../dto/schema.dto';

export interface ISchemaOrchestrator {
  manageSchema(input: ManageSchemaInput): Promise<any>;
}
