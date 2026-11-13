import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { ConfigService } from '@http-forge/core';

/**
 * Resolves `require('./helper')` and `require('helper')` targets in HTTP Forge
 * scripts and custom modules to files under `scripts.modulePaths`.
 */
export class HttpForgeModuleDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private readonly configService: ConfigService) {}

  public provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
    const moduleName = getRequiredModuleAtPosition(document, position);
    if (!moduleName) {
      return undefined;
    }

    const resolvedPath = resolveModulePath(this.configService.getModulePaths(), moduleName);
    if (!resolvedPath) {
      return undefined;
    }

    const lineText = document.lineAt(position.line).text;
    if (isPositionInRequireString(lineText, position)) {
      return new vscode.Location(vscode.Uri.file(resolvedPath), new vscode.Position(0, 0));
    }

    const wordRange = document.getWordRangeAtPosition(position);
    const symbol = wordRange ? document.getText(wordRange) : undefined;
    const symbolPosition = symbol ? findSymbolPosition(resolvedPath, symbol) : undefined;

    return new vscode.Location(
      vscode.Uri.file(resolvedPath),
      symbolPosition ?? new vscode.Position(0, 0)
    );
  }
}

function getRequiredModuleAtPosition(document: vscode.TextDocument, position: vscode.Position): string | undefined {
  const line = document.lineAt(position.line).text;
  const regex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    const moduleName = match[1];
    const moduleIndex = line.indexOf(moduleName, match.index);
    const quoteStart = moduleIndex - 1;
    const quoteEnd = moduleIndex + moduleName.length + 1;
    const column = position.character;

    if (column >= quoteStart && column < quoteEnd) {
      return moduleName;
    }
  }

  // Support "Go to Definition" on identifiers bound from a require() call,
  // e.g. `const { discoverPurchase } = require('sanity-purchase');`
  const wordRange = document.getWordRangeAtPosition(position);
  const word = wordRange ? document.getText(wordRange) : '';
  if (!word) {
    return undefined;
  }

  const text = document.getText();
  const destructureRegex = /const\s*\{\s*([^}]+)\s*\}\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = destructureRegex.exec(text)) !== null) {
    const names = match[1]
      .split(',')
      .map((part) => part.trim().split(':')[0].trim())
      .filter(Boolean);
    if (names.includes(word)) {
      return match[2];
    }
  }

  const assignRegex = /const\s+(\w+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = assignRegex.exec(text)) !== null) {
    if (match[1] === word) {
      return match[2];
    }
  }

  return undefined;
}



function isPositionInRequireString(line: string, position: vscode.Position): boolean {
  const regex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    const moduleIndex = line.indexOf(match[1], match.index);
    const quoteStart = moduleIndex - 1;
    const quoteEnd = moduleIndex + match[1].length + 1;
    if (position.character >= quoteStart && position.character < quoteEnd) {
      return true;
    }
  }
  return false;
}

function findSymbolPosition(filePath: string, symbol: string): vscode.Position | undefined {
  try {
    const content = require('fs').readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const patterns = [
      new RegExp(`^\\s*(async\\s+)?function\\s+${escapeRegExp(symbol)}\\b`),
      new RegExp(`^\\s*(const|let|var)\\s+${escapeRegExp(symbol)}\\b`),
      new RegExp(`^\\s*${escapeRegExp(symbol)}\\s*=`),
      new RegExp(`exports\\.${escapeRegExp(symbol)}\\b`),
      new RegExp(`\\b${escapeRegExp(symbol)}\\s*:`),
    ];
    for (let i = 0; i < lines.length; i++) {
      if (patterns.some((pattern) => pattern.test(lines[i]))) {
        const column = lines[i].indexOf(symbol);
        return new vscode.Position(i, column >= 0 ? column : 0);
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function resolveModulePath(modulePaths: string[], moduleName: string): string | undefined {
  const candidates: string[] = [];

  for (const modulePath of modulePaths) {
    const root = path.resolve(modulePath);

    if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
      const resolved = path.resolve(root, moduleName);
      candidates.push(resolved, `${resolved}.js`, `${resolved}.json`, `${resolved}.ts`, path.join(resolved, 'index.js'));
    } else {
      try {
        candidates.push(require.resolve(moduleName, { paths: [root] }));
      } catch {
        // Fall through to conventional path candidates below.
      }
      candidates.push(
        path.join(root, moduleName),
        path.join(root, `${moduleName}.js`),
        path.join(root, `${moduleName}.json`),
        path.join(root, moduleName, 'index.js')
      );
    }
  }

  const resolvedPath = candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });

  if (!resolvedPath) {
    return undefined;
  }

  const isAllowed = modulePaths.some((modulePath) => {
    const root = path.resolve(modulePath);
    return resolvedPath === root || resolvedPath.startsWith(root + path.sep);
  });

  return isAllowed ? resolvedPath : undefined;
}