// `unitConvert` for the browser: the module's index re-exports server-only
// services, so a client component importing through it fails to build.
// `units/convert.ts` is pure; this is the browser-safe door the module-boundaries
// lint rule allows (claude-docs/modules.md).
export { unitConvert } from '../units/convert';
