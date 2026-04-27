import { type IHttpRequestService, IEnvironmentConfigService } from '@http-forge/core';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';

/**
 * Handles URL preview resolution for the Request Tester panel.
 * Uses backend environment resolution and URL construction so preview matches execution.
 */
export class RequestPreviewHandler implements IMessageHandler {
  constructor(
    private envConfigService: IEnvironmentConfigService,
    private httpService: IHttpRequestService
  ) {}

  getSupportedCommands(): string[] {
    return ['resolveUrlPreview'];
  }

  async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    if (command !== 'resolveUrlPreview') {
      return false;
    }

    await this.handleResolveUrlPreview(message.request, message.sequence, messenger);
    return true;
  }

  private async handleResolveUrlPreview(request: any, sequence: number, messenger: IWebviewMessenger): Promise<void> {
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
      const endpointUri = request?.path || request?.url || '';
      const resolvedEndpointUri = this.envConfigService.resolveVariables(endpointUri, environment);
      const resolvedParams = this.envConfigService.resolveVariablesInObject(request?.params || {}, environment);
      let resolvedQuery = this.envConfigService.resolveVariablesInObject(request?.query || {}, environment);

      if (request?.auth?.type === 'apikey' && request.auth.apikey) {
        const keyName = this.envConfigService.resolveVariables(request.auth.apikey.key || '', environment);
        const keyValue = this.envConfigService.resolveVariables(request.auth.apikey.value || '', environment);

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
}
