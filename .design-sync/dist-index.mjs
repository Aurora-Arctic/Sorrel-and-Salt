// Copied to dist/index.mjs by buildCmd: the entry the sync bundles. It imports the
// `process` stand-in and only then the real list (core.mjs, built from index.ts). The
// stand-in must be its own first import: Rolldown moves a shim imported inside the list
// after the chunks above it, and `strictExecutionOrder` does not cover the `next/*`
// modules the sync's bundler inlines afterwards.
import './_process-shim.mjs';

export * from './core.mjs';
