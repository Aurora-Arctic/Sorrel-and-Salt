#!/usr/bin/env node
// Builds the workshop as a static Storybook site, relaying Storybook's exit code (claude-docs/workshop.md,
// "The build gate").
// Usage: npm run workshop:build [-- --outDir <dir>]

import { spawn } from 'node:child_process';

const args = process.argv
  .slice(2)
  .map((arg) => (arg === '--outDir' ? '--output-dir' : arg.replace(/^--outDir=/, '--output-dir=')));

// With no output directory given, build to `.reports/workshop`, the
// gitignored directory the build has always gone to.
if (!args.some((arg) => arg.startsWith('--output-dir'))) {
  args.push('--output-dir', '.reports/workshop');
}

const child = spawn('npx', ['storybook', 'build', '--disable-telemetry', ...args], {
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code ?? 1);
});
