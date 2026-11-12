import { type ICollectionService, type IEnvironmentConfigService, type IHttpRequestService } from '@http-forge/core';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { IPanelContextProvider } from '../interfaces';

/**
 * Handles URL preview resolution for the Request Tester panel.
 * Uses backend environment resolution and URL construction so preview matches execution.
 *
 * Collection variables (including values written by pre-request scripts) participate in
 * the Postman variable cascade below environment variables and above globals.
 */
export class RequestPreviewHandler implements IMessageHandler {
  constructor(
    private envConfigService: IEnvironmentConfigService,
    private httpService: IHttpRequestService,
    private collectionService: ICollectionService,
    private contextProvider: IPanelContextProvider
  ) {}

  getSupportedCommands(): string[] {
    return ['resolveUrlPreview'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    if (command !== 'resolveUrlPreview') {
      return false;
    }

    await this.handleResolveUrlPreview(
      message.request,
      message.sequence,
      message.sessionVariables || {},
      messenger
    );
    return true;
  }

  private async handleResolveUrlPreview(
    request: any,
    sequence: number,
    sessionVariables: Record<string, string>,
    messenger: IWebviewMessenger
  ): Promise<void> {
    const environment = this.envConfigService.getSelectedEnvironment();
    const resolvedEnv = this.envConfigService.getResolvedEnvironment(environment);

    if (!resolvedEnv) {
      messenger.postMessage({
        command: 'resolvedUrlPreview',
        sequence,
        url: '',
        error: 'No environment configured'
      });
      return;
    }

    try {
      const extraVariables = this.buildExtraVariables(resolvedEnv.variables || {}, sessionVariables);
      const endpointUri = request?.path || request?.url || '';
      const resolvedEndpointUri = this.envConfigService.resolveVariablesWithExtra(endpointUri, extraVariables, environment);
      const resolvedParams = this.envConfigService.resolveVariablesInObjectWithExtra(request?.params || {}, extraVariables, environment);
      let resolvedQuery = this.envConfigService.resolveVariablesInObjectWithExtra(request?.query || {}, extraVariables, environment);

      if (request?.auth?.type === 'apikey' && request.auth.apikey) {
        const keyName = this.envConfigService.resolveVariablesWithExtra(request.auth.apikey.key || '', extraVariables, environment);
        const keyValue = this.envConfigService.resolveVariablesWithExtra(request.auth.apikey.value || '', extraVariables, environment);

        if (request.auth.apikey.in === 'query') {
          resolvedQuery = { ...resolvedQuery, [keyName]: keyValue };
        }
      }

      const resolvedUrl = this.httpService.buildUrl(resolvedEndpointUri, resolvedParams, resolvedQuery);

      messenger.postMessage({
        command: 'resolvedUrlPreview',
        sequence,
        url: resolvedUrl
      });
    } catch (error: any) {
      messenger.postMessage({
        command: 'resolvedUrlPreview',
        sequence,
        url: '',
        error: error?.message || String(error)
      });
    }
  }

  /**
   * Build variables that should override the environment tier.
   *
   * `resolveVariablesWithExtra` places extras above environment variables, but
   * collection variables are *lower* precedence than environment variables in the
   * Postman cascade. Skip collection keys that the environment already defines;
   * session/local writes (pm.variables.set) legitimately win over the environment.
   */
  private buildExtraVariables(
    environmentVariables: Record<string, string>,
    sessionVariables: Record<string, string>
  ): Record<string, string> {
    const collectionVariables = this.getCollectionVariables();
    const collectionOverrides: Record<string, string> = {};

    for (const [key, value] of Object.entries(collectionVariables)) {
      if (!(key in environmentVariables)) {
        collectionOverrides[key] = value;
      }
    }

    return { ...collectionOverrides, ...sessionVariables };
  }

  private getCollectionVariables(): Record<string, string> {
    const collectionId = this.contextProvider.getCollectionId();
    if (!collectionId) {
      return {};
    }

    return {
      ...this.collectionService.getCollectionVariables(collectionId),
      ...this.collectionService.getCollectionVariableLocals(collectionId)
    };
  }
}
