import type { Plugin } from 'vite';

// The `rsc` project's stand-in for Next's bundler: a module that opens with `'use client'` is
// replaced by client references, so a Flight render serialises its element's props, as the app's
// server does, rather than run its hooks under the `react-server` build, which has none.
// `CLIENT_MANIFEST` is the manifest `renderToReadableStream` resolves those references through.

const USE_CLIENT = /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/;

interface Node {
  type: string;
  [key: string]: unknown;
}

/** The names a module exports, read from its compiled body: by then its type-only exports are gone. */
function exportNames(program: { body: Node[] }): string[] {
  const names: string[] = [];
  for (const node of program.body) {
    if (node.type === 'ExportDefaultDeclaration') names.push('default');
    if (node.type !== 'ExportNamedDeclaration') continue;
    const declaration = node.declaration as Node | null;
    if (declaration?.type === 'VariableDeclaration') {
      for (const each of declaration.declarations as { id: { name: string } }[]) {
        names.push(each.id.name);
      }
    } else if (declaration) {
      names.push((declaration.id as { name: string }).name);
    }
    for (const specifier of (node.specifiers as { exported: { name: string } }[]) ?? []) {
      names.push(specifier.exported.name);
    }
  }
  return names;
}

export function clientReferences(): Plugin {
  return {
    name: 'sorrel:client-references',
    // After esbuild, so the body parsed is plain JavaScript with its types stripped.
    enforce: 'post',
    transform(code, id) {
      if (id.includes('/node_modules/') || !USE_CLIENT.test(code)) return undefined;
      const file = id.split('?')[0];
      const lines = exportNames(this.parse(code) as unknown as { body: Node[] }).map((name) => {
        const reference = `registerClientReference(function () { throw new Error(${JSON.stringify(
          `${file}#${name} is a client reference and cannot be called on the server`,
        )}); }, ${JSON.stringify(file)}, ${JSON.stringify(name)})`;
        return name === 'default'
          ? `export default ${reference};`
          : `export const ${name} = ${reference};`;
      });
      return {
        code: [
          "import { registerClientReference } from 'react-server-dom-webpack/server.edge';",
          ...lines,
        ].join('\n'),
        map: null,
      };
    },
  };
}

/** Resolves every client reference to itself: its module id the file, in no chunk. */
export const CLIENT_MANIFEST: Record<string, unknown> = new Proxy(
  {},
  {
    get: (_target, key) => {
      if (typeof key !== 'string') return undefined;
      const at = key.lastIndexOf('#');
      return { id: key.slice(0, at), chunks: [], name: key.slice(at + 1) };
    },
  },
);
