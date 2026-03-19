/**
 * GraphQL Orchestrator Interface
 */

import { ManageGraphQLInput } from '../dto/graphql.dto';

export interface IGraphQLOrchestrator {
  manageGraphQL(input: ManageGraphQLInput): Promise<any>;
}
