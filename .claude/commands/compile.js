#!/usr/bin/env node
const { execSync } = require('child_process');

try {
  console.log('Compiling http-forge (esbuild)...');
  execSync('npm run compile', { stdio: 'inherit' });
  process.exit(0);
} catch (err) {
  console.error('Compile failed');
  process.exit(1);
}
