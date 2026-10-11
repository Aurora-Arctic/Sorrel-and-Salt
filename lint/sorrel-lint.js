import { posix, relative, sep } from 'node:path';

// The architecture rules lint can carry, as oxlint JS-plugin rules loaded by
// `.oxlintrc.json`'s `jsPlugins` (claude-docs/testing/layer-ownership.md,
// "What a test may assert", rule 8). Each was a Vitest guard scanning the tree
// on every run; a rule here fails the diff that breaks it in the editor and in
// `npm run lint`, and costs the test run nothing. Each was proved once by a
// probe file `npm run lint` rejected (MB.224).

/** The file being linted, repo-relative with forward slashes. */
const fileOf = (context) => relative(context.cwd, context.filename).split(sep).join('/');

/** Which modules each module may import: the graph is acyclic and this is it (claude-docs/modules.md). */
const ALLOWED = {
  identity: [],
  coven: ['identity'],
  vocabulary: ['identity', 'coven'],
  ingredients: ['identity', 'coven', 'vocabulary'],
  grimoire: ['identity', 'coven', 'vocabulary', 'ingredients'],
};
const moduleOf = (path) => /^src\/modules\/([^/]+)\/?(.*)$/.exec(path);

export default {
  meta: { name: 'sorrel' },
  rules: {
    // CLAUDE.md rule 1: no third access path. A directive, not an import, so
    // `no-restricted-imports` cannot see it.
    'no-use-server': {
      create: (context) => ({
        ExpressionStatement(node) {
          if (node.directive === 'use server') {
            context.report({ node, message: 'No server actions (CLAUDE.md rule 1)' });
          }
        },
      }),
    },
    // CLAUDE.md rule 2: `server-only` turns a client bundle reaching a service
    // into a `next build` error, so every service file carries it.
    'service-server-only': {
      create: (context) => ({
        Program(program) {
          if (!/^src\/modules\/[^/]+\/services\//.test(fileOf(context))) return;
          const marked = program.body.some(
            (statement) =>
              statement.type === 'ImportDeclaration' && statement.source.value === 'server-only',
          );
          if (!marked) {
            context.report({ node: program, message: "A service opens with import 'server-only'" });
          }
        },
      }),
    },
    // CLAUDE.md rule 1: a route handler is a file, so only its path can be checked.
    'route-allowlist': {
      create: (context) => ({
        Program(program) {
          const file = fileOf(context);
          if (
            /^src\/app\/.*\/route\.(?:[jt]sx?|mjs)$/.test(file) &&
            !/^src\/app\/api\/(?:graphql|auth\/\[\.\.\.all\])\/route\./.test(file)
          ) {
            context.report({
              node: program,
              message: 'Only /api/graphql and /api/auth/* may be route handlers',
            });
          }
        },
      }),
    },
    // CLAUDE.md rule 8: the Relay plugin's `t.connection` is called inside the M3.6 helper alone.
    'pagination-helper': {
      create: (context) => ({
        CallExpression(node) {
          if (
            node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'connection' &&
            fileOf(context) !== 'src/graphql/pagination.ts'
          ) {
            context.report({ node, message: 'Lists paginate through t.pagedConnection (M3.6)' });
          }
        },
      }),
    },
    // claude-docs/modules.md, "The boundary": the relative spellings a path
    // glob cannot judge. A module is reached through its index, `schema/` or
    // `validation/`, only along an edge ALLOWED names, and never reaches up
    // into the app; the repository through its index alone.
    'module-boundaries': {
      create: (context) => {
        const from = fileOf(context);
        if (!from.startsWith('src/')) return {};
        const check = (node) => {
          const specifier = node.source?.value;
          if (typeof specifier !== 'string') return;
          const to = specifier.startsWith('@/')
            ? `src/${specifier.slice(2)}`
            : specifier.startsWith('.')
              ? posix.join(posix.dirname(from), specifier)
              : null;
          if (!to) return;
          const [source, target] = [moduleOf(from), moduleOf(to)];
          let message;
          if (source && /^src\/(?:app|components|emails|proxy)(?:[/.]|$)/.test(to)) {
            message = 'A module never imports the app, components, emails or the proxy above it';
          } else if (
            to.startsWith('src/db/repository/') &&
            !from.startsWith('src/db/repository/') &&
            !/^src\/db\/repository\/index(?:\.ts)?$/.test(to)
          ) {
            message = 'Import the repository through its index (`@/db/repository`)';
          } else if (target && source?.[1] !== target[1]) {
            if (!/^(?:index(?:\.tsx?)?|schema\/.*|validation\/.*)?$/.test(target[2])) {
              message = `Reach ${target[1]} through its index, schema/ or validation/ files`;
            } else if (source && !ALLOWED[source[1]]?.includes(target[1])) {
              message = `${source[1]} may not import ${target[1]}: the module graph is acyclic`;
            }
          }
          if (message) context.report({ node, message });
        };
        return {
          ImportDeclaration: check,
          ExportNamedDeclaration: check,
          ExportAllDeclaration: check,
          ImportExpression: check,
        };
      },
    },
  },
};
