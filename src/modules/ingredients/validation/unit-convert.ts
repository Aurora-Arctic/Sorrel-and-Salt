// `unitConvert` for the browser. The module's index re-exports its services, which open with
// `import 'server-only'`, so a client component reaching `unitConvert` through the index drags
// the server into its bundle and every page importing it fails to build (found 2026-10-28, on
// M10.19's supply check). `units/convert.ts` is pure: this file is the browser-safe door to it
// that the module-boundaries lint rule allows, as `validation/` is (claude-docs/modules.md).
export { unitConvert } from '../units/convert';
export type { UnitConversion } from '../units/types';
