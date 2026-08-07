#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const src = path.join(root, 'src');

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  files.forEach((f) => {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) {
      walk(fp, filelist);
    } else if (fp.endsWith('.ts') || fp.endsWith('.js')) {
      filelist.push(fp);
    }
  });
  return filelist;
}

function scanForCommands(files) {
  const commands = [];
  const imports = [];
  files.forEach((f) => {
    const text = fs.readFileSync(f, 'utf8');
    const re = /registerCommand\(([^,]+),/g;
    let m;
    while ((m = re.exec(text))) {
      commands.push({file: f.replace(root + path.sep, ''), snippet: m[0]});
    }
    if (/@http-forge\/core/.test(text)) {
      imports.push(f.replace(root + path.sep, ''));
    }
  });
  return {commands, imports};
}

function main() {
  if (!fs.existsSync(src)) {
    console.error('No src/ folder found');
    process.exit(1);
  }
  const files = walk(src);
  const {commands, imports} = scanForCommands(files);
  const summary = {
    totalSourceFiles: files.length,
    commandRegistrations: commands.length,
    commandSamples: commands.slice(0, 50),
    httpForgeCoreImports: imports
  };
  console.log(JSON.stringify(summary, null, 2));
}

main();
