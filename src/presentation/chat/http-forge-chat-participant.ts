import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const PARTICIPANT_ID = 'http-forge';

/**
 * Minimal @http-forge chat participant.
 *
 * Reads `.http-forge/AGENTS.md` from the workspace and streams it as context
 * so Copilot knows the full HTTP Forge guide. Then routes specific commands
 * to the appropriate tool or handler.
 */
export function registerHttpForgeChatParticipant(context: vscode.ExtensionContext): void {
  const participant = vscode.chat.createChatParticipant(PARTICIPANT_ID, async (request, chatContext, stream, token) => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const agentsMdPath = workspaceFolder
      ? path.join(workspaceFolder.uri.fsPath, '.http-forge', 'AGENTS.md')
      : null;

    // Read the AGENTS.md guide if it exists
    let guideContent = '';
    if (agentsMdPath && fs.existsSync(agentsMdPath)) {
      try {
        guideContent = fs.readFileSync(agentsMdPath, 'utf-8');
      } catch {
        guideContent = '';
      }
    }

    const message = request.prompt.trim().toLowerCase();

    // If the user just says "help" or empty, show the guide summary
    if (message === 'help' || message === '') {
      if (guideContent) {
        stream.markdown('**HTTP Forge AI Guide** (from `.http-forge/AGENTS.md`)\n\n');
        stream.markdown('I have the full guide loaded. Here are the key commands:\n\n');
      } else {
        stream.markdown('No `.http-forge/AGENTS.md` found. Run `http-forge refresh-agents-md --apply` or use the VS Code command **HTTP Forge: Refresh AI Agent Guide** to generate it.\n\n');
      }
      stream.markdown(`Available commands:
- \`suggest assertions\` — generate \`pm.test()\` assertions from the last response
- \`design an api from intent: <description>\` — design a full API from plain English
- \`discover APIs in <path>\` — scan a backend for endpoints
- \`generate test suite\` — scaffold tests from discovered endpoints
- \`run collection "<name>"\` — run a collection
- \`analyze the failures\` — diagnose and heal broken tests
- \`help\` — show this message

You can also use MCP tools directly if the MCP server is running, or CLI commands from the terminal.
`);
      return;
    }

    // Route based on intent keywords
    if (message.startsWith('suggest assertions') || message.startsWith('suggest-assertions')) {
      stream.markdown('Use the **Suggest Assertions** button in the Request Tester, or run the `suggest_assertions` MCP tool with the last response.\n');
      if (guideContent) {
        stream.markdown('\n> See `.http-forge/AGENTS.md` for the full script API reference.\n');
      }
      return;
    }

    if (message.startsWith('design an api') || message.startsWith('design api')) {
      stream.markdown('Run **HTTP Forge: Design an API from Intent (AI)** from the Command Palette, or use the `design_api_from_intent` MCP tool.\n');
      if (guideContent) {
        stream.markdown('\n> See `.http-forge/AGENTS.md` for the full workflow.\n');
      }
      return;
    }

    if (message.startsWith('discover') || message.startsWith('discover apis')) {
      stream.markdown('Use the **Discovered APIs** tree view (`HTTP Forge: Discover APIs`), or run `http-forge discover --path <project>` from the CLI.\n');
      if (guideContent) {
        stream.markdown('\n> See `.http-forge/AGENTS.md` for the discovery workflow.\n');
      }
      return;
    }

    if (message.startsWith('generate test suite') || message.startsWith('generate suite')) {
      stream.markdown('Run `http-forge generate-suite --path <project> --collection <ref>` from the CLI, or use the `generate_test_suite` MCP tool.\n');
      if (guideContent) {
        stream.markdown('\n> See `.http-forge/AGENTS.md` for the generate → run → report loop.\n');
      }
      return;
    }

    if (message.startsWith('run collection')) {
      const name = message.replace('run collection', '').trim().replace(/^"|"$/g, '');
      stream.markdown(`Run: \`http-forge run collection "${name || '<name>'}" --env dev\` or use the \`run_collection\` MCP tool.\n`);
      if (guideContent) {
        stream.markdown('\n> See `.http-forge/AGENTS.md` for CLI vs MCP decision tree.\n');
      }
      return;
    }

    if (message.startsWith('analyze') || message.startsWith('analyze the failures') || message.startsWith('heal')) {
      stream.markdown('Use the `explain_failure` or `heal_assertions` MCP tools, or open Copilot Chat with suite failure context from the Test Suite panel.\n');
      if (guideContent) {
        stream.markdown('\n> See `.http-forge/AGENTS.md` for the Fix stage of the loop.\n');
      }
      return;
    }

    // Default: point to the guide
    if (guideContent) {
      stream.markdown('I have the full HTTP Forge guide loaded from `.http-forge/AGENTS.md`. Ask me about designing APIs, discovering endpoints, generating tests, running collections, or analyzing failures.\n');
    } else {
      stream.markdown('No `.http-forge/AGENTS.md` found. Run `http-forge refresh-agents-md --apply` or use the VS Code command **HTTP Forge: Refresh AI Agent Guide** to generate it.\n');
    }
  });

  participant.iconPath = new vscode.ThemeIcon('beaker');
  context.subscriptions.push(participant);
}
