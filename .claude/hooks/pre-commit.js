#!/usr/bin/env node
const { execSync } = require('child_process');

try {
  console.log('Running TypeScript type-check...');
  execSync('npm run type-check', { stdio: 'inherit' });

  console.log('Running ESLint...');
  execSync('npm run lint', { stdio: 'inherit' });

  console.log('Running tests (fast)');
  execSync('npm test -- --runInBand --silent', { stdio: 'inherit' });

  console.log('pre-commit checks passed');
  process.exit(0);
} catch (err) {
  console.error('pre-commit checks failed');
  process.exit(1);
}
