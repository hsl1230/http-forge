/**
 * MCP Server Controller.
 *
 * Single Responsibility: own the entire MCP server lifecycle — lazy server
 * construction, status-bar UI, start/stop/toggle commands, tool-cache
 * invalidation on collection/suite changes, and optional auto-start.
 */

import type {
  CollectionService,
  ConfigService,
  EnvironmentConfigService,
  TestSuiteService,
} from '@http-forge/core';
import * as vscode from 'vscode';
import { CopilotAiProvider } from '../copilot-ai-provider';
import { COMMAND_IDS } from '../../shared/constants';
import { McpExecutor } from './mcp-executor';
import { McpServerService } from './mcp-server';
import { McpToolRegistry } from './mcp-tool-registry';

export interface McpServerControllerDeps {
  context: vscode.ExtensionContext;
  workspaceFolder: string;
  collectionService: CollectionService;
  envConfigService: EnvironmentConfigService;
  configService: ConfigService;
  testSuiteService: TestSuiteService;
}

/**
 * Owns the MCP server lifecycle. Services are injected (Dependency
 * Inversion); the controller builds the server lazily so it never starts
 * before the rest of the extension is initialised.
 */
export class McpServerController {
  private server: McpServerService | undefined;

  constructor(private readonly deps: McpServerControllerDeps) {}

  /**
   * Register MCP commands + status bar and (optionally) auto-start.
   * Call once from the composition root after services are ready.
   */
  setup(): void {
    const { context } = this.deps;

    const mcpStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    mcpStatusBar.text = '$(radio-tower) MCP';
    mcpStatusBar.tooltip = 'HTTP Forge MCP Server — click to toggle';
    mcpStatusBar.command = COMMAND_IDS.mcpToggleServer;
    context.subscriptions.push(mcpStatusBar);

    const updateMcpStatus = () => {
      if (this.server?.isRunning()) {
        mcpStatusBar.text = `$(radio-tower) MCP ● ${this.server.getPort()}`;
        mcpStatusBar.backgroundColor = undefined;
        mcpStatusBar.show();
      } else {
        mcpStatusBar.text = '$(radio-tower) MCP ○';
        mcpStatusBar.show();
      }
    };

    const startMcpServer = async (): Promise<void> => {
      const server = this.getOrCreateServer();
      await server.start();
      updateMcpStatus();
      vscode.window.showInformationMessage(`HTTP Forge MCP Server started on port ${server.getPort()}`);
    };

    const stopMcpServer = async (): Promise<void> => {
      if (this.server?.isRunning()) {
        await this.server.stop();
      }
      updateMcpStatus();
    };

    updateMcpStatus();

    context.subscriptions.push(
      vscode.commands.registerCommand(COMMAND_IDS.mcpStartServer, async () => {
        try {
          await startMcpServer();
        } catch (e: any) {
          vscode.window.showErrorMessage(`MCP Server: ${e.message}`);
        }
      }),
      vscode.commands.registerCommand(COMMAND_IDS.mcpStopServer, async () => {
        if (this.server?.isRunning()) {
          await stopMcpServer();
          vscode.window.showInformationMessage('HTTP Forge MCP Server stopped');
          return;
        }
        updateMcpStatus();
        vscode.window.showInformationMessage('HTTP Forge MCP Server is already stopped');
      }),
      vscode.commands.registerCommand(COMMAND_IDS.mcpToggleServer, async () => {
        if (this.server?.isRunning()) {
          await stopMcpServer();
          vscode.window.showInformationMessage('HTTP Forge MCP Server stopped');
        } else {
          try {
            await startMcpServer();
          } catch (e: any) {
            vscode.window.showErrorMessage(`MCP Server: ${e.message}`);
          }
        }
      }),
      new vscode.Disposable(() => {
        if (this.server?.isRunning()) {
          void this.server.stop();
        }
      })
    );

    // Auto-start MCP server if configured
    const mcpAutoStart = vscode.workspace.getConfiguration('httpForge').get<boolean>('mcpServer.autoStart', false);
    if (mcpAutoStart) {
      startMcpServer().catch((e: any) => {
        console.error(`[MCP] Auto-start failed: ${e.message}`);
      });
    }
  }

  /**
   * Build the server lazily on first start so all services are fully initialised.
   */
  private getOrCreateServer(): McpServerService {
    if (!this.server) {
      const { workspaceFolder, collectionService, envConfigService, configService, testSuiteService } = this.deps;

      // Port comes from http-forge.config.json mcp.port, defaulting to 3100
      const mcpPort: number = configService.getConfig()?.mcp?.port ?? 3100;

      const registry = new McpToolRegistry(collectionService, testSuiteService, configService);
      const executor = new McpExecutor(
        collectionService,
        envConfigService,
        testSuiteService,
        configService,
        registry,
        new CopilotAiProvider()
      );
      this.server = new McpServerService(registry, executor, mcpPort, configService, workspaceFolder);

      // Invalidate the cached tool list whenever collections or suites change on disk
      const colSvc = collectionService;
      const prevOnCollections = colSvc.onCollectionsChanged;
      colSvc.onCollectionsChanged = () => {
        prevOnCollections?.();
        registry.invalidateCache();
      };
      const suiteSvc = testSuiteService;
      const prevOnSuites = suiteSvc.onSuitesChanged;
      suiteSvc.onSuitesChanged = () => {
        prevOnSuites?.();
        registry.invalidateCache();
      };
    }
    return this.server;
  }
}
