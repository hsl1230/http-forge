import * as vscode from 'vscode';
import { COMMAND_IDS } from '../shared/constants';
import type { CommandContext } from './command-context';
import { createAiProvider } from '../infrastructure/ai-provider-factory';

export function registerAiProviderCommands(ctx: CommandContext): void {
    const { context } = ctx;

    context.subscriptions.push(
        vscode.commands.registerCommand('httpForge.configureAiProvider', async () => {
            const provider = await vscode.window.showQuickPick(
                ['copilot', 'openai', 'anthropic', 'custom'],
                { placeHolder: 'Select AI provider' }
            );
            if (!provider) return;

            const cfg = vscode.workspace.getConfiguration('httpForge');
            await cfg.update('ai.provider', provider, vscode.ConfigurationTarget.Global);

            if (provider !== 'copilot') {
                const apiKey = await vscode.window.showInputBox({
                    prompt: `Enter your ${provider} API key`,
                    password: true,
                    placeHolder: 'sk-...',
                });
                if (apiKey) {
                    await ctx.context.secrets.store('httpForge.ai.apiKey', apiKey);
                    vscode.window.showInformationMessage(`AI provider set to ${provider}. API key stored securely.`);
                }
            } else {
                vscode.window.showInformationMessage('AI provider set to Copilot.');
            }

            if (provider === 'custom') {
                const baseUrl = await vscode.window.showInputBox({
                    prompt: 'Enter the custom OpenAI-compatible base URL',
                    placeHolder: 'https://api.example.com/v1',
                });
                if (baseUrl) {
                    await cfg.update('ai.customBaseUrl', baseUrl, vscode.ConfigurationTarget.Global);
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('httpForge.testAiProvider', async () => {
            try {
                const provider = await createAiProvider(ctx.context.secrets);
                const result = await provider.complete('Say "Hello" in one word.');
                vscode.window.showInformationMessage(`AI provider works! Response: ${result.trim()}`);
            } catch (err) {
                vscode.window.showErrorMessage(`AI provider error: ${(err as Error).message}`);
            }
        })
    );
}
