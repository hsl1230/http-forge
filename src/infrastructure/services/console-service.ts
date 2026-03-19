/**
 * Console Service Implementation
 * 
 * Single Responsibility: Manages VS Code LogOutputChannel for unified logging
 * Open/Closed: Implements IConsoleService, can be extended or replaced
 * Liskov Substitution: Any IConsoleService implementation can be used interchangeably
 * Dependency Inversion: Depends on VS Code API abstraction (LogOutputChannel)
 */

import type { IConsoleService, LogEntry, LogLevel } from '@http-forge/core';
import * as vscode from 'vscode';

/**
 * Console service using VS Code's LogOutputChannel
 * Provides unified logging across all HTTP Forge panels and services
 */
export class ConsoleService implements IConsoleService {
    private readonly outputChannel: vscode.LogOutputChannel;
    private readonly listeners: Set<(entry: LogEntry) => void> = new Set();

    constructor(channelName: string = 'HTTP Forge') {
        this.outputChannel = vscode.window.createOutputChannel(channelName, { log: true });
    }

    /**
     * Log a message at the specified level
     */
    log(level: LogLevel, message: string, source?: string): void {
        const formattedMessage = this.formatMessage(message, source);
        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            message,
            source
        };

        // Log to VS Code output channel
        switch (level) {
            case 'trace':
                this.outputChannel.trace(formattedMessage);
                break;
            case 'debug':
                this.outputChannel.debug(formattedMessage);
                break;
            case 'info':
                this.outputChannel.info(formattedMessage);
                break;
            case 'warn':
                this.outputChannel.warn(formattedMessage);
                break;
            case 'error':
                this.outputChannel.error(formattedMessage);
                break;
        }

        // Auto-show output channel when content is logged (preserve focus on editor)
        this.outputChannel.show(true);

        // Notify listeners (for any UI components that want to display logs)
        this.notifyListeners(entry);
    }

    /**
     * Log trace message
     */
    trace(message: string, source?: string): void {
        this.log('trace', message, source);
    }

    /**
     * Log debug message
     */
    debug(message: string, source?: string): void {
        this.log('debug', message, source);
    }

    /**
     * Log info message
     */
    info(message: string, source?: string): void {
        this.log('info', message, source);
    }

    /**
     * Log warning message
     */
    warn(message: string, source?: string): void {
        this.log('warn', message, source);
    }

    /**
     * Log error message
     */
    error(message: string, source?: string): void {
        this.log('error', message, source);
    }

    /**
     * Log a batch of messages (useful for script console output)
     */
    logBatch(entries: Array<{ level: LogLevel; message: string }>, source?: string): void {
        for (const entry of entries) {
            this.log(entry.level, entry.message, source);
        }
    }

    /**
     * Log raw formatted lines from script console output
     * Parses lines in format "[level] message" and routes to appropriate log level
     */
    logRawLines(lines: string[], source?: string): void {
        for (const line of lines) {
            const { level, message } = this.parseRawLine(line);
            this.log(level, message, source);
        }
    }

    /**
     * Show the output channel in VS Code
     */
    show(preserveFocus: boolean = true): void {
        this.outputChannel.show(preserveFocus);
    }

    /**
     * Clear the output channel
     */
    clear(): void {
        this.outputChannel.clear();
    }

    /**
     * Add a listener for log entries
     * Useful for components that want to display logs in their own UI
     */
    addListener(listener: (entry: LogEntry) => void): void {
        this.listeners.add(listener);
    }

    /**
     * Remove a listener
     */
    removeListener(listener: (entry: LogEntry) => void): void {
        this.listeners.delete(listener);
    }

    /**
     * Dispose of resources
     */
    dispose(): void {
        this.listeners.clear();
        this.outputChannel.dispose();
    }

    /**
     * Format message with optional source prefix
     */
    private formatMessage(message: string, source?: string): string {
        if (source) {
            return `[${source}] ${message}`;
        }
        return message;
    }

    /**
     * Notify all listeners of a new log entry
     */
    private notifyListeners(entry: LogEntry): void {
        for (const listener of this.listeners) {
            try {
                listener(entry);
            } catch (error) {
                // Don't let listener errors break logging
                console.error('Console listener error:', error);
            }
        }
    }

    /**
     * Parse a raw console line in format "[level] message"
     * Returns parsed level and message, defaults to 'info' if format doesn't match
     */
    private parseRawLine(line: string): { level: LogLevel; message: string } {
        const match = line.match(/^\[(log|info|warn|error|debug|trace)\]\s*(.*)$/);
        if (match) {
            let level = match[1] as LogLevel;
            // Map 'log' to 'info' since LogLevel doesn't have 'log'
            if (level === 'log' as any) {
                level = 'info';
            }
            return { level, message: match[2] };
        }
        // Default to info if format doesn't match
        return { level: 'info', message: line };
    }
}
