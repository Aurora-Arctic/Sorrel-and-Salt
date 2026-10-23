// Post-step of `npm run build:components` for the design sync. The converter takes ONE
// entry with its types, and the library build makes one module per component, so this
// writes, into the gitignored dist/:
//   index.mjs      re-exports every per-component entry. Each entry default-exports its
//                  component and `export *` skips defaults, so the default is re-exported
//                  under the file's name.
//   index.d.ts     the same for types, over the declarations written by
//                  `tsc -p .design-sync/tsconfig.dts.json` (run before this script).
//   package.json   makes dist/ the package root the converter reads `types` from.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
const hasDefault = (text) => /\bas default\b|export default|export \{ default \}/.test(text);

const files = readdirSync('dist')
  .filter((f) => /^[A-Za-z0-9]+\.mjs$/.test(f) && f !== 'index.mjs')
  .sort();
const js = files.flatMap((f) => {
  const name = f.replace(/\.mjs$/, '');
  return [
    `export * from './${f}';`,
    ...(hasDefault(readFileSync(`dist/${f}`, 'utf8')) ? [`export { default as ${name} } from './${f}';`] : []),
  ];
});
// The bundled Next.js internals read process.env at load; a browser has no `process`.
// The shim module comes first so it evaluates before them.
writeFileSync('dist/_process-shim.mjs', "globalThis.process ??= { env: {}, cwd: () => '/', nextTick: (f, ...a) => queueMicrotask(() => f(...a)) };\n");
// next/navigation's hooks throw without a mounted App Router, which a design preview has
// none of. Every chunk's import of it is pointed at these instead. They read the same
// contexts the workshop's frames fill (.storybook/navigation.tsx: WorkshopPathname,
// WorkshopNavigation), so a story can set the page and the router. _context.mjs exports
// those contexts and config storyImports.shim points the stories' imports of them at the
// bundle, so there is one instance. With nothing provided, the path is the one
// .storybook/preview.tsx sets as the framework default.
writeFileSync(
  'dist/_next-navigation.mjs',
  "import { useContext } from 'react';\n" +
    "import { PathnameContext, PathParamsContext, SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js';\n" +
    "import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';\n" +
    "const r = { push() {}, replace() {}, back() {}, forward() {}, refresh() {}, prefetch() {} };\n" +
    "const noParams = {};\nconst noSearch = new URLSearchParams();\n" +
    "export const useRouter = () => useContext(AppRouterContext) ?? r;\n" +
    "export const usePathname = () => useContext(PathnameContext) ?? '/admin/users';\n" +
    "export const useSearchParams = () => useContext(SearchParamsContext) ?? noSearch;\n" +
    "export const useParams = () => useContext(PathParamsContext) ?? noParams;\n" +
    "export const useSelectedLayoutSegment = () => null;\nexport const useSelectedLayoutSegments = () => [];\n" +
    "export const redirect = () => {};\nexport const notFound = () => {};\nexport const permanentRedirect = () => {};\n",
);
for (const f of readdirSync('dist').filter((n) => n.endsWith('.mjs') && n !== '_next-navigation.mjs')) {
  const t = readFileSync(`dist/${f}`, 'utf8');
  const r = t.replace(/(from\s*|import\s*)(["'])next\/navigation\2/g, "$1'./_next-navigation.mjs'");
  if (r !== t) writeFileSync(`dist/${f}`, r);
}
writeFileSync(
  'dist/index.mjs',
  ["import './_process-shim.mjs';", ...js, "export * from './_context.mjs';", "export { default as __providers } from './_providers.mjs';"].join('\n') + '\n',
);

const dts = [];
for (const name of readdirSync('dist/types/components').sort()) {
  const file = `dist/types/components/${name}/index.d.ts`;
  if (!existsSync(file)) continue;
  const path = `./types/components/${name}`;
  dts.push(`export * from '${path}';`);
  if (hasDefault(readFileSync(file, 'utf8'))) dts.push(`export { default as ${name} } from '${path}';`);
}
writeFileSync('dist/index.d.ts', dts.join('\n') + '\n');
writeFileSync(
  'dist/package.json',
  JSON.stringify({ name: 'sorrel-and-salt', version: '0.0.0', type: 'module', types: 'index.d.ts' }, null, 2) + '\n',
);
console.log(`dist/index.mjs: ${files.length} entries; dist/index.d.ts: ${dts.length} lines`);
