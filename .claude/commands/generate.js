#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const name = process.argv[2];
if (!name) {
  console.error('Usage: generate.js <command-name>');
  process.exit(2);
}

const tplDir = path.join(__dirname, '..', 'templates');
if (!fs.existsSync(tplDir)) fs.mkdirSync(tplDir, { recursive: true });

const file = path.join(tplDir, `${name}.ts`);
if (fs.existsSync(file)) {
  console.error('Template already exists:', file);
  process.exit(1);
}

const contents = `// Template for Claude command: ${name}
export const COMMAND_NAME = '${name}';

// Fill in with TypeScript implementation; this file is excluded from compilation by tsconfig
export function run(args: string[]) {
  console.log('Running ${name}', args);
}
`;

fs.writeFileSync(file, contents, 'utf8');
console.log('Created template:', file);
