import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * A single in-app notice shown once per installation.
 */
export interface Notice {
  /** Unique ID — used as the globalState key. Bump to re-show. */
  id: string;
  /** The message displayed to the user. */
  message: string;
  /** Optional action button label. */
  actionLabel?: string;
  /** URL to open when the action button is clicked. */
  actionUrl?: string;
  /** Trigger: "activation" (default, shown on startup) or "execution" (shown after N requests). */
  trigger?: 'activation' | 'execution';
  /** Execution thresholds (only for trigger: "execution"). */
  thresholds?: number[];
}

/** Remote notices URL (served from the repo, no release needed). */
const REMOTE_NOTICES_URL = 'https://raw.githubusercontent.com/hsl1230/http-forge/main/resources/notices.json';

/** Cache key and TTL for remote notices. */
const REMOTE_CACHE_KEY = 'httpForge.remoteNotices';
const REMOTE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedRemoteNotices {
  fetchedAt: number;
  notices: Notice[];
}

/**
 * Load bundled notices from resources/notices.json.
 * Single source of truth for all notices (bundled + remote share the same format).
 */
export function loadBundledNotices(extensionPath: string): Notice[] {
  try {
    const filePath = path.join(extensionPath, 'resources', 'notices.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const notices = Array.isArray(parsed) ? parsed : (parsed?.notices ?? []);
    if (Array.isArray(notices)) return notices;
  } catch {
    // Fall through to empty
  }
  return [];
}

/**
 * Fetch remote notices from GitHub. Returns cached result if fresh.
 * Falls back to empty array on network failure (offline-safe).
 */
async function fetchRemoteNotices(context: vscode.ExtensionContext): Promise<Notice[]> {
  const cached = context.globalState.get<CachedRemoteNotices>(REMOTE_CACHE_KEY);
  if (cached && (Date.now() - cached.fetchedAt) < REMOTE_CACHE_TTL_MS) {
    return cached.notices;
  }

  return new Promise<Notice[]>((resolve) => {
    const req = https.get(REMOTE_NOTICES_URL, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) {
        resolve(cached?.notices ?? []);
        return;
      }
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const notices = Array.isArray(parsed) ? parsed : (parsed?.notices ?? []);
          if (Array.isArray(notices)) {
            const cache: CachedRemoteNotices = { fetchedAt: Date.now(), notices };
            context.globalState.update(REMOTE_CACHE_KEY, cache);
            resolve(notices);
          } else {
            resolve(cached?.notices ?? []);
          }
        } catch {
          resolve(cached?.notices ?? []);
        }
      });
    });
    req.on('error', () => resolve(cached?.notices ?? []));
    req.on('timeout', () => { req.destroy(); resolve(cached?.notices ?? []); });
  });
}

/**
 * Show the first unshown activation-based notice (if any).
 * Bundled notices are checked first (offline), then remote.
 * Call this once during extension activation.
 */
export async function showPendingNotices(context: vscode.ExtensionContext): Promise<void> {
  const bundled = loadBundledNotices(context.extensionPath);
  const remote = await fetchRemoteNotices(context);

  const seen = new Set<string>();
  const all: Notice[] = [];
  for (const n of [...bundled, ...remote]) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    if (n.trigger && n.trigger !== 'activation') continue;
    all.push(n);
  }

  for (const notice of all) {
    const key = `httpForge.notice.${notice.id}`;
    if (context.globalState.get<boolean>(key)) {
      continue;
    }
    const buttons = notice.actionLabel ? [notice.actionLabel, 'Dismiss'] : ['Dismiss'];
    const choice = await vscode.window.showInformationMessage(notice.message, ...buttons);
    if (choice === notice.actionLabel && notice.actionUrl) {
      await vscode.env.openExternal(vscode.Uri.parse(notice.actionUrl));
    }
    await context.globalState.update(key, true);
    break;
  }
}

/**
 * Get all notices with execution trigger (for threshold-based review prompts).
 */
export function getExecutionNotices(context: vscode.ExtensionContext): Notice[] {
  const bundled = loadBundledNotices(context.extensionPath);
  const cached = context.globalState.get<CachedRemoteNotices>(REMOTE_CACHE_KEY);
  const remote = cached?.notices ?? [];

  const seen = new Set<string>();
  const all: Notice[] = [];
  for (const n of [...bundled, ...remote]) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    if (n.trigger !== 'execution') continue;
    all.push(n);
  }
  return all;
}

/**
 * Threshold-based execution notices. Call after every successful request execution.
 * All execution notices use a status bar item. If multiple thresholds are set,
 * "Dismiss" re-prompts at the next threshold; otherwise dismissal is permanent.
 */
export async function trackRequestAndPromptReview(
  globalState: vscode.Memento,
  log?: (msg: string) => void
): Promise<void> {
  const ext = vscode.extensions.getExtension('henry-huang.http-forge');
  const extensionPath = ext?.extensionPath ?? '';
  const notices = getExecutionNotices({ extensionPath, globalState } as any);
  if (notices.length === 0) return;

  const COUNT_KEY = 'httpForge.requestExecutionCount';
  const count = (globalState.get<number>(COUNT_KEY) ?? 0) + 1;
  await globalState.update(COUNT_KEY, count);
  log?.(`[Notices] ${COUNT_KEY} = ${count}`);

  for (const notice of notices) {
    const thresholds = notice.thresholds && notice.thresholds.length > 0 ? notice.thresholds : [1];
    const doneKey = `httpForge.notice.${notice.id}-done`;
    if (globalState.get<boolean>(doneKey)) continue;

    const prevCount = count - 1;
    const crossed = thresholds.some(t => prevCount < t && count >= t);
    if (!crossed) continue;

    log?.(`[Notices] threshold crossed at ${count} for "${notice.id}" — showing prompt`);

    const repromptOnDismiss = thresholds.length > 1;

    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
    statusBar.text = notice.actionLabel || 'Notice';
    statusBar.tooltip = notice.message;
    statusBar.command = 'httpForge._showExecutionNotice';
    statusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBar.show();

    let disposable: vscode.Disposable;
    try {
      disposable = vscode.commands.registerCommand('httpForge._showExecutionNotice', async () => {
        disposable.dispose();
        statusBar.dispose();
        const action = await vscode.window.showInformationMessage(
          `🔥 ${notice.message}`,
          { modal: false },
          ...(notice.actionLabel ? [notice.actionLabel, 'Maybe Later'] : ['Dismiss'])
        );
        if (action === notice.actionLabel) {
          await globalState.update(doneKey, true);
          if (notice.actionUrl) await vscode.env.openExternal(vscode.Uri.parse(notice.actionUrl));
          log?.(`[Notices] user accepted "${notice.id}" — done`);
        } else {
          if (!repromptOnDismiss) {
            await globalState.update(doneKey, true);
          }
          log?.(`[Notices] user dismissed "${notice.id}" — ${repromptOnDismiss ? 'will prompt again at next threshold' : 'stopped'}`);
        }
      });
    } catch {
      // Command already registered from a previous call — skip
      statusBar.dispose();
      continue;
    }

    vscode.window.showInformationMessage(
      `⭐ ${notice.message}`,
      'Open Now'
    ).then(choice => {
      if (choice === 'Open Now') {
        vscode.commands.executeCommand('httpForge._showExecutionNotice');
      }
    });

    // Only one notice per execution batch.
    break;
  }
}