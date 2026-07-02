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

const THRESHOLDS = [10, 50];   // prompt at these execution counts

/**
 * Increment the execution counter and show the review prompt when a threshold
 * is reached and the user has not already left a review.
 *
 * Call this after every successful request execution.
 */
export async function trackRequestAndPromptReview(
  globalState: vscode.Memento
): Promise<void> {
  // Stop entirely once they've clicked "Leave a Review"
  if (globalState.get<boolean>(REVIEW_DONE_KEY)) {
    return;
  }

  const count = (globalState.get<number>(REVIEW_COUNT_KEY) ?? 0) + 1;
  await globalState.update(REVIEW_COUNT_KEY, count);

  if (!THRESHOLDS.includes(count)) {
    return;
  }

  const action = await vscode.window.showInformationMessage(
    '🔥 Enjoying HTTP Forge? A quick review on the Marketplace helps others discover it!',
    'Leave a Review',
    'No Thanks'
  );

  if (action === 'Leave a Review') {
    // Mark permanently done — no more prompts
    await globalState.update(REVIEW_DONE_KEY, true);
    await vscode.env.openExternal(vscode.Uri.parse(REVIEW_URL));
  }
  // Any other response (dismiss, "No Thanks") → do nothing.
  // The user will be prompted again at the next threshold.
}
