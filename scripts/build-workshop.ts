#!/usr/bin/env node
// Makes `ladle build` actually fail when the build fails: @ladle/react 5.1.1's
// CLI always exits 0, so this runs it, mirrors its output, and fails on Vite's
// own failure marker. A workaround for an upstream gap, deletable once this
// repo bumps past a version that fixes the exit code — the marker never appears
// on a clean run. Why neither tidier fix is available:
// claude-docs/workshop.md, "The build gate".
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
