#!/usr/bin/env node
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const extensionFile = path.join(root, 'src', 'extension.ts');
const pkgFile = path.join(root, 'package.json');

function checkRegistration(commandId) {
  if (!fs.existsSync(extensionFile)) return false;
  const t = fs.readFileSync(extensionFile, 'utf8');
  return t.indexOf(commandId) !== -1;
}

function checkPackageJson(commandId) {
  if (!fs.existsSync(pkgFile)) return false;
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  const contrib = pkg.contributes || {};
  const commands = contrib.commands || [];
  return commands.some((c) => c.command === commandId);
}

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  return res.status === 0;
}

const commandId = process.argv[2];
if (!commandId) {
  console.error('Usage: validate-new-feature.js <command-id>');
  process.exit(2);
}

let ok = true;
console.log('Validating command:', commandId);

if (!checkRegistration(commandId)) {
  console.error('Command not found in src/extension.ts registration');
  ok = false;
} else {
  console.log('Found registration in extension.ts');
}

if (!checkPackageJson(commandId)) {
  console.warn('Command not listed in package.json contributes.commands — this may be intentional for internal commands');
} else {
  console.log('Found contributes entry in package.json');
}

// Run static checks
console.log('\nRunning type-check and lint + tests');
if (!run('npm', ['run', 'type-check'])) ok = false;
if (!run('npm', ['run', 'lint'])) ok = false;
if (!run('npm', ['test'])) ok = false;

if (!ok) {
  console.error('\nValidation failed');
  process.exit(1);
}

console.log('\nValidation passed');
