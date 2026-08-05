#!/usr/bin/env node
const { spawnSync } = require('child_process');

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  if (res.status !== 0) process.exit(res.status);
}

// Quick, authoritative repo checks for CI / pre-push
run('npm', ['ci']);
run('npm', ['run', 'type-check']);
run('npm', ['run', 'lint']);
run('npm', ['test']);

// if we reach here, success
console.log('\nAll checks passed.');
