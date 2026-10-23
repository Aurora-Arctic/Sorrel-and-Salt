// A stand-in for Node's `process`, imported first by dist-index.mjs and built as its own entry
// (vite.config.ts). The Next.js code the bundle pulls in reads `process.env` while it
// loads, and a browser has no `process`, so the bundle died before it set
// window.SorrelAndSalt. Not Vite's `define`: the sync's own bundler inlines that Next.js
// code from node_modules after this build, where a define never reaches. Its own chunk,
// because a shim inside the export list runs after the chunks imported above it.
const shim = {
  env: {},
  cwd: () => '/',
  nextTick: (f: (...a: unknown[]) => void, ...a: unknown[]) => queueMicrotask(() => f(...a)),
};
const host = globalThis as unknown as { process?: unknown };
host.process ??= shim;
