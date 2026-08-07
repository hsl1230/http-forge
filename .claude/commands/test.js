#!/usr/bin/env node
const { execSync } = require('child_process');

try {
  console.log('Running tests...');
  execSync('npm test', { stdio: 'inherit' });
  process.exit(0);
} catch (err) {
  console.error('Tests failed');
  process.exit(1);
}
