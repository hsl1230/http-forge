/**
 * OAuth2 Orchestrator Interface
 */

import { ManageOAuth2Input } from '../dto/oauth2.dto';

export interface IOAuth2Orchestrator {
  manageOAuth2(input: ManageOAuth2Input): Promise<any>;
}
