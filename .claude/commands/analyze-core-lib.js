#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const coreRoot = path.resolve(root, '..', 'http-forge.core');
const coreSrc = path.join(coreRoot, 'src');
const outputFile = path.join(root, '.claude', 'core-lib-analysis.json');

function walk(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, list);
    } else if (/\.ts$/.test(entry)) {
      list.push(full);
    }
  }
  return list;
}

function extractExports(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const matches = [];
  const exportRegex = /export\s+(?:abstract\s+)?(?:class|interface|type|enum|function|const|let|var)\s+([A-Za-z0-9_]+)/g;
  let m;
  while ((m = exportRegex.exec(text))) matches.push(m[1]);
  return matches;
}

function main() {
  const files = walk(coreSrc);
  const exports = [];
  for (const file of files) {
    const fileExports = extractExports(file);
    if (fileExports.length) {
      exports.push({ file: path.relative(coreRoot, file), exports: fileExports });
    }
  }

  const packageJsonPath = path.join(coreRoot, 'package.json');
  let version = '';
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    version = pkg.version || '';
  }

  const payload = { exports, version, path: path.relative(root, coreRoot) };
  fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(payload, null, 2));
}

main();
