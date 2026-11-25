import * as vscode from 'vscode';
import type { TestSuiteService, CollectionService } from '@http-forge/core';

/**
 * Coverage Report Panel — visual dashboard for test coverage.
 * Shows which endpoints have tests and which don't.
 */
export class CoverageReportPanel {
    private static instance: CoverageReportPanel | undefined;
    private panel: vscode.WebviewPanel;

    private constructor(
        extensionUri: vscode.Uri,
        private collectionService: CollectionService,
        private testSuiteService: TestSuiteService,
    ) {
        this.panel = vscode.window.createWebviewPanel(
            'httpForge.coverageReport',
            'Test Coverage Report',
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true },
        );
        this.panel.onDidDispose(() => { CoverageReportPanel.instance = undefined; });
        this.render();
    }

    static createOrShow(
        extensionUri: vscode.Uri,
        collectionService: CollectionService,
        testSuiteService: TestSuiteService,
    ): void {
        if (CoverageReportPanel.instance) {
            CoverageReportPanel.instance.panel.reveal();
            CoverageReportPanel.instance.render();
            return;
        }
        CoverageReportPanel.instance = new CoverageReportPanel(extensionUri, collectionService, testSuiteService);
    }

    private async render(): Promise<void> {
        const collections = await this.collectionService.getAllCollections();
        const suites = await this.testSuiteService.getAllSuites();

        // Build coverage data
        const coverageData: Array<{ collection: string; endpoint: string; method: string; tested: boolean }> = [];
        const testedEndpoints = new Set<string>();

        for (const suite of suites) {
            for (const node of (suite.nodes || [])) {
                if (node.type === 'request' && node.request) {
                    testedEndpoints.add(`${node.request.method}:${node.request.name}`);
                }
            }
        }

        for (const col of collections) {
            const items = (col as any).items || [];
            const walk = (list: any[], folder: string) => {
                for (const item of list) {
                    if (item.type === 'folder' && item.items) {
                        walk(item.items, folder ? `${folder}/${item.name}` : item.name);
                    } else if (item.type === 'request' || item.method) {
                        const key = `${item.method}:${item.name}`;
                        coverageData.push({
                            collection: col.name,
                            endpoint: folder ? `${folder}/${item.name}` : item.name,
                            method: item.method || 'GET',
                            tested: testedEndpoints.has(key),
                        });
                    }
                }
            };
            walk(items, '');
        }

        const total = coverageData.length;
        const tested = coverageData.filter((d) => d.tested).length;
        const percent = total > 0 ? Math.round((tested / total) * 100) : 0;

        this.panel.webview.html = this.getHtml(coverageData, total, tested, percent);
    }

    private getHtml(data: any[], total: number, tested: number, percent: number): string {
        const rows = data.map((d) => `
            <tr class="${d.tested ? 'tested' : 'untested'}">
                <td>${d.method}</td>
                <td>${d.collection}</td>
                <td>${d.endpoint}</td>
                <td>${d.tested ? '✅ Tested' : '❌ Untested'}</td>
            </tr>
        `).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test Coverage Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
        h1 { color: #569cd6; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .card { background: #2d2d2d; padding: 15px; border-radius: 8px; min-width: 120px; text-align: center; }
        .card h2 { margin: 0; font-size: 2em; }
        .card p { margin: 5px 0 0; color: #888; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #333; }
        th { background: #2d2d2d; color: #569cd6; }
        tr.tested { background: rgba(40, 167, 69, 0.1); }
        tr.untested { background: rgba(220, 53, 69, 0.1); }
        .progress { width: 100%; height: 20px; background: #333; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-bar { height: 100%; background: linear-gradient(90deg, #5cb85c, #28a745); transition: width 0.3s; }
    </style>
</head>
<body>
    <h1>Test Coverage Report</h1>
    <div class="summary">
        <div class="card"><h2>${total}</h2><p>Total Endpoints</p></div>
        <div class="card"><h2>${tested}</h2><p>Tested</p></div>
        <div class="card"><h2>${total - tested}</h2><p>Untested</p></div>
        <div class="card"><h2>${percent}%</h2><p>Coverage</p></div>
    </div>
    <div class="progress"><div class="progress-bar" style="width: ${percent}%"></div></div>
    <table>
        <thead><tr><th>Method</th><th>Collection</th><th>Endpoint</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>
</body>
</html>`;
    }
}
