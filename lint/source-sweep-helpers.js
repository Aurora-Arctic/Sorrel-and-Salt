import { relative, sep } from 'node:path';

/** The file being linted, repo-relative with forward slashes. */
export const fileOf = (context) => relative(context.cwd, context.filename).split(sep).join('/');

export const isStory = (file) => file.endsWith('.stories.tsx');

/** A non-story source file under `src/`: `.tsx` only, or `.ts` and `.tsx` with `{ ts: true }`. */
export const isComponentFile = (file, { ts = false } = {}) =>
  (ts ? /^src\/.*\.tsx?$/ : /^src\/.*\.tsx$/).test(file) && !isStory(file);

/** The named attribute of a JSX opening element, or undefined. */
export const jsxAttribute = (node, name) =>
  node.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === name);

/** The value of an attribute written as a literal (`x="a"` or `x={'a'}`), else null. */
export function literalValue(attribute) {
  const value = attribute?.value;
  if (value?.type === 'Literal') return value.value;
  if (value?.type === 'JSXExpressionContainer' && value.expression.type === 'Literal') {
    return value.expression.value;
  }
  return null;
}

/**
 * A rule that bans something except in the files of `allowed` (file to reason), and reports a listed file that no
 * longer needs its place. `visit({ context, file, listed, flag })` returns the visitors, or null to skip the file;
 * `flag(node, message)` marks the file as needing its entry and reports unless it is listed. `staleMessage(reason, state)`
 * words the stale-entry report; `state` is the shared `{ file, listed, used }` a visitor may add notes to.
 * Options `ts` and `skip(file)` narrow the files the rule applies to.
 */
export function allowlistRule({ allowed, ts = false, skip, staleMessage, visit }) {
  return {
    create: (context) => {
      const file = fileOf(context);
      if (!isComponentFile(file, { ts }) || skip?.(file)) return {};
      const state = { file, listed: file in allowed, used: false };
      const flag = (node, message) => {
        state.used = true;
        if (!state.listed) context.report({ node, message });
      };
      const visitors = visit({ context, file, listed: state.listed, flag, state });
      if (!visitors) return {};
      return {
        ...visitors,
        'Program:exit'(program) {
          visitors['Program:exit']?.(program);
          if (state.listed && !state.used) {
            context.report({ node: program, message: staleMessage(allowed[file], state) });
          }
        },
      };
    },
  };
}
