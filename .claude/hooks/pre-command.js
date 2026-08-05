#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const extensionFile = path.join(root, 'src', 'extension.ts');

function validateCommandStructure(templatePath) {
  if (!fs.existsSync(templatePath)) return false;
  const text = fs.readFileSync(templatePath, 'utf8');
  // Basic checks: contains COMMAND_ID and exports a run function
  const hasId = /export const COMMAND_ID\s*=/.test(text);
  const hasRun = /export function .*run\w*\(/.test(text) || /export async function .*\(/.test(text);
  return hasId && hasRun;
}

const template = process.argv[2];
if (!template) {
  console.error('Usage: pre-command.js <template-path>');
  process.exit(2);
}

const tpl = path.resolve(template);
if (!validateCommandStructure(tpl)) {
  console.error('Template failed basic validation: must export COMMAND_ID and a run function');
  process.exit(1);
}

console.log('Template structure validated. Remember to add registration in src/extension.ts and contributes.commands in package.json');
