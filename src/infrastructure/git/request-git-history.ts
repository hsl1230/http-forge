/**
 * Request Git History Service
 *
 * Provides Git log, diff, and revert operations scoped to a request's
 * on-disk JSON file. Uses the `git` CLI via child_process — no Git extension
 * API dependency needed.
 */

import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

const execFile = util.promisify(cp.execFile);

export interface GitCommitEntry {
    hash: string;
    shortHash: string;
    author: string;
    date: string;
    message: string;
    /** Workspace-relative path to the request.json file */
    relativeFilePath: string;
    /** Absolute path to the request.json file */
    absoluteFilePath: string;
}

/** Find the request.json file for a given collectionId + requestId inside the workspace. */
export function resolveRequestJsonPath(workspaceFolder: string, collectionId: string, requestId: string): string | null {
    // Collections are stored as directories: collections/<collectionId>/
    // Requests are stored in subdirectories: collections/<collectionId>/**/<requestId>/request.json
    const collectionsDir = path.join(workspaceFolder, 'collections');
    if (!fs.existsSync(collectionsDir)) return null;

    const target = findRequestJson(collectionsDir, requestId);
    return target;
}

function findRequestJson(dir: string, requestId: string): string | null {
    let entries: string[];
    try {
        entries = fs.readdirSync(dir);
    } catch {
        return null;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry);
        let stat: fs.Stats;
        try { stat = fs.statSync(full); } catch { continue; }
        if (stat.isDirectory()) {
            if (entry === requestId) {
                const candidate = path.join(full, 'request.json');
                if (fs.existsSync(candidate)) return candidate;
            }
            const found = findRequestJson(full, requestId);
            if (found) return found;
        }
    }
    return null;
}

/** Return the git repository root for the given path, or null if not in a repo. */
async function getGitRoot(filePath: string): Promise<string | null> {
    const dir = path.dirname(filePath);
    try {
        const { stdout } = await execFile('git', ['-C', dir, 'rev-parse', '--show-toplevel']);
        return stdout.trim();
    } catch {
        return null;
    }
}

/** Fetch the git commit log for a specific file (up to limit entries). */
export async function getGitLog(filePath: string, limit = 50): Promise<GitCommitEntry[]> {
    const gitRoot = await getGitRoot(filePath);
    if (!gitRoot) return [];

    const relFile = path.relative(gitRoot, filePath);
    const format = '%H|%h|%an|%ai|%s';

    let stdout: string;
    try {
        const result = await execFile(
            'git',
            ['-C', gitRoot, 'log', `--format=${format}`, `-n${limit}`, '--follow', '--', relFile]
        );
        stdout = result.stdout;
    } catch {
        return [];
    }

    return stdout
        .split('\n')
        .filter((l) => l.trim())
        .map((line) => {
            const [hash, shortHash, author, date, ...msgParts] = line.split('|');
            return {
                hash,
                shortHash,
                author,
                date,
                message: msgParts.join('|'),
                relativeFilePath: relFile,
                absoluteFilePath: filePath,
            };
        });
}

/** Return the unified diff of a file at a specific commit vs. its parent. */
export async function getGitDiff(filePath: string, commitHash: string): Promise<string> {
    const gitRoot = await getGitRoot(filePath);
    if (!gitRoot) return '';

    const relFile = path.relative(gitRoot, filePath);
    try {
        const { stdout } = await execFile(
            'git',
            ['-C', gitRoot, 'show', `${commitHash}:${relFile}`]
        );
        return stdout;
    } catch {
        return '';
    }
}

/** Return the full content of a file at a specific commit hash. */
export async function getFileAtCommit(filePath: string, commitHash: string): Promise<string | null> {
    const gitRoot = await getGitRoot(filePath);
    if (!gitRoot) return null;

    const relFile = path.relative(gitRoot, filePath);
    try {
        const { stdout } = await execFile(
            'git',
            ['-C', gitRoot, 'show', `${commitHash}:${relFile}`]
        );
        return stdout;
    } catch {
        return null;
    }
}

/** Restore a file to its content at a given commit hash (overwrites the working copy). */
export async function revertFileToCommit(filePath: string, commitHash: string): Promise<void> {
    const gitRoot = await getGitRoot(filePath);
    if (!gitRoot) throw new Error('File is not inside a Git repository.');

    const relFile = path.relative(gitRoot, filePath);
    await execFile('git', ['-C', gitRoot, 'checkout', commitHash, '--', relFile]);
}
