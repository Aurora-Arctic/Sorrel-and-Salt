#!/usr/bin/env node
// M0.36 — make `ladle build` actually fail when the build fails.
//
// @ladle/react 5.1.1's CLI always exits 0. Its own vite-prod.js wraps
// Vite's `build()` in a try/catch, logs the error, and returns `false` on
// failure — but build.js never checks that return value, so nothing ever
// turns into a non-zero exit code:
//
//   node_modules/@ladle/react/lib/cli/vite-prod.js
//     try { await build(viteConfig); } catch (e) { console.log(e); return false; }
//   node_modules/@ladle/react/lib/cli/build.js
//     await viteProd(config, configFolder);   // return value discarded
//
// Verified directly: a story importing a module that doesn't exist prints
// Vite's own "✗ Build failed" / "Could not resolve ..." to stdout, and
// `ladle build` still exits 0. There's no CLI flag for this and no way to
// import the CLI's build function directly — `lib/cli/build.js` isn't in
// the package's `exports` map, so a deep import throws
// ERR_PACKAGE_PATH_NOT_EXPORTED. See
// claude-docs/design-decisions/m0.36-ci-story-gate.md for the full trail.
//
// So this wraps the CLI instead: run `ladle build`, mirror its output
// exactly, and fail if Vite's own failure marker shows up in it. This is a
// workaround for an upstream gap, not a reimplementation of the build — if
// a future @ladle/react fixes the exit code, this still passes through
// (the marker never appears on a clean run) and can be deleted whenever
// this repo bumps past the fixed version.
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
