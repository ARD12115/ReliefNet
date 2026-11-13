#!/usr/bin/env node
/**
 * watch-test.js — Auto-run tests on file changes
 * Usage: hermes run watch-test [--pattern=...] [--command=...]
 */

import { program } from 'commander';
import chokidar from 'chokidar';
import { spawn } from 'child_process';
import path from 'path';

program
  .name('watch-test')
  .description('Auto-run tests on file changes')
  .option('-p, --pattern <glob>', 'File pattern to watch', 'src/**/*.{js,jsx,ts,tsx}')
  .option('-c, --command <cmd>', 'Test command', 'npm test')
  .option('-d, --debounce <ms>', 'Debounce time', '500')
  .option('--ignore <glob>', 'Ignore patterns', 'node_modules,dist,.git,coverage')
  .option('--run-on-start', 'Run tests immediately on start', false);

program.parse();

const options = program.opts();

let testProcess = null;
let debounceTimer = null;

function runTests() {
  if (testProcess) {
    testProcess.kill('SIGTERM');
  }

  console.log(`\n🧪 Running tests: ${options.command}`);
  const [cmd, ...args] = options.command.split(' ');
  testProcess = spawn(cmd, args, { 
    stdio: 'inherit', 
    shell: true,
    cwd: process.cwd(),
  });

  testProcess.on('exit', (code) => {
    if (code === 0) {
      console.log(`✅ Tests passed`);
    } else {
      console.log(`❌ Tests failed (exit ${code})`);
    }
    testProcess = null;
  });
}

function debouncedRun() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runTests, parseInt(options.debounce));
}

const watcher = chokidar.watch(options.pattern.split(','), {
  ignored: options.ignore.split(',').map(p => path.resolve(p)),
  persistent: true,
  ignoreInitial: true,
  usePolling: true,
  interval: 1000,
  binaryInterval: 300,
});

watcher.on('change', (file) => {
  console.log(`\n📝 Changed: ${file}`);
  debouncedRun();
});

watcher.on('add', (file) => {
  console.log(`\n➕ Added: ${file}`);
  debouncedRun();
});

watcher.on('unlink', (file) => {
  console.log(`\n🗑️  Deleted: ${file}`);
  debouncedRun();
});

console.log(`👀 Watching: ${options.pattern}`);
console.log(`🧪 Command: ${options.command}`);
console.log(`⏱️  Debounce: ${options.debounce}ms`);
console.log(`🚫 Ignoring: ${options.ignore}`);

if (options.runOnStart) {
  console.log(`\n🚀 Running initial test...`);
  runTests();
}

process.on('SIGINT', () => {
  if (testProcess) testProcess.kill('SIGTERM');
  watcher.close();
  console.log('\n👋 Stopped watching');
  process.exit(0);
});