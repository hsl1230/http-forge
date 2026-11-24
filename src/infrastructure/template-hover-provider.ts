import * as path from 'path';
import * as vscode from 'vscode';
import type { ICollectionService, IEnvironmentConfigService } from '@http-forge/core';

const DYNAMIC_VARIABLES: Record<string, string> = {
  $guid: 'Generate a UUID v4',
  $uuid: 'Generate a UUID v4',
  $randomUUID: 'Generate a UUID v4',
  $randomInt: 'Random integer (0-999), or $randomInt(min, max)',
  $timestamp: 'Current Unix timestamp in milliseconds',
  $timestamp_s: 'Current Unix timestamp in seconds',
  $isoTimestamp: 'Current ISO 8601 timestamp',
  $datetime: 'Current ISO 8601 datetime',
  $date: 'Current date (YYYY-MM-DD)',
  $time: 'Current time (HH:mm:ss)',
  $randomString: 'Random alphanumeric string',
  $randomHexadecimal: 'Random hex string',
  $randomEmail: 'Random email address',
  $randomBoolean: 'Random true/false',
  $base64Encode: 'Base64 encode text',
  $base64Decode: 'Base64 decode text',
  $urlEncode: 'URL encode text',
  $urlDecode: 'URL decode text',
};

const FILTERS: Record<string, string> = {
  upper: 'Convert to UPPERCASE',
  lower: 'Convert to lowercase',
  trim: 'Remove leading/trailing whitespace',
  length: 'Get string or array length',
  substring: 'Extract substring(start, end)',
  replace: 'Replace all occurrences',
  split: 'Split into array',
  join: 'Join array to string',
  removeQuotes: 'Remove all quote characters',
  removeSpaces: 'Remove all whitespace',
  format: 'Format template',
  add: 'Add number',
  subtract: 'Subtract number',
  multiply: 'Multiply by number',
  abs: 'Absolute value',
  btoa: 'Base64 encode',
  atob: 'Base64 decode',
  urlEncode: 'URL encode (percent-encoding)',
  urlDecode: 'URL decode',
  hash: 'Hash value',
  hmac: 'HMAC value',
  first: 'First element of array',
  last: 'Last element of array',
  at: 'Element at index',
  slice: 'Slice array',
  unique: 'Remove duplicate values',
  filter: 'Filter array',
  map: 'Extract fields',
  prop: 'Get property',
  parseJSON: 'Parse JSON string to object',
  stringify: 'Convert to JSON string',
  isEmail: 'Check if value is a valid email',
  isUrl: 'Check if value is a valid URL',
};

export class HttpForgeTemplateHoverProvider implements vscode.HoverProvider {
  constructor(
    private readonly envConfigService: IEnvironmentConfigService,
    private readonly collectionService: ICollectionService
  ) {}

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    if (!document.fileName.includes('.http-forge')) {
      return undefined;
    }

    const text = document.getText();
    const offset = document.offsetAt(position);
    const regex = /\{\{([\s\S]*?)\}\}/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const contentStart = match.index + 2;
      const contentEnd = match.index + match[0].length - 2;
      if (offset < contentStart || offset > contentEnd) {
        continue;
      }

      const content = match[1];
      const relativeOffset = offset - contentStart;
      const tokenRegex = /\$?\w+/g;
      let tokenMatch: RegExpExecArray | null;
      let token: string | null = null;
      let tokenStart = -1;
      let tokenEnd = -1;

      while ((tokenMatch = tokenRegex.exec(content)) !== null) {
        const start = tokenMatch.index;
        const end = start + tokenMatch[0].length;
        if (relativeOffset >= start && relativeOffset <= end) {
          token = tokenMatch[0];
          tokenStart = start;
          tokenEnd = end;
          break;
        }
      }

      if (!token) {
        return undefined;
      }

      const lines: string[] = [];
      const lastPipe = content.lastIndexOf('|');
      const isFilter = lastPipe !== -1 && tokenStart > lastPipe;
      const isDynamic = token.startsWith('$');

      if (isFilter) {
        lines.push(`**${token}** — ${FILTERS[token] || 'Template filter'}`);
      } else if (isDynamic) {
        lines.push(`**${token}** — ${DYNAMIC_VARIABLES[token] || 'Dynamic variable'}`);
      } else {
        const entries = this.getVariableEntries(token, document);
        if (entries.length === 0) {
          lines.push(`**${token}** — _(not defined)_`);
        } else if (entries.length === 1) {
          lines.push(`**${token}** = \`${entries[0].value}\``);
          lines.push(`Scope: *${entries[0].scope}*`);
        } else {
          lines.push(`**${token}**`);
          for (const entry of entries) {
            lines.push(`- *${entry.scope}*: \`${entry.value}\``);
          }
        }
      }

      const startPos = document.positionAt(contentStart + tokenStart);
      const endPos = document.positionAt(contentStart + tokenEnd);
      const range = new vscode.Range(startPos, endPos);

      return new vscode.Hover(new vscode.MarkdownString(lines.join('\n'), true), range);
    }

    return undefined;
  }

  private getVariableEntries(name: string, document: vscode.TextDocument): Array<{ scope: string; value: string }> {
    const entries: Array<{ scope: string; value: string }> = [];
    const seen = new Set<string>();

    const add = (scope: string, value: unknown) => {
      if (value === undefined) return;
      const display = this.displayValue(value);
      const key = `${scope}:${display}`;
      if (seen.has(key)) return;
      seen.add(key);
      entries.push({ scope, value: display });
    };

    try {
      const globals = this.envConfigService.getGlobalVariables();
      add('global', globals?.[name]);
    } catch {
      // Ignore unavailable config.
    }

    try {
      const selected = this.envConfigService.getSelectedEnvironment();
      const resolved = this.envConfigService.getResolvedEnvironment(selected);
      add('env', resolved?.variables?.[name]);
    } catch {
      // Ignore unavailable config.
    }

    const envName = path.basename(document.fileName, '.json');
    try {
      const env = this.envConfigService.getAllEnvironments().find((e) => e.name === envName);
      add('env file', env?.variables?.[name]);
    } catch {
      // Ignore unavailable config.
    }

    try {
      for (const collection of this.collectionService.getAllCollections()) {
        const locals = this.collectionService.getCollectionVariableLocals(collection.id);
        add('collection', locals[name] ?? collection.variables?.[name]);
      }
    } catch {
      // Ignore unavailable config.
    }

    return entries;
  }

  /** Strip the internal typed-variable marker before showing a value. */
  private displayValue(value: unknown): string {
    if (typeof value === 'string' && value.charCodeAt(0) === 0x1E) {
      const json = value.slice(1);
      return json === 'undefined' ? '' : json;
    }
    return String(value);
  }
}
