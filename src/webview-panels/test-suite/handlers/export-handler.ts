/**
 * Export Handler
 * 
 * Handles exporting test suite run reports to JSON, HTML, or statistics files.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles report export
 * - Open/Closed: New export formats can be added by extending
 * - Dependency Inversion: Depends on IWebviewMessenger abstraction
 */

import * as fs from 'fs';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../shared-interfaces';

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'html' | 'statistics';

interface ExportData {
    suite?: any;
    results?: any[];
    statistics?: any;
}

/**
 * Handler for exporting run reports
 */
export class ExportHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['exportReport'];

    getSupportedCommands(): string[] {
        return ExportHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, _messenger: IWebviewMessenger): Promise<boolean> {
        if (command === 'exportReport') {
            await this.exportReport(message.format, message.data || message.content);
            return true;
        }
        return false;
    }

    /**
     * Export report to file
     */
    private async exportReport(format: ExportFormat, data: ExportData | string): Promise<void> {
        let content: string;
        let extension: string;
        
        if (typeof data === 'string') {
            content = data;
            extension = format;
        } else {
            switch (format) {
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    extension = 'json';
                    break;
                case 'html':
                    content = this.generateHtmlReport(data);
                    extension = 'html';
                    break;
                case 'statistics':
                    content = JSON.stringify(data.statistics, null, 2);
                    extension = 'json';
                    break;
                default:
                    content = JSON.stringify(data, null, 2);
                    extension = 'json';
            }
        }
        
        const defaultFileName = `test-suite-run-${Date.now()}.${extension}`;

        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(defaultFileName),
            filters: extension === 'html'
                ? { 'HTML Files': ['html'] }
                : { 'JSON Files': ['json'] }
        });

        if (saveUri) {
            await fs.promises.writeFile(saveUri.fsPath, content, 'utf8');
            vscode.window.showInformationMessage(`Report saved to ${saveUri.fsPath}`);
        }
    }
    
    /**
     * Generate HTML report from data
     */
    private generateHtmlReport(data: ExportData): string {
        const { suite, results, statistics } = data;
        const suiteName = suite?.name || 'Test Suite';
        const timestamp = new Date().toLocaleString();
        
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${suiteName} - Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; margin: 0; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #fff; margin-bottom: 5px; }
        .timestamp { color: #888; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
        .summary-card { background: #252526; padding: 15px; border-radius: 8px; text-align: center; }
        .summary-card .value { font-size: 2em; font-weight: bold; }
        .summary-card.passed .value { color: #4caf50; }
        .summary-card.failed .value { color: #f44336; }
        .summary-card.skipped .value { color: #ff9800; }
        .summary-card.total .value { color: #2196f3; }
        .results { background: #252526; border-radius: 8px; padding: 15px; }
        .result-item { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #333; }
        .result-item:last-child { border-bottom: none; }
        .result-icon { width: 24px; text-align: center; font-weight: bold; }
        .result-icon.passed { color: #4caf50; }
        .result-icon.failed { color: #f44336; }
        .result-method { font-weight: bold; color: #569cd6; margin-left: 8px; min-width: 60px; font-size: 0.85em; }
        .result-name { flex: 1; margin-left: 10px; }
        .result-status { color: #888; min-width: 50px; text-align: right; }
        .result-duration { color: #888; min-width: 80px; text-align: right; }
        .statistics { background: #252526; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
        .statistics h2 { margin-top: 0; color: #fff; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
        th { color: #888; font-weight: normal; font-size: 0.9em; }
        td:not(:first-child), th:not(:first-child) { text-align: right; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${suiteName}</h1>
        <p class="timestamp">Generated: ${timestamp}</p>
        
        <div class="summary">
            <div class="summary-card total">
                <div class="value">${statistics?.passed + statistics?.failed || results?.length || 0}</div>
                <div class="label">Total</div>
            </div>
            <div class="summary-card passed">
                <div class="value">${statistics?.passed || results?.filter((r: any) => r.passed).length || 0}</div>
                <div class="label">Passed</div>
            </div>
            <div class="summary-card failed">
                <div class="value">${statistics?.failed || results?.filter((r: any) => !r.passed).length || 0}</div>
                <div class="label">Failed</div>
            </div>
            <div class="summary-card skipped">
                <div class="value">${statistics?.skipped || 0}</div>
                <div class="label">Skipped</div>
            </div>
        </div>
        
        ${statistics?.byRequest?.length ? `
        <div class="statistics">
            <h2>Response Time Statistics</h2>
            <table>
                <thead>
                    <tr>
                        <th>Request</th>
                        <th>Count</th>
                        <th>Min</th>
                        <th>Avg</th>
                        <th>P95</th>
                        <th>P99</th>
                        <th>Max</th>
                    </tr>
                </thead>
                <tbody>
                    ${statistics.byRequest.map((s: any) => `
                    <tr>
                        <td>${s.name}</td>
                        <td>${s.count}</td>
                        <td>${s.min}ms</td>
                        <td>${Math.round(s.avg)}ms</td>
                        <td>${s.p95}ms</td>
                        <td>${s.p99}ms</td>
                        <td>${s.max}ms</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <div class="results">
            <h2>Results</h2>
            ${(results || []).map((r: any) => {
                // Support both compact (r.n, r.p, r.d) and expanded (r.name, r.passed, r.duration) formats
                const name = r.name || r.n || 'Unknown';
                const passed = r.passed !== undefined ? r.passed : r.p;
                const duration = r.duration !== undefined ? r.duration : r.d;
                const method = r.method || (r.m !== undefined ? ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'][r.m] : 'GET');
                const status = r.status !== undefined ? r.status : r.s;
                return `
                <div class="result-item">
                    <span class="result-icon ${passed ? 'passed' : 'failed'}">${passed ? '✓' : '✗'}</span>
                    <span class="result-method">${method}</span>
                    <span class="result-name">${name}</span>
                    <span class="result-status">${status || '-'}</span>
                    <span class="result-duration">${duration}ms</span>
                </div>
            `}).join('')}
        </div>
    </div>
</body>
</html>`;
    }
}
