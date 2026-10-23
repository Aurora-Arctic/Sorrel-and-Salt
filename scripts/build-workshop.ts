#!/usr/bin/env node
// Builds the workshop as a static Storybook site. Storybook's CLI exits non-zero
// when a build fails, so this only passes the arguments through and relays that
// exit code; it exists so `npm run workshop:build` has one place to change.
// See claude-docs/workshop.md, "The build gate".
//
// Usage: npm run workshop:build [-- --outDir <dir>]
//   e.g. npm run workshop:build -- --outDir public/workshop
// `--outDir` is this script's name for Storybook's `--output-dir`; the build uses
// relative asset paths, so no base option is needed to serve it under /workshop/.

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
