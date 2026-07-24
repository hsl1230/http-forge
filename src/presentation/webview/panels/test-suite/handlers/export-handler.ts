/**
 * Export Handler
 *
 * Handles exporting test suite run reports.
 * HTML reports are opened directly from the pre-generated file produced by
 * ResultStorageService.finalizeRun() -- the same rich report the MCP server uses.
 * If the report file is missing it is regenerated on demand.
 * JUnit XML and statistics HTML exports use a save-dialog to write to a user-chosen location.
 */

import { HtmlReportGenerator, JUnitReportGenerator, ResultStorageService } from '@http-forge/core';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getServiceContainer } from '../../../../../infrastructure/services/service-container';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';

export type ExportFormat = 'junit' | 'html' | 'statistics-html';

interface ExportData {
    suite?: any;
    results?: any[];
    statistics?: any;
}

export class ExportHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['exportReport', 'fixErrors'];

    getSupportedCommands(): string[] {
        return ExportHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: any, _messenger: IWebviewMessenger): Promise<boolean> {
        if (command === 'exportReport') {
            await this.exportReport(message.format, message.reportPath, message.suiteId, message.runId, message.data || message.content);
            return true;
        }
        if (command === 'fixErrors') {
            await this.fixErrors(message);
            return true;
        }
        return false;
    }

    private async fixErrors(message: {
        suiteId?: string | null;
        runId?: string | null;
        suiteName?: string;
        environment?: string | null;
        noResults?: boolean;
        allPassed?: boolean;
        failedResults?: Array<{
            name: string;
            method: string;
            url: string;
            collectionName?: string;
            folderPath?: string;
            status: number;
            error: string | null;
            assertionsFailed: number;
        }>;
    }): Promise<void> {
        const hasCopilot = !!vscode.extensions.getExtension('GitHub.copilot-chat');
        if (!hasCopilot) {
            vscode.window.showInformationMessage('GitHub Copilot Chat is required. Install it from the Extensions marketplace.');
            return;
        }

        const failures = message.failedResults ?? [];

        // Handle no-results / all-passed sentinel messages from webview
        if ((message as any).noResults) {
            vscode.window.showInformationMessage('Run the test suite first to see results.');
            return;
        }
        if ((message as any).allPassed) {
            vscode.window.showInformationMessage('All requests passed — nothing to fix! ✅');
            return;
        }

        if (!failures.length) {
            vscode.window.showInformationMessage('No failed requests to analyse.');
            return;
        }

        const configService = getServiceContainer().config;
        let query: string;
        const attachFiles: vscode.Uri[] = [];
        const pathHints: string[] = [];

        const addFileCandidate = (candidate: string | null | undefined): void => {
            if (!candidate) {
                return;
            }
            const normalized = path.normalize(candidate);
            if (!normalized || !fs.existsSync(normalized)) {
                return;
            }
            const stat = fs.statSync(normalized);
            if (stat.isFile()) {
                attachFiles.push(vscode.Uri.file(normalized));
                pathHints.push(normalized);
            } else if (stat.isDirectory()) {
                pathHints.push(normalized);
            }
        };

        // Prefer run-summary.md — attach it as a file (works with absolute paths,
        // more reliable than #file: text in the query).
        const suiteId = message.suiteId;
        const runId = message.runId;
        let mdPath: string | null = null;

        if (suiteId && runId) {
            const storage = new ResultStorageService(configService);
            const runDir = path.join(storage.getBasePath(), suiteId, runId);
            const candidate = path.join(runDir, 'run-summary.md');
            if (fs.existsSync(candidate)) {
                mdPath = candidate;
                addFileCandidate(candidate);
            }
            addFileCandidate(runDir);

            // Also attach the suite file if available so Copilot can read suite metadata.
            const suitesPath = configService.getSuitesPath();
            if (suitesPath) {
                const suiteFile = path.join(suitesPath, `${suiteId}.suite.json`);
                addFileCandidate(suiteFile);
            }
        }

        if (mdPath) {
            // run-summary.md attached — Copilot reads it directly as a context file
            const pathBlock = pathHints.length
                ? `\n\nRelevant files/paths:\n- ${pathHints.join('\n- ')}`
                : '';
            query = [
                `I have test suite failures in HTTP Forge. The attached run-summary.md contains full details.`,
                ``,
                `Please analyse each failure from a business perspective following the "How to Analyse"`,
                `instructions in the file. Use MCP tools (Confluence/Jira) if available.`,
                `If no MCP tools are configured, ask me to configure one or paste the relevant docs here.`,
                `Also ask me to attach the backend service/controller code for the failing endpoints.`,
                pathBlock,
            ].join('\n').slice(0, 2000);
        } else {
            // Fallback — build inline context and attach suite file + dir if available
            const suitesPath = configService.getSuitesPath();
            if (suiteId && suitesPath) {
                const suiteFile = path.join(suitesPath, `${suiteId}.suite.json`);
                if (fs.existsSync(suiteFile)) {
                    attachFiles.push(vscode.Uri.file(suiteFile));
                }
                // Attach suite directory (contains per-request subdirs with scripts/schemas)
                const suiteDir = path.join(suitesPath, suiteId);
                if (fs.existsSync(suiteDir)) {
                    attachFiles.push(vscode.Uri.file(suiteDir));
                }
            }
            const failureList = failures
                .map((f, i) => {
                    const location = f.url
                        ? `${f.method} ${f.url}`
                        : `${f.method} — ${f.collectionName || ''}${f.folderPath ? `/${f.folderPath}` : ''} / ${f.name}`;
                    return `${i + 1}. ${f.name} (${location})\n` +
                        `   Status: ${f.status}${f.error ? ` | ${f.error}` : ''}` +
                        (f.assertionsFailed > 0 ? ` | ${f.assertionsFailed} assertion(s) failed` : '');
                }).join('\n');
            const envBlock = message.environment ? `\nEnvironment: ${message.environment}` : '';
            query = [
                `Test suite "${message.suiteName ?? 'Test Suite'}" has ${failures.length} failure${failures.length !== 1 ? 's' : ''}.${envBlock}`,
                ``,
                `Failed requests:`,
                failureList.slice(0, 1500),
                ``,
                `Please analyse each failure from a business perspective.`,
                `Use Confluence/Jira MCP tools to find requirements. If no MCP tools are configured,`,
                `ask me to configure one or paste the relevant documentation here.`,
                `Ask me to attach the backend service/controller code for the failing endpoints.`,
                `Do NOT suggest disabling or weakening assertions.`,
            ].join('\n').slice(0, 3000);
        }

        try {
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query,
                ...(attachFiles.length ? { attachFiles } : {})
            });
        } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to open Copilot Chat: ${err?.message ?? err}`);
        }
    }

    private async exportReport(
        format: ExportFormat,
        reportPath: string | null | undefined,
        suiteId: string | null | undefined,
        runId: string | null | undefined,
        data: ExportData | string | undefined
    ): Promise<void> {
        if (format === 'html') {
            let resolvedPath = reportPath;

            // If no path or file has been deleted, regenerate from stored run data
            if (!resolvedPath || !fs.existsSync(resolvedPath)) {
                if (!suiteId || !runId) {
                    vscode.window.showWarningMessage(
                        'No HTML report available. Run the test suite first to generate a report.'
                    );
                    return;
                }
                vscode.window.showInformationMessage('Regenerating HTML report…');
                try {
                    const configService = getServiceContainer().config;
                    const storage = new ResultStorageService(configService);
                    const basePath = storage.getBasePath();
                    const reportOptions = configService.getRunnerConfig().report;
                    resolvedPath = await new HtmlReportGenerator(basePath, reportOptions).generate(suiteId, runId);
                } catch (e: any) {
                    vscode.window.showErrorMessage(`Failed to regenerate report: ${e?.message ?? e}`);
                    return;
                }
                if (!resolvedPath) {
                    vscode.window.showErrorMessage('Report regeneration failed.');
                    return;
                }
            }

            // Open the rich HTML report in the system browser
            await vscode.env.openExternal(vscode.Uri.file(resolvedPath));
            return;
        }

        if (format === 'junit') {
            if (!suiteId || !runId) {
                vscode.window.showWarningMessage('No run data available. Run the test suite first.');
                return;
            }
            let junitPath: string;
            try {
                const configService = getServiceContainer().config;
                const basePath = new ResultStorageService(configService).getBasePath();
                junitPath = await new JUnitReportGenerator(basePath).generate(suiteId, runId);
            } catch (e: any) {
                vscode.window.showErrorMessage(`Failed to generate JUnit XML: ${e?.message ?? e}`);
                return;
            }
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(path.basename(junitPath)),
                filters: { 'JUnit XML': ['xml'] }
            });
            if (saveUri) {
                await fs.promises.copyFile(junitPath, saveUri.fsPath);
                vscode.window.showInformationMessage('JUnit XML saved to ' + saveUri.fsPath);
            }
            return;
        }

        if (format === 'statistics-html') {
            // Statistics HTML report — build and save
            const html = this.buildStatisticsHtml(data as ExportData);
            const defaultFileName = `test-suite-statistics-${Date.now()}.html`;
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultFileName),
                filters: { 'HTML Files': ['html'] }
            });
            if (saveUri) {
                await fs.promises.writeFile(saveUri.fsPath, html, 'utf8');
                const openAction = await vscode.window.showInformationMessage(
                    'Statistics report saved.',
                    'Open in Browser'
                );
                if (openAction === 'Open in Browser') {
                    await vscode.env.openExternal(vscode.Uri.file(saveUri.fsPath));
                }
            }
            return;
        }
    }

    // ─── Statistics HTML builder ─────────────────────────────────────────────

    private buildStatisticsHtml(data: ExportData | undefined): string {
        const stats = (data as any)?.statistics;
        const suiteName = data?.suite?.name || 'Test Suite';
        const generated = new Date().toLocaleString();

        if (!stats) {
            return `<!DOCTYPE html><html><body><p>No statistics data available.</p></body></html>`;
        }

        const summary = stats.summary || {};
        const byRequest: Record<string, any> = stats.byRequest || {};
        const errors: Record<string, number> = stats.errors || {};

        const requestRows = Object.entries(byRequest).map(([id, s]: [string, any]) => {
            const name = s.name || id;
            const passClass = (s.failedCount || 0) === 0 ? 'ok' : 'fail';
            return `<tr>
              <td>${this.htmlEsc(name)}</td>
              <td>${s.totalCount ?? 0}</td>
              <td>${this.fmtMs(s.minDuration)}</td>
              <td>${this.fmtMs(s.avgDuration)}</td>
              <td>${this.fmtMs(s.p95)}</td>
              <td>${this.fmtMs(s.p99)}</td>
              <td>${this.fmtMs(s.maxDuration)}</td>
              <td class="${passClass}">${s.passedCount ?? 0} / ${s.totalCount ?? 0}</td>
            </tr>`;
        }).join('');

        const errorRows = Object.entries(errors).map(([type, count]) =>
            `<tr><td>${this.htmlEsc(type)}</td><td>${count}</td></tr>`
        ).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${this.htmlEsc(suiteName)} — Statistics Report</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#f5f5f5;color:#222}
  h1{font-size:1.4rem;margin-bottom:4px}
  .meta{color:#666;font-size:.85rem;margin-bottom:24px}
  .summary{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:28px}
  .card{background:#fff;border-radius:8px;padding:16px 24px;min-width:120px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
  .card .val{font-size:2rem;font-weight:700}
  .card .lbl{font-size:.8rem;color:#666;margin-top:4px}
  .card.pass .val{color:#22863a}.card.fail .val{color:#cb2431}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);margin-bottom:24px}
  th{background:#f0f0f0;padding:10px 14px;text-align:left;font-size:.82rem;text-transform:uppercase;letter-spacing:.04em}
  td{padding:9px 14px;border-top:1px solid #eee;font-size:.88rem}
  tr:hover td{background:#fafafa}
  .ok{color:#22863a;font-weight:600}.fail{color:#cb2431;font-weight:600}
  h2{font-size:1rem;margin:24px 0 8px}
</style>
</head>
<body>
<h1>${this.htmlEsc(suiteName)} — Statistics Report</h1>
<p class="meta">Generated: ${this.htmlEsc(generated)}</p>

<div class="summary">
  <div class="card"><div class="val">${summary.totalRequests ?? 0}</div><div class="lbl">Total Requests</div></div>
  <div class="card pass"><div class="val">${summary.passed ?? 0}</div><div class="lbl">Passed</div></div>
  <div class="card fail"><div class="val">${summary.failed ?? 0}</div><div class="lbl">Failed</div></div>
  <div class="card"><div class="val">${summary.passRate ?? 0}%</div><div class="lbl">Pass Rate</div></div>
  <div class="card"><div class="val">${this.fmtMs(summary.avgDuration ?? 0)}</div><div class="lbl">Avg Duration</div></div>
  <div class="card"><div class="val">${this.fmtMs(summary.totalDuration ?? 0)}</div><div class="lbl">Total Duration</div></div>
</div>

<h2>Response Time by Request</h2>
<table>
  <thead><tr><th>Request</th><th>Calls</th><th>Min</th><th>Avg</th><th>P95</th><th>P99</th><th>Max</th><th>Pass / Total</th></tr></thead>
  <tbody>${requestRows || '<tr><td colspan="8">No data</td></tr>'}</tbody>
</table>

${Object.keys(errors).length ? `
<h2>Error Summary</h2>
<table>
  <thead><tr><th>Error Type</th><th>Count</th></tr></thead>
  <tbody>${errorRows}</tbody>
</table>` : ''}
</body>
</html>`;
    }

    private htmlEsc(s: unknown): string {
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    private fmtMs(ms: number | undefined): string {
        if (!ms) return '0ms';
        return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
    }
}
