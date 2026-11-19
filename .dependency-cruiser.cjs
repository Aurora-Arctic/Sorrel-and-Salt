// The module graph `npm run review:affected` draws for a reviewer. It holds no rules: Oxlint owns
// the import rules, cycles included, so this config never fails anything.
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  options: {
    // dependency-cruiser's TypeScript parser does not support the repo's TypeScript and finds no
    // modules without a warning; swc parses the files itself.
    parser: 'swc',
    exclude: {
      // swc cannot parse a `using` declaration and stops the whole cruise on it.
      path: '^src/modules/documents/jobs/document-mailing\\.ts$',
    },
    doNotFollow: { path: ['node_modules'] },
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.d.ts', '.mts', '.js', '.mjs', '.cjs', '.json'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      exportsFields: ['exports'],
      mainFields: ['module', 'main', 'types'],
    },
  },
};
