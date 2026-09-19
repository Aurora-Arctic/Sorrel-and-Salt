#!/usr/bin/env node
// `ladle build` always exits 0 (@ladle/react 5.1.1), so this mirrors its output
// and fails on Vite's own failure marker, which never appears on a clean run.
// Deletable once upstream fixes it. See claude-docs/workshop.md, "The build gate".
//
// Usage: npm run workshop:build

import { spawn } from 'node:child_process';

const FAILURE_MARKER = 'Build failed';

const child = spawn('npx', ['ladle', 'build'], { stdio: ['inherit', 'pipe', 'pipe'] });

let output = '';
const relay = (target: NodeJS.WriteStream) => (chunk: Buffer) => {
  target.write(chunk);
  output += chunk.toString();
};
child.stdout.on('data', relay(process.stdout));
child.stderr.on('data', relay(process.stderr));

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('close', (code) => {
  if (output.includes(FAILURE_MARKER)) {
    console.error(
      `\nbuild-workshop — ladle build reported "${FAILURE_MARKER}" above but exited 0 ` +
        "(a known @ladle/react 5.1.1 gap, not this repo's bug); failing the run instead.",
    );
    process.exit(1);
  }
  process.exit(code ?? 0);
});
