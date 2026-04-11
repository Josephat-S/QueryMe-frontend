#!/usr/bin/env node
// This wrapper bypasses npm's shell issues
const { spawn } = require('child_process');
const path = require('path');

const viteScript = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
const args = process.argv.slice(2);

const child = spawn(process.execPath, [viteScript, ...args], {
  stdio: 'inherit',
  shell: false
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});

child.on('exit', (code) => {
  process.exit(code);
});
