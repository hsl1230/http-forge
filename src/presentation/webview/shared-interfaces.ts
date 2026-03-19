/**
 * Shared Webview Panel Interfaces
 * 
 * Common interfaces used by all webview panels.
 * Following SOLID principles:
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: Handlers depend on abstractions
 */

import * as vscode from 'vscode';

// ============================================
// Webview Communication Interfaces
// ============================================

/**
 * Base interface for webview communication
 * Interface Segregation: Clients only depend on methods they use
 */
export interface IWebviewMessenger {
    postMessage(message: unknown): void;
}

/**
 * Webview panel wrapper implementing IWebviewMessenger
 * Allows handlers to communicate with webview without direct panel dependency
 */
export class WebviewMessenger implements IWebviewMessenger {
    constructor(private panel: vscode.WebviewPanel | undefined) {}

    postMessage(message: unknown): void {
        this.panel?.webview.postMessage(message);
    }

    setPanel(panel: vscode.WebviewPanel | undefined): void {
        this.panel = panel;
    }
}

// ============================================
// Handler Interfaces
// ============================================

/**
 * Base interface for message handlers
 * Single Responsibility: Each handler handles one type of concern
 * Open/Closed: New handlers can be added without modifying existing code
 */
export interface IMessageHandler {
    getSupportedCommands(): string[];
    handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean>;
}

// ============================================
// Message Router
// ============================================

/**
 * Routes webview messages to appropriate handlers
 * 
 * SOLID Principles:
 * - Open/Closed: New handlers can be added without modifying this class
 * - Dependency Inversion: Depends on IMessageHandler abstraction
 * - Single Responsibility: Only routes messages, doesn't process them
 */
export class WebviewMessageRouter {
    private handlers: IMessageHandler[] = [];
    private commandMap: Map<string, IMessageHandler> = new Map();

    /**
     * Register a message handler
     * New handlers can be added without modifying existing code (Open/Closed)
     */
    registerHandler(handler: IMessageHandler): void {
        this.handlers.push(handler);

        // Build command lookup map for O(1) dispatch
        for (const command of handler.getSupportedCommands()) {
            this.commandMap.set(command, handler);
        }
    }

    /**
     * Register multiple handlers at once
     */
    registerHandlers(handlers: IMessageHandler[]): void {
        for (const handler of handlers) {
            this.registerHandler(handler);
        }
    }

    /**
     * Route a message to the appropriate handler
     * Returns true if the message was handled
     */
    async route(message: any, messenger: IWebviewMessenger): Promise<boolean> {
        const command = message.command || message.type;

        if (!command) {
            console.warn('[WebviewMessageRouter] Message has no command or type:', message);
            return false;
        }

        // Fast lookup using command map
        const handler = this.commandMap.get(command);
        if (handler) {
            return await handler.handle(command, message, messenger);
        }

        console.warn(`[WebviewMessageRouter] No handler found for command: ${command}`);
        return false;
    }

    /**
     * Get list of all registered commands (useful for debugging)
     */
    getRegisteredCommands(): string[] {
        return Array.from(this.commandMap.keys());
    }

    /**
     * Clear all handlers (useful for testing)
     */
    clear(): void {
        this.handlers = [];
        this.commandMap.clear();
    }
}
