#!/usr/bin/env node
/**
 * dev-watch.js — Combined dev mode: watch-test + watch-lint
 * Usage: hermes run dev:watch
 */

import { spawn } from 'child_process';

console.log('🚀 Starting dev watch mode (tests + lint)...\n');

const testProc = spawn('node', [
  path.resolve('./scripts/watch-test.js'),
  '--run-on-start'
], { stdio: 'inherit', shell: true });

const lintProc = spawn('node', [
  path.resolve('./scripts/watch-lint.js'),
  '--run-on-start'
], { stdio: 'inherit', shell: true });

function cleanup() {
  testProc.kill('SIGTERM');
  lintProc.kill('SIGTERM');
  console.log('\n👋 Dev watch stopped');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

testProc.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`\n⚠️  Test watcher exited with code ${code}`);
  }
});

lintProc.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`\n⚠️  Lint watcher exited with code ${code}`);
  }
});

console.log('👀 Watching for changes... (Ctrl+C to stop)');