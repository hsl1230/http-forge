#!/usr/bin/env node
const { execSync } = require('child_process');

try {
  console.log('Verifying test suite passes...');
  execSync('npm test', { stdio: 'inherit' });
  console.log('Tests passed');
  process.exit(0);
} catch (err) {
  console.error('Tests failed');
  process.exit(1);
}
