import { ICollectionService } from '@http-forge/core';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { openCopilotPromptEditor } from '../../../shared/copilot-prompt-editor';
import { IPanelContextProvider } from '../interfaces';

/**
 * Shared Copilot/LM operations for the Request Tester AI features.
 *
 * Encapsulates everything the AI commands have in common: selecting a Copilot
 * model, streaming a response, opening Copilot Chat with context files
 * attached, building the query footer, and walking the workspace for business
 * knowledge files. Feature handlers depend on this single object instead of
 * reimplementing the plumbing.
 */
export class AiOperations {
  constructor(
    private contextProvider: IPanelContextProvider,
    private collectionService?: ICollectionService
  ) {}

  /**
   * Send a prompt to the active Copilot model and return the raw text.
   * Returns `{ error }` instead of throwing when Copilot is unavailable.
   */
  async callLm(prompt: string): Promise<{ raw: string } | { error: string }> {
    try {
      const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (!models.length) {
        return { error: 'GitHub Copilot is not available. Please sign in to use AI features.' };
      }
      const cts = new vscode.CancellationTokenSource();
      const response = await models[0].sendRequest(
        [vscode.LanguageModelChatMessage.User(prompt)],
        {},
        cts.token
      );
      let raw = '';
      for await (const part of response.stream) {
        if (part instanceof vscode.LanguageModelTextPart) raw += part.value;
      }
      return { raw };
    } catch (err: any) {
      return { error: err?.message ?? 'AI request failed.' };
    }
  }

  /**
   * Open GitHub Copilot Chat with context files attached and the query pre-filled.
   * VS Code pre-fills the input but does NOT auto-submit — the user reviews the
   * attached file chips and the prompt, then presses Enter when ready.
   */
  async openCopilotChat(query: string, extraFiles?: vscode.Uri[]): Promise<void> {
    const attachFiles = [...this.getContextAttachFiles(), ...(extraFiles ?? [])];
    await openCopilotPromptEditor(query, attachFiles);
  }

  /**
   * Build a Copilot Chat query string from a prompt string.
   * Appends a friendly opening so the session starts naturally.
   */
  buildCopilotQuery(prompt: string): string {
    // Trim to a reasonable length so the chat panel doesn't overflow
    const mcpFallback =
      `\n\n---\n` +
      `> **No MCP/Confluence/Jira tools available?** Ask the user to either:\n` +
      `> - Configure an MCP server (Confluence/Jira) in VS Code Copilot settings\n` +
      `> - Or paste the relevant Confluence page, Jira ticket, or API spec content here\n` +
      `>\n` +
      `> **No backend code?** Ask the user to attach the relevant service/controller/domain model files.`;
    return (prompt + mcpFallback).slice(0, 3500);
  }

  /** Request directory URI for the current request, when it exists on disk. */
  getRequestDirAttachFiles(): vscode.Uri[] {
    const requestDirPath = this.contextProvider.getHistoryStoragePath()?.requestPath ?? '';
    return requestDirPath && fs.existsSync(requestDirPath)
      ? [vscode.Uri.file(requestDirPath)]
      : [];
  }

  /** History directory URI for past responses of the current request, when it exists. */
  getHistoryAttachFiles(): vscode.Uri[] {
    const historyStorage = this.contextProvider.getHistoryStoragePath();
    if (!historyStorage?.requestId || !historyStorage?.environment) return [];
    try {
      const historyBase: string | undefined =
        (this.collectionService as any)?.configService?.getHistoryPath?.();
      if (historyBase) {
        const dir = path.join(historyBase, historyStorage.environment, historyStorage.requestId);
        return fs.existsSync(dir) ? [vscode.Uri.file(dir)] : [];
      }
    } catch { /* skip if configService unavailable */ }
    return [];
  }

  /** Strip markdown code fences from an LLM response for a given language family. */
  stripCodeFences(text: string, language?: 'json' | 'typescript'): string {
    const prefix = language === 'json'
      ? 'json'
      : language === 'typescript'
        ? 'typescript|ts'
        : '\\w+';
    return text
      .replace(new RegExp(`^\`\`\`(?:${prefix})?\\n?`, 'gm'), '')
      .replace(/^```\s*$/gm, '')
      .trim();
  }

  buildChatBlock(chatHistory?: Array<{ role: string; content: string }>): string {
    if (!chatHistory?.length) return '';
    return `\nRecent chat context (use if relevant):\n` +
      chatHistory.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.slice(0, 200)}`).join('\n');
  }

  buildHistoryBlock(historyContext?: string): string {
    if (!historyContext?.trim()) return '';
    return `\nPast calls to this endpoint (most recent first):\n${historyContext}\n`;
  }

  /**
   * Collect the directly relevant HTTP Forge context files for the current request.
   *
   * Attaches (when they exist on disk):
   * - Request directory   — request.json, scripts/, schemas, doc.md
   * - History directory   — past responses for this exact request
   *
   * The full collection folder is intentionally NOT attached — it can contain
   * hundreds of unrelated requests that consume context window without adding value.
   */
  private getContextAttachFiles(): vscode.Uri[] {
    const attachFiles: vscode.Uri[] = [];
    const add = (p: string | undefined | null) => {
      if (p && fs.existsSync(p)) attachFiles.push(vscode.Uri.file(p));
    };

    const historyStorage = this.contextProvider.getHistoryStoragePath();

    // Request directory — has request.json, scripts, schemas, doc.md
    add(historyStorage?.requestPath);

    // History directory — past responses for this request
    for (const p of this.getHistoryAttachFiles()) {
      add(p.fsPath);
    }

    // Workspace business knowledge — .http-forge/knowledge/**/*.md (Confluence
    // exports, Jira summaries, ADRs) plus README.md, all at the forge root.
    for (const p of this.getKnowledgeFilePaths(historyStorage?.requestPath)) {
      add(p);
    }

    return attachFiles;
  }

  /**
   * Find the forge root by walking up from the request directory, then return
   * every markdown file under .http-forge/knowledge/ plus the workspace README.
   */
  private getKnowledgeFilePaths(requestPath?: string): string[] {
    if (!requestPath || !fs.existsSync(requestPath)) return [];

    const results: string[] = [];
    const forgeRoot = this.findForgeRoot(requestPath);
    if (!forgeRoot) return results;

    const walk = (dir: string): void => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
          results.push(full);
        }
      }
    };
    const knowledgeDir = path.join(forgeRoot, '.http-forge', 'knowledge');
    walk(knowledgeDir);

    for (const name of ['README.md', 'AGENTS.md']) {
      const p = path.join(forgeRoot, name);
      if (fs.existsSync(p)) results.push(p);
    }

    return results;
  }

  /** Walk up from a path until we find a directory containing .http-forge/. */
  private findForgeRoot(start: string): string | undefined {
    let current = start;
    for (let i = 0; i < 12; i++) {
      if (fs.existsSync(path.join(current, '.http-forge'))) return current;
      const parent = path.dirname(current);
      if (parent === current) return undefined;
      current = parent;
    }
    return undefined;
  }
}
