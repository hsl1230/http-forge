import * as vscode from 'vscode';

/**
 * Ask for explicit confirmation before contacting an environment marked as
 * production. Shared by HTTP and WebSocket execution.
 */
export async function confirmProductionRequest(
  environment: string,
  resolvedEnvironment: { requiresConfirmation?: boolean } | undefined
): Promise<boolean> {
  if (!resolvedEnvironment?.requiresConfirmation) {
    return true;
  }

  const confirm = await vscode.window.showWarningMessage(
    `You are about to send a request to PRODUCTION (${environment}). Are you sure?`,
    { modal: true },
    'Yes, Send Request'
  );

  return confirm === 'Yes, Send Request';
}
