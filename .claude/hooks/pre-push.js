#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checker = path.join(root, 'commands', 'check.js');

console.log('Running pre-push checks...');
const res = spawnSync(process.execPath, [checker], { stdio: 'inherit' });
if (res.status !== 0) {
  console.error('Pre-push checks failed. Aborting push.');
  process.exit(res.status || 1);
}
console.log('Pre-push checks passed.');
