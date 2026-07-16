/**
 * Suite File Handler for Test Suite panel
 *
 * Handles suite lifecycle actions backed by *.suite.json files.
 */

import { ITestSuiteStore, TestSuite, TestSuiteService } from '@http-forge/core';
import * as vscode from 'vscode';
import { IMessageHandler, IWebviewMessenger } from '../../../shared-interfaces';

type SuiteAction = 'open' | 'create' | 'rename' | 'duplicate' | 'delete' | 'refresh';

export class SuiteFileHandler implements IMessageHandler {
    private static readonly SUPPORTED_COMMANDS = ['manageSuiteFiles'];

    constructor(
        private readonly testSuiteService: TestSuiteService,
        private readonly suiteStore: ITestSuiteStore,
        private readonly onSuiteSelected: (suite: TestSuite) => void,
        private readonly onClosePanel: () => void
    ) {}

    getSupportedCommands(): string[] {
        return SuiteFileHandler.SUPPORTED_COMMANDS;
    }

    async handle(command: string, message: { action?: SuiteAction }, _messenger: IWebviewMessenger): Promise<boolean> {
        if (command !== 'manageSuiteFiles' || !message.action) {
            return false;
        }

        switch (message.action) {
            case 'open':
                await this.handleOpen();
                return true;
            case 'create':
                await this.handleCreate();
                return true;
            case 'rename':
                await this.handleRename();
                return true;
            case 'duplicate':
                await this.handleDuplicate();
                return true;
            case 'delete':
                await this.handleDelete();
                return true;
            case 'refresh':
                await this.handleRefresh();
                return true;
            default:
                return false;
        }
    }

    private async handleOpen(): Promise<void> {
        const suites = await this.testSuiteService.getAllSuites();
        if (suites.length === 0) {
            vscode.window.showInformationMessage('No test suites found. Create one first.');
            return;
        }

        const pick = await vscode.window.showQuickPick(
            suites
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(suite => ({
                    label: suite.name,
                    description: suite.id,
                    suite
                })),
            { placeHolder: 'Select a test suite to open' }
        );

        if (pick?.suite) {
            this.onSuiteSelected(pick.suite);
        }
    }

    private async handleCreate(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter test suite name',
            placeHolder: 'My Test Suite'
        });

        if (!name) {
            return;
        }

        const suite = await this.testSuiteService.createSuite(name);
        this.onSuiteSelected(suite);
        await this.handleRefresh();
        vscode.window.showInformationMessage(`Test Suite "${suite.name}" created`);
    }

    private async handleRename(): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite) {
            vscode.window.showWarningMessage('No test suite is currently loaded.');
            return;
        }

        const newName = await vscode.window.showInputBox({
            prompt: 'Enter new name for test suite',
            value: suite.name,
            placeHolder: 'Test Suite Name'
        });

        if (!newName || newName === suite.name) {
            return;
        }

        const updatedSuite: TestSuite = { ...suite, name: newName };
        await this.testSuiteService.updateSuite(updatedSuite);
        this.onSuiteSelected(updatedSuite);
        await this.handleRefresh();
    }

    private async handleDuplicate(): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite) {
            vscode.window.showWarningMessage('No test suite is currently loaded.');
            return;
        }

        const newName = await vscode.window.showInputBox({
            prompt: 'Enter name for the duplicated test suite',
            value: `${suite.name} (Copy)`
        });

        if (!newName) {
            return;
        }

        const duplicated = await this.testSuiteService.duplicateSuite(suite.id, newName);
        this.onSuiteSelected(duplicated);
        await this.handleRefresh();
        vscode.window.showInformationMessage(`Test Suite "${duplicated.name}" created`);
    }

    private async handleDelete(): Promise<void> {
        const suite = this.suiteStore.getSuite();
        if (!suite) {
            vscode.window.showWarningMessage('No test suite is currently loaded.');
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Delete test suite "${suite.name}"?`,
            { modal: true },
            'Delete'
        );

        if (confirm !== 'Delete') {
            return;
        }

        const deleted = await this.testSuiteService.deleteSuite(suite.id);
        if (!deleted) {
            vscode.window.showErrorMessage(`Failed to delete test suite "${suite.name}".`);
            return;
        }

        await this.handleRefresh();

        const remainingSuites = await this.testSuiteService.getAllSuites();
        if (remainingSuites.length === 0) {
            vscode.window.showInformationMessage('Test Suite deleted');
            this.onClosePanel();
            return;
        }

        const nextSuite = remainingSuites.slice().sort((a, b) => a.name.localeCompare(b.name))[0];
        this.onSuiteSelected(nextSuite);
        vscode.window.showInformationMessage('Test Suite deleted');
    }

    private async handleRefresh(): Promise<void> {
        await vscode.commands.executeCommand('httpForge.refreshTestSuites');
    }
}