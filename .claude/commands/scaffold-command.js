#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const commandName = process.argv[2];
const templatePath = path.join(root, '.claude', 'templates', 'http-forge-command.ts');
const commandsDir = path.join(root, 'src', 'commands');
const testsDir = path.join(root, 'src', '__tests__');
const extensionFile = path.join(root, 'src', 'extension.ts');
const packageFile = path.join(root, 'package.json');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!commandName) fail('Usage: scaffold-command.js <commandName>');
if (!/^http-forge\.[a-zA-Z0-9._-]+$/.test(commandName)) fail('Command name must match http-forge.<name>');
if (!fs.existsSync(templatePath)) fail('Template missing: .claude/templates/http-forge-command.ts');

const preFeature = spawnSync(process.execPath, [path.join(root, '.claude', 'hooks', 'pre-feature.js'), commandName], { encoding: 'utf8' });
if (preFeature.status !== 0) {
  console.error(preFeature.stdout || preFeature.stderr || 'pre-feature validation failed');
  process.exit(preFeature.status || 1);
}

const commandSuffix = commandName.split('.').pop();
const commandFileName = `${commandSuffix}.ts`;
const commandFile = path.join(commandsDir, commandFileName);
const testFile = path.join(testsDir, `${commandSuffix}.test.ts`);
const functionName = `run${commandSuffix.split(/[-_]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')}Command`;

if (fs.existsSync(commandFile)) fail('Command file already exists');

fs.mkdirSync(commandsDir, { recursive: true });
fs.mkdirSync(testsDir, { recursive: true });

const template = fs.readFileSync(templatePath, 'utf8');

const commandModule = template
  .replace(/export const COMMAND_ID = '.*?';/, `export const COMMAND_ID = '${commandName}';`)
  .replace(/export async function runSampleCommand\(context: vscode\.ExtensionContext\) \{/, `export async function ${functionName}(context: vscode.ExtensionContext) {`)
  .replace(/\n\/\/ To register the command: add to registerCommands\(\) in src\/extension\.ts\n\/\/ context\.subscriptions\.push\(vscode\.commands\.registerCommand\(COMMAND_ID, \(\) => runSampleCommand\(context\)\)\);\n/, '\n');

fs.writeFileSync(commandFile, commandModule, 'utf8');

const testContent = `import { ${functionName} } from '../commands/${commandSuffix}';\n\ndescribe('${commandSuffix}', () => {\n  it('exports a command runner', () => {\n    expect(typeof ${functionName}).toBe('function');\n  });\n});\n`;
fs.writeFileSync(testFile, testContent, 'utf8');

let extensionText = fs.readFileSync(extensionFile, 'utf8');
if (!extensionText.includes(`registerCommand('${commandName}'`)) {
  const importLine = `import { ${functionName} } from './commands/${commandSuffix}';\n`;
  if (!extensionText.includes(importLine)) {
    extensionText = extensionText.replace("import { COMMAND_IDS, EXTENSION_ID } from './shared/constants';\n", "import { COMMAND_IDS, EXTENSION_ID } from './shared/constants';\n" + importLine);
  }
  const registrationSnippet = `  context.subscriptions.push(\n    vscode.commands.registerCommand('${commandName}', async () => {\n      await ${functionName}(context);\n    })\n  );\n`;
  const insertAfter = "  // Register all commands\n";
  if (extensionText.includes(insertAfter)) {
    extensionText = extensionText.replace(insertAfter, `${insertAfter}${registrationSnippet}`);
  } else {
    extensionText = extensionText.replace("  // Register all commands\n", `${registrationSnippet}`);
  }
}
fs.writeFileSync(extensionFile, extensionText, 'utf8');

let packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
const commands = packageJson.contributes?.commands || [];
if (!commands.some((c) => c.command === commandName)) {
  commands.push({
    command: commandName,
    title: commandName.split('.').pop().replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
    category: 'HTTP Forge'
  });
  packageJson.contributes = packageJson.contributes || {};
  packageJson.contributes.commands = commands;
  fs.writeFileSync(packageFile, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
}

const validate = spawnSync(process.execPath, [path.join(root, '.claude', 'commands', 'validate-new-feature.js'), commandName], { stdio: 'inherit' });
if (validate.status !== 0) fail('Validation failed');

console.log(`Command scaffolded. Run: npm run test -- ${commandSuffix}`);
