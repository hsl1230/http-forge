/**
 * OAuth2 Handler
 * 
 * Single Responsibility: Handle OAuth2-related webview messages
 * 
 * Commands:
 *  - oauth2GetToken   (webview → ext) — trigger token acquisition
 *  - oauth2RefreshToken (webview → ext) — trigger token refresh
 *  - oauth2ClearToken  (webview → ext) — clear cached token
 * 
 * Responses:
 *  - oauth2TokenReceived (ext → webview) — token acquired successfully
 *  - oauth2TokenError    (ext → webview) — token acquisition failed
 */

import { IEnvironmentConfigService, IOAuth2TokenManager, type OAuth2Config, TokenCacheKey } from '@http-forge/core';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';
import { IPanelContextProvider } from '../interfaces';

export class OAuth2Handler implements IMessageHandler {
    constructor(
        private readonly tokenManager: IOAuth2TokenManager,
        private readonly envConfigService: IEnvironmentConfigService,
        private readonly contextProvider: IPanelContextProvider,
    ) {}

    getSupportedCommands(): string[] {
        return ['oauth2GetToken', 'oauth2RefreshToken', 'oauth2ClearToken'];
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'oauth2GetToken':
                await this.handleGetToken(message.oauth2Config, messenger);
                return true;

            case 'oauth2RefreshToken':
                await this.handleRefreshToken(message.oauth2Config, message.refreshToken, messenger);
                return true;

            case 'oauth2ClearToken':
                this.handleClearToken(message.cacheKey);
                messenger.postMessage({ command: 'oauth2TokenCleared' });
                return true;

            default:
                return false;
        }
    }

    // ─── Private handlers ──────────────────────────────

    private async handleGetToken(config: OAuth2Config, messenger: IWebviewMessenger): Promise<void> {
        try {
            const environment = this.envConfigService.getSelectedEnvironment();
            const tokenInfo = await this.tokenManager.getToken(config, environment);

            messenger.postMessage({
                command: 'oauth2TokenReceived',
                tokenInfo: {
                    accessToken: tokenInfo.accessToken,
                    tokenType: tokenInfo.tokenType,
                    expiresAt: tokenInfo.expiresAt,
                    refreshToken: tokenInfo.refreshToken,
                    scope: tokenInfo.scope
                }
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            messenger.postMessage({
                command: 'oauth2TokenError',
                error: message
            });
        }
    }

    private async handleRefreshToken(
        config: OAuth2Config,
        refreshToken: string,
        messenger: IWebviewMessenger
    ): Promise<void> {
        try {
            const environment = this.envConfigService.getSelectedEnvironment();
            const tokenInfo = await this.tokenManager.refreshToken(config, refreshToken, environment);

            messenger.postMessage({
                command: 'oauth2TokenReceived',
                tokenInfo: {
                    accessToken: tokenInfo.accessToken,
                    tokenType: tokenInfo.tokenType,
                    expiresAt: tokenInfo.expiresAt,
                    refreshToken: tokenInfo.refreshToken,
                    scope: tokenInfo.scope
                }
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            messenger.postMessage({
                command: 'oauth2TokenError',
                error: message
            });
        }
    }

    private handleClearToken(cacheKey?: TokenCacheKey): void {
        if (cacheKey) {
            this.tokenManager.clearToken(cacheKey);
        } else {
            this.tokenManager.clearAllTokens();
        }
    }
}
