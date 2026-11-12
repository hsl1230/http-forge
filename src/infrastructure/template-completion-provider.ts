import * as path from 'path';
import * as vscode from 'vscode';
import type { ICollectionService, IEnvironmentConfigService } from '@http-forge/core';

const DYNAMIC_VARIABLES = [
    { name: '$guid', description: 'Generate a UUID v4' },
    { name: '$uuid', description: 'Generate a UUID v4' },
    { name: '$randomUUID', description: 'Generate a UUID v4' },
    { name: '$randomInt', description: 'Random integer (0-999), or $randomInt(min, max)', snippet: '$randomInt($1, $2)' },
    { name: '$timestamp', description: 'Current Unix timestamp in milliseconds' },
    { name: '$timestamp_s', description: 'Current Unix timestamp in seconds' },
    { name: '$isoTimestamp', description: 'Current ISO 8601 timestamp' },
    { name: '$datetime', description: 'Current ISO 8601 datetime' },
    { name: '$date', description: 'Current date (YYYY-MM-DD)' },
    { name: '$time', description: 'Current time (HH:mm:ss)' },
    { name: '$randomString', description: 'Random alphanumeric string', snippet: '$randomString($1)' },
    { name: '$randomHexadecimal', description: 'Random hex string', snippet: '$randomHexadecimal($1)' },
    { name: '$randomEmail', description: 'Random email address' },
    { name: '$randomBoolean', description: 'Random true/false' },
    { name: '$base64Encode', description: 'Base64 encode text', snippet: '$base64Encode($1)' },
    { name: '$base64Decode', description: 'Base64 decode text', snippet: '$base64Decode($1)' },
    { name: '$urlEncode', description: 'URL encode text', snippet: '$urlEncode($1)' },
    { name: '$urlDecode', description: 'URL decode text', snippet: '$urlDecode($1)' },
];

const FILTERS = [
    'upper', 'lower', 'trim', 'length', 'substring', 'replace', 'split', 'join',
    'removeQuotes', 'removeSpaces', 'format', 'add', 'subtract', 'multiply', 'abs',
    'btoa', 'atob', 'urlEncode', 'urlDecode', 'hash', 'hmac', 'first', 'last',
    'at', 'slice', 'unique', 'filter', 'map', 'prop', 'parseJSON', 'stringify',
    'isEmail', 'isUrl',
];

export class HttpForgeTemplateCompletionProvider implements vscode.CompletionItemProvider {
  constructor(
    private readonly envConfigService: IEnvironmentConfigService,
    private readonly collectionService: ICollectionService
  ) {}

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    if (!document.fileName.includes('.http-forge')) {
      return [];
    }

    const line = document.lineAt(position.line).text;
    const textUntilPosition = line.substring(0, position.character);
    const lastOpen = textUntilPosition.lastIndexOf('{{');
    const lastClose = textUntilPosition.lastIndexOf('}}');
    const insideTemplate = lastOpen !== -1 && lastOpen > lastClose;

    if (!insideTemplate && !textUntilPosition.endsWith('{{')) {
      return [];
    }

    const replaceLength = this.getReplaceLength(textUntilPosition, insideTemplate);
    const range = new vscode.Range(position.line, position.character - replaceLength, position.line, position.character);
    const suggestions: vscode.CompletionItem[] = [];

    if (textUntilPosition.endsWith('{{')) {
      this.addVariables(suggestions, range, document);
      this.addDynamicVariables(suggestions, range);
      const atSnippet = new vscode.CompletionItem('@ | filter', vscode.CompletionItemKind.Snippet);
      atSnippet.insertText = new vscode.SnippetString('@ | ${1:filterName}');
      atSnippet.range = range;
      atSnippet.detail = 'No-input filter expression';
      suggestions.push(atSnippet);
      return suggestions;
    }

    const templateContent = textUntilPosition.substring(lastOpen + 2);

    const pipeMatch = templateContent.match(/\|\s*(\w*)$/);
    if (pipeMatch) {
      const partial = pipeMatch[1];
      for (const filter of FILTERS) {
        if (!partial || filter.toLowerCase().startsWith(partial.toLowerCase())) {
          const item = new vscode.CompletionItem(filter, vscode.CompletionItemKind.Function);
          item.range = range;
          item.detail = 'Template filter';
          suggestions.push(item);
        }
      }
      return suggestions;
    }

    const dollarMatch = templateContent.match(/\$(\w*)$/);
    if (dollarMatch) {
      const partial = '$' + dollarMatch[1];
      for (const dv of DYNAMIC_VARIABLES) {
        if (dv.name.toLowerCase().startsWith(partial.toLowerCase())) {
          const item = new vscode.CompletionItem(dv.name, vscode.CompletionItemKind.Constant);
          item.insertText = dv.snippet ? new vscode.SnippetString(dv.snippet) : dv.name;
          item.range = range;
          item.detail = dv.description;
          suggestions.push(item);
        }
      }
      return suggestions;
    }

    this.addVariables(suggestions, range, document);
    for (const dv of DYNAMIC_VARIABLES) {
      const item = new vscode.CompletionItem(dv.name, vscode.CompletionItemKind.Constant);
      item.insertText = dv.name;
      item.range = range;
      item.detail = dv.description;
      suggestions.push(item);
    }

    return suggestions;
  }

  private getReplaceLength(textUntilPosition: string, insideTemplate: boolean): number {
    const lastOpen = textUntilPosition.lastIndexOf('{{');
    if (textUntilPosition.endsWith('{{')) return 0;
    if (!insideTemplate) return 0;
    const templateContent = textUntilPosition.substring(lastOpen + 2);
    const pipeMatch = templateContent.match(/\|\s*(\w*)$/);
    if (pipeMatch) return pipeMatch[1].length;
    const dollarMatch = templateContent.match(/\$(\w*)$/);
    if (dollarMatch) return dollarMatch[1].length + 1;
    const wordMatch = templateContent.match(/(\w*)$/);
    return wordMatch ? wordMatch[1].length : 0;
  }

  private addVariables(suggestions: vscode.CompletionItem[], range: vscode.Range, document: vscode.TextDocument): void {
    const names = new Set<string>();

    try {
      const globalVars = this.envConfigService.getGlobalVariables();
      for (const key of Object.keys(globalVars || {})) names.add(key);
    } catch {
      // Ignore unavailable config.
    }

    try {
      const selected = this.envConfigService.getSelectedEnvironment();
      const resolved = this.envConfigService.getResolvedEnvironment(selected);
      for (const key of Object.keys(resolved?.variables || {})) names.add(key);
    } catch {
      // Ignore unavailable config.
    }

    const envName = path.basename(document.fileName, '.json');
    try {
      const env = this.envConfigService.getAllEnvironments().find((e) => e.name === envName);
      for (const key of Object.keys(env?.variables || {})) names.add(key);
    } catch {
      // Ignore unavailable config.
    }

    try {
      for (const collection of this.collectionService.getAllCollections()) {
        for (const key of Object.keys(collection.variables || {})) names.add(key);
      }
    } catch {
      // Ignore unavailable config.
    }

    for (const name of names) {
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Variable);
      item.insertText = name;
      item.range = range;
      item.detail = 'Template variable';
      suggestions.push(item);
    }
  }

  private addDynamicVariables(suggestions: vscode.CompletionItem[], range: vscode.Range): void {
    for (const dv of DYNAMIC_VARIABLES) {
      const item = new vscode.CompletionItem(dv.name, vscode.CompletionItemKind.Constant);
      item.insertText = dv.snippet ? new vscode.SnippetString(dv.snippet) : dv.name;
      item.range = range;
      item.detail = dv.description;
      suggestions.push(item);
    }
  }
}
