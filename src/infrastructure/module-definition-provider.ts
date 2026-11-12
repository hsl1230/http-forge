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

    return new vscode.Location(vscode.Uri.file(resolvedPath), new vscode.Position(0, 0));
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

  return undefined;
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