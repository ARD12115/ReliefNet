#!/usr/bin/env node
/**
 * watch-lint.js — Auto-run lint + typecheck on file changes
 * Usage: hermes run watch-lint [--pattern=...] [--lint=...] [--typecheck=...]
 */

import { program } from 'commander';
import chokidar from 'chokidar';
import { spawn } from 'child_process';
import path from 'path';

program
  .name('watch-lint')
  .description('Auto-run lint + typecheck on file changes')
  .option('-p, --pattern <glob>', 'File pattern to watch', 'src/**/*.{js,jsx,ts,tsx}')
  .option('-l, --lint <cmd>', 'Lint command', 'npm run lint')
  .option('-t, --typecheck <cmd>', 'Typecheck command', '')
  .option('-d, --debounce <ms>', 'Debounce time', '300')
  .option('--ignore <glob>', 'Ignore patterns', 'node_modules,dist,.git,coverage')
  .option('--run-on-start', 'Run immediately on start', false);

program.parse();

const options = program.opts();

let lintProcess = null;
let typecheckProcess = null;
let debounceTimer = null;

function runLint() {
  if (lintProcess) lintProcess.kill('SIGTERM');
  console.log(`\n🔍 Running lint: ${options.lint}`);
  const [cmd, ...args] = options.lint.split(' ');
  lintProcess = spawn(cmd, args, { stdio: 'inherit', shell: true });
  lintProcess.on('exit', code => {
    console.log(code === 0 ? '✅ Lint passed' : `❌ Lint failed (exit ${code})`);
    lintProcess = null;
  });
}

function runTypecheck() {
  if (!options.typecheck) return;
  if (typecheckProcess) typecheckProcess.kill('SIGTERM');
  console.log(`\n🔧 Running typecheck: ${options.typecheck}`);
  const [cmd, ...args] = options.typecheck.split(' ');
  typecheckProcess = spawn(cmd, args, { stdio: 'inherit', shell: true });
  typecheckProcess.on('exit', code => {
    console.log(code === 0 ? '✅ Typecheck passed' : `❌ Typecheck failed (exit ${code})`);
    typecheckProcess = null;
  });
}

function debouncedRun() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runLint();
    if (options.typecheck) runTypecheck();
  }, parseInt(options.debounce));
}

const watcher = chokidar.watch(options.pattern.split(','), {
  ignored: options.ignore.split(',').map(p => path.resolve(p)),
  persistent: true,
  ignoreInitial: true,
  usePolling: true,
  interval: 1000,
  binaryInterval: 300,
});

watcher.on('change', file => { console.log(`\n📝 Changed: ${file}`); debouncedRun(); });
watcher.on('add', file => { console.log(`\n➕ Added: ${file}`); debouncedRun(); });
watcher.on('unlink', file => { console.log(`\n🗑️  Deleted: ${file}`); debouncedRun(); });

console.log(`👀 Watching: ${options.pattern}`);
console.log(`🔍 Lint: ${options.lint}`);
if (options.typecheck) console.log(`🔧 Typecheck: ${options.typecheck}`);
console.log(`⏱️  Debounce: ${options.debounce}ms`);
console.log(`🚫 Ignoring: ${options.ignore}`);

if (options.runOnStart) {
  console.log(`\n🚀 Running initial checks...`);
  runLint();
  if (options.typecheck) runTypecheck();
}

process.on('SIGINT', () => {
  if (lintProcess) lintProcess.kill('SIGTERM');
  if (typecheckProcess) typecheckProcess.kill('SIGTERM');
  watcher.close();
  console.log('\n👋 Stopped watching');
  process.exit(0);
});