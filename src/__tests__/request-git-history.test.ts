import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { resolveRequestJsonPath } from '../infrastructure/git/request-git-history';

describe('resolveRequestJsonPath', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hf-git-history-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('finds request.json under the configured collections path', () => {
    const collectionsPath = path.join(tempDir, '.http-forge', 'assets', 'collections');
    const requestPath = path.join(collectionsPath, 'shopping', 'users', 'get-user', 'request.json');
    fs.mkdirSync(path.dirname(requestPath), { recursive: true });
    fs.writeFileSync(requestPath, '{}');

    expect(resolveRequestJsonPath(tempDir, 'shopping', 'get-user', collectionsPath)).toBe(requestPath);
  });

  it('finds request.json by metadata id when directory slug differs', () => {
    const collectionsPath = path.join(tempDir, '.http-forge', 'assets', 'collections');
    const requestPath = path.join(collectionsPath, 'shopping', 'users', 'test', 'request.json');
    fs.mkdirSync(path.dirname(requestPath), { recursive: true });
    fs.writeFileSync(requestPath, JSON.stringify({ id: 'test_mro2gr0z1elgog' }, null, 2));

    expect(resolveRequestJsonPath(tempDir, 'shopping', 'test_mro2gr0z1elgog', collectionsPath)).toBe(requestPath);
  });
});
