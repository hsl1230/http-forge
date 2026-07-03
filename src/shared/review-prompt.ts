/**
 * Review Prompt
 *
 * Shows a notification asking the user to leave a Marketplace review at two
 * engagement milestones. Persisted in globalState so it survives restarts.
 *
 * Thresholds:
 *   - First prompt:  after 10 successful request executions
 *   - Second prompt: after 50 successful request executions (for users who skipped)
 *   - Stops prompting once the user clicks "Leave a Review"
 *
 * Dismiss behaviour: treated as "Maybe Later" — the user is asked again at the
 * next threshold. Only clicking "Leave a Review" stops future prompts.
 */

import * as vscode from 'vscode';

const REVIEW_COUNT_KEY = 'httpForge.requestExecutionCount';
const REVIEW_DONE_KEY  = 'httpForge.reviewDone';   // set only after "Leave a Review"
const REVIEW_URL = 'https://marketplace.visualstudio.com/items?itemName=henry-huang.http-forge&ssr=false#review-details';

const THRESHOLDS = [10, 50, 200, 500];   // prompt at these execution counts; stops permanently once the user leaves a review

/**
 * Increment the execution counter and show the review prompt when a threshold
 * is reached and the user has not already left a review.
 *
 * Call this after every successful request execution.
 */
export async function trackRequestAndPromptReview(
  globalState: vscode.Memento,
  log?: (msg: string) => void
): Promise<void> {
  // Stop entirely once they've clicked "Leave a Review"
  if (globalState.get<boolean>(REVIEW_DONE_KEY)) {
    return;
  }

  const count = (globalState.get<number>(REVIEW_COUNT_KEY) ?? 0) + 1;
  await globalState.update(REVIEW_COUNT_KEY, count);
  log?.(`[ReviewPrompt] ${REVIEW_COUNT_KEY} = ${count}`);

  // Fire when the count first reaches or crosses a threshold.
  // Using >= so a threshold is never skipped if the counter jumps (e.g. after a reset).
  const prevCount = count - 1;

  const crossed = THRESHOLDS.some(t => prevCount < t && count >= t);
  if (!crossed) {
    return;
  }

  log?.(`[ReviewPrompt] threshold crossed at ${count} — showing prompt`);

  // Show a persistent status bar item — much harder to miss than a toast.
  // It stays visible until the user clicks it or dismisses it explicitly.
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
  statusBar.text = '$(star-full) Rate HTTP Forge';
  statusBar.tooltip = 'Enjoying HTTP Forge? A quick review helps others discover it!';
  statusBar.command = 'httpForge._showReviewPrompt';
  statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  statusBar.show();

  // Register a one-shot command that opens the prompt when the status bar is clicked
  const disposable = vscode.commands.registerCommand('httpForge._showReviewPrompt', async () => {
    disposable.dispose();
    statusBar.dispose();
    const action = await vscode.window.showInformationMessage(
      '🔥 Enjoying HTTP Forge? A quick review on the Marketplace helps others discover it — it only takes a minute!',
      { modal: false },
      'Leave a Review ⭐',
      'Maybe Later'
    );
    if (action === 'Leave a Review ⭐') {
      await globalState.update(REVIEW_DONE_KEY, true);
      await vscode.env.openExternal(vscode.Uri.parse(REVIEW_URL));
      log?.('[ReviewPrompt] user left a review — done');
    } else {
      log?.('[ReviewPrompt] user dismissed — will prompt again at next threshold');
    }
  });

  // Also show a small toast to draw attention to the status bar item
  vscode.window.showInformationMessage(
    `⭐ You've sent ${count} requests with HTTP Forge! Click the status bar to leave a quick review.`,
    'Open Now'
  ).then(choice => {
    if (choice === 'Open Now') {
      vscode.commands.executeCommand('httpForge._showReviewPrompt');
    }
  });
}
