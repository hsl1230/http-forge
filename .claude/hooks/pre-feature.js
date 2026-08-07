#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const commandName = process.argv[2];
const errors = [];

function validResult() {
  return { valid: true, errors: [] };
}

if (!commandName) {
  errors.push('Missing commandName argument');
} else if (!/^http-forge\.[a-zA-Z0-9._-]+$/.test(commandName)) {
  errors.push('Command name must match http-forge.<name>');
}

const templatePath = path.join(root, '.claude', 'templates', 'http-forge-command.ts');
if (!fs.existsSync(templatePath)) {
  errors.push('Template missing: .claude/templates/http-forge-command.ts');
}

const extensionFile = path.join(root, 'src', 'extension.ts');
const packageFile = path.join(root, 'package.json');
if (!fs.existsSync(extensionFile)) errors.push('Missing src/extension.ts');
if (!fs.existsSync(packageFile)) errors.push('Missing package.json');

const commandsDir = path.join(root, 'src', 'commands');
if (!fs.existsSync(commandsDir)) fs.mkdirSync(commandsDir, { recursive: true });

const duplicateCheck = path.join(commandsDir, `${commandName.split('.').pop()}.ts`);
if (fs.existsSync(duplicateCheck)) {
  errors.push('Duplicate command file already exists');
}

try {
  const extensionText = fs.readFileSync(extensionFile, 'utf8');
  if (extensionText.includes(commandName)) {
    errors.push('Duplicate command name already exists in src/extension.ts');
  }
} catch (error) {
  // ignore
}

try {
  const packageText = fs.readFileSync(packageFile, 'utf8');
  if (packageText.includes(commandName)) {
    errors.push('Duplicate command name already exists in package.json');
  }
} catch (error) {
  // ignore
}

const result = { valid: errors.length === 0, errors };
console.log(JSON.stringify(result));
process.exit(result.valid ? 0 : 1);
