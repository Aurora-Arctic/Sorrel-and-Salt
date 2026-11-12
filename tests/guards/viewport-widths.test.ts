import { dirname, join, normalize } from 'node:path';
import { devices } from '@playwright/test';
import { compile, compileString } from 'sass';
import { parseAst } from 'vite';
import { describe, expect, inject, it } from 'vitest';
import { TABLET_BAND } from '@/lib/use-media-query';
import { fromRoot } from '../support/paths';
import { readSource, sourceFiles } from '../support/repo-scan';

// A spec sets a window width (`setViewportSize`, or `test.use({ viewport })`) only to cross a breakpoint the code has, so each width comes from the one
// shared breakpoint file, or is the 375px phone width (claude-docs/audits/test-performance.md, R-4). A
// width written by hand in a spec drifts from the stylesheet it means to cross. The breakpoint file is
// itself held to its sources here: each width it gives is the one a mixin, a stylesheet or TABLET_BAND has.

const BREAKPOINT_FILE = 'tests/e2e/breakpoints.ts';
const BREAKPOINT_MODULE = BREAKPOINT_FILE.replace(/\.ts$/, '');

// The shape the specs import. Each width is in CSS pixels.
interface BreakpointFile {
  // The one phone width outside the list.
  PHONE_WIDTH: number;
  // The desktop project's own window width (playwright.config.ts runs Desktop Chrome).
  DESKTOP_WIDTH: number;
  // Window widths a media query turns on. A key past these three is any other edge a stylesheet has.
  BREAKPOINTS: { phone: number; tablet: number; pageWithNavWide: number } & Record<string, number>;
  // A width inside a band rather than on its edge: above the phone edge, at or under the tablet edge.
  BAND_WIDTHS: { tablet: number };
  // The page header's own container widths: every edge a `page-header` container query has, once each.
  PAGE_HEADER: Record<string, number>;
  // What a page column takes off the window before the page header: its inline padding, both sides.
  PAGE_HEADER_GUTTER: number;
  // Widths that are not an edge: a shipped bug's width, or one a fixed reason names.
  PURPOSE_WIDTHS: Record<string, number>;
}

const loadBreakpoints = () =>
  import(/* @vite-ignore */ fromRoot(BREAKPOINT_FILE)) as Promise<BreakpointFile>;

// ---------------------------------------------------------------------------------------------------
// The stylesheets' edges, read from compiled CSS so a variable, a mixin or a calc() resolves as it ships.

const REM = 16;
const SASS = {
  style: 'expanded' as const,
  loadPaths: [fromRoot('src/scss'), fromRoot('node_modules')],
};

// Evaluates a compiled width (`40rem`, `calc(4rem * 6 + 28rem + 2rem * 2)`) to pixels; `undefined` for a
// unit a window width cannot be read from (`66ch`). The `0.01rem` step that puts an edge on one side is
// dropped, so an edge reads the same from `container-to` and `container-from`.
function pixels(expression: string): number | undefined {
  const source = expression.replace(/\s*[+-]\s*0\.01rem\b/g, '').replace(/calc\(/g, '(');
  const tokens = source.match(/\d*\.?\d+(?:rem|px)?|[-+*/()]/g) ?? [];
  if (tokens.join('') !== source.replace(/\s+/g, '')) return undefined;
  let at = 0;
  const number = (): number => {
    const token = tokens[at++];
    if (token === '(') {
      const value = sum();
      at++;
      return value;
    }
    if (token === '-') return -number();
    const value = Number.parseFloat(token);
    return token.endsWith('rem') ? value * REM : value;
  };
  const product = (): number => {
    let value = number();
    while (tokens[at] === '*' || tokens[at] === '/') {
      value = tokens[at++] === '*' ? value * number() : value / number();
    }
    return value;
  };
  function sum(): number {
    let value = product();
    while (tokens[at] === '+' || tokens[at] === '-') {
      value = tokens[at++] === '+' ? value + product() : value - product();
    }
    return value;
  }
  return Math.round(sum() * 100) / 100;
}

// The widths a query's prelude tests, e.g. `(min-width: calc(40rem + 0.01rem))` gives 640.
function edgesIn(prelude: string): number[] {
  const edges: number[] = [];
  for (const match of prelude.matchAll(
    /\b(?:min-width|max-width|inline-size)\s*:\s*|\bwidth\s*[<>]=?\s*/g,
  )) {
    let depth = 0;
    let end = match.index + match[0].length;
    for (; end < prelude.length; end++) {
      if (prelude[end] === '(') depth++;
      else if (prelude[end] === ')' && depth-- === 0) break;
    }
    const edge = pixels(prelude.slice(match.index + match[0].length, end).trim());
    if (edge !== undefined) edges.push(edge);
  }
  return edges;
}

const preludes = (css: string, at: RegExp) => [...css.matchAll(at)].map((match) => match[1]);
const MEDIA = /@media([^{]*)\{/g;
const PAGE_HEADER_CONTAINER = /@container page-header([^{]*)\{/g;

function snippetEdges(body: string): number[] {
  const css = compileString(`@use 'variables' as *; @use 'mixins' as *; ${body}`, SASS).css;
  return [...new Set(preludes(css, MEDIA).flatMap(edgesIn))];
}

// Every stylesheet a page loads, compiled once: the partials reach the page through these.
let compiled: string[] | undefined;
function compiledStylesheets(): string[] {
  if (compiled) return compiled;
  const files = inject('repoFiles').filter(
    (file) => /^src\/.*\.scss$/.test(file) && !/(^|\/)_[^/]*$/.test(file),
  );
  // Precondition: the listing holds the sheet the primitives reach the page through, and a component's.
  expect(files).toContain('src/app/globals.scss');
  expect(files).toContain('src/components/TabbedPage/index.scss');
  compiled = files.map((file) => compile(fromRoot(file), SASS).css);
  return compiled;
}

const sorted = (values: Iterable<number>) => [...new Set(values)].sort((a, b) => a - b);

describe('the shared e2e breakpoint file', () => {
  it('gives the 375px phone width as its one constant outside the list', async () => {
    const { PHONE_WIDTH } = await loadBreakpoints();
    expect(PHONE_WIDTH).toBe(375);
  });

  it("gives the desktop width as the desktop project's own window", async () => {
    const { DESKTOP_WIDTH } = await loadBreakpoints();
    // Precondition: the e2e projects run the device this width is read from.
    expect(readSource('playwright.config.ts')).toContain("devices['Desktop Chrome']");
    expect(DESKTOP_WIDTH).toBe(devices['Desktop Chrome'].viewport.width);
  });

  it('gives the phone and tablet edges the breakpoint mixins hold', async () => {
    const { BREAKPOINTS } = await loadBreakpoints();
    expect(snippetEdges('.a { @include phone-down { color: red; } }')).toEqual([BREAKPOINTS.phone]);
    expect(snippetEdges('.a { @include above-phone { color: red; } }')).toEqual([
      BREAKPOINTS.phone,
    ]);
    expect(snippetEdges('.a { @include tablet-down { color: red; } }')).toEqual([
      BREAKPOINTS.tablet,
    ]);
    expect(snippetEdges('.a { @include above-tablet { color: red; } }')).toEqual([
      BREAKPOINTS.tablet,
    ]);
  });

  it("gives the phone edge TABLET_BAND starts above, the script's copy of it", async () => {
    const { BREAKPOINTS } = await loadBreakpoints();
    // Precondition: the band is the wide side of one edge, written as that edge plus the 0.01rem step.
    const band = /^\(min-width: (\d*\.?\d+)rem\)$/.exec(TABLET_BAND);
    expect(band).not.toBeNull();
    expect(Math.round((Number(band![1]) - 0.01) * REM * 100) / 100).toBe(BREAKPOINTS.phone);
  });

  it('gives the width a page with a menu stands three columns from, and the framed tabbed header with it', async () => {
    const { BREAKPOINTS } = await loadBreakpoints();
    const wide = snippetEdges('.a { @include page-with-nav-grid; }').filter(
      (edge) => edge !== BREAKPOINTS.phone,
    );
    expect(wide).toEqual([BREAKPOINTS.pageWithNavWide]);

    // The framed tabbed page's header moves at the same width, written as its own sum.
    const framed = compile(fromRoot('src/components/TabbedPage/index.scss'), SASS).css;
    expect(
      sorted(preludes(framed, MEDIA).flatMap(edgesIn)).filter((edge) => edge !== BREAKPOINTS.phone),
    ).toEqual([BREAKPOINTS.pageWithNavWide]);
  });

  it('gives no other window width than one a stylesheet has', async () => {
    const { BREAKPOINTS } = await loadBreakpoints();
    const edges = sorted(
      compiledStylesheets().flatMap((css) => preludes(css, MEDIA).flatMap(edgesIn)),
    );
    // Precondition: the compiled sheets hold the edges the named keys were checked against.
    expect(edges).toEqual(
      expect.arrayContaining([BREAKPOINTS.phone, BREAKPOINTS.tablet, BREAKPOINTS.pageWithNavWide]),
    );
    expect(Object.values(BREAKPOINTS).filter((width) => !edges.includes(width))).toEqual([]);
  });

  it('gives a tablet band width above the phone edge and at or under the tablet edge', async () => {
    const { BREAKPOINTS, BAND_WIDTHS } = await loadBreakpoints();
    expect(BAND_WIDTHS.tablet).toBeGreaterThan(BREAKPOINTS.phone);
    expect(BAND_WIDTHS.tablet).toBeLessThanOrEqual(BREAKPOINTS.tablet);
  });

  it('gives every page header container edge the stylesheets have, and no other', async () => {
    const { PAGE_HEADER } = await loadBreakpoints();
    const edges = sorted(
      compiledStylesheets().flatMap((css) => preludes(css, PAGE_HEADER_CONTAINER).flatMap(edgesIn)),
    );
    // Precondition: the scan reached the page header's queries, the primitives' and TabbedPage's.
    expect(edges.length).toBeGreaterThan(1);
    expect(sorted(Object.values(PAGE_HEADER))).toEqual(edges);
  });

  it("gives the page header's gutter as the page column's inline padding on both sides", async () => {
    const { PAGE_HEADER_GUTTER } = await loadBreakpoints();
    const css = compileString(
      "@use 'variables' as *; .a { padding-inline: $page-column-pad-inline; }",
      SASS,
    ).css;
    const pad = pixels(/padding-inline:\s*([^;]+);/.exec(css)![1]);
    expect(PAGE_HEADER_GUTTER).toBe(2 * pad!);
  });
});

// ---------------------------------------------------------------------------------------------------
// The specs' widths, followed from each `setViewportSize` call back to where the width is written.

// The parser's ESTree nodes, loosely: the guard reads a handful of fields by node type.
interface Node {
  type: string;
  start: number;
  end: number;
  [field: string]: unknown;
}

interface Source {
  file: string;
  code: string;
  program: Node;
  parents: WeakMap<Node, Node>;
}

// A step into a value: a named property, an array index, or any element or property at all.
type Step = { prop: string } | { index: number } | 'each';

// Where a width was found to come from. `ok` is the breakpoint file or the page's own size read back.
interface Leaf {
  ok: boolean;
  source: Source;
  node: Node;
  reason: string;
}

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' && value !== null && typeof (value as Node).type === 'string';

const children = (node: Node): Node[] =>
  Object.values(node).flatMap((value) =>
    Array.isArray(value) ? value.filter(isNode) : isNode(value) ? [value] : [],
  );

function walk(node: Node, visit: (node: Node) => void) {
  visit(node);
  for (const child of children(node)) walk(child, visit);
}

function parseSource(file: string, code: string): Source {
  const program = parseAst(
    code,
    { lang: file.endsWith('x') ? 'tsx' : 'ts' },
    file,
  ) as unknown as Node;
  const parents = new WeakMap<Node, Node>();
  walk(program, (node) => {
    for (const child of children(node)) parents.set(child, node);
  });
  return { file, code, program, parents };
}

const lineOf = (source: Source, node: Node) => source.code.slice(0, node.start).split('\n').length;
const textOf = (source: Source, node: Node) => source.code.slice(node.start, node.end);
const nameOf = (node: unknown) =>
  isNode(node) ? ((node.name as string | undefined) ?? String(node.value)) : undefined;

const WRAPPERS = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSTypeAssertion',
  'ParenthesizedExpression',
  'ChainExpression',
]);
const ARRAY_CALLBACKS = new Set(['forEach', 'map', 'flatMap', 'filter', 'some', 'every']);

type Binding =
  | { kind: 'import'; source: string; imported: string }
  | { kind: 'value'; init: Node | undefined; steps: Step[]; defaults: Default[] }
  | { kind: 'each'; of: Node; steps: Step[]; defaults: Default[] }
  | { kind: 'param'; fn: Node; index: number; steps: Step[]; defaults: Default[] }
  | { kind: 'other' };

// A default in a pattern stands for the value the steps after it then read into.
interface Default {
  node: Node;
  steps: Step[];
}

// Where in a destructuring pattern `name` is bound, as the steps that reach it.
function stepsTo(pattern: Node, name: string): { steps: Step[]; defaults: Default[] } | undefined {
  switch (pattern.type) {
    case 'Identifier':
      return pattern.name === name ? { steps: [], defaults: [] } : undefined;
    case 'AssignmentPattern': {
      const found = stepsTo(pattern.left as Node, name);
      return (
        found && {
          steps: found.steps,
          defaults: [{ node: pattern.right as Node, steps: found.steps }, ...found.defaults],
        }
      );
    }
    case 'RestElement':
      return stepsTo(pattern.argument as Node, name);
    case 'ObjectPattern':
      for (const property of pattern.properties as Node[]) {
        if (property.type === 'RestElement') {
          const found = stepsTo(property, name);
          if (found) return found;
          continue;
        }
        const found = stepsTo(property.value as Node, name);
        if (found) {
          const step: Step = property.computed ? 'each' : { prop: nameOf(property.key)! };
          return { steps: [step, ...found.steps], defaults: found.defaults };
        }
      }
      return undefined;
    case 'ArrayPattern':
      for (const [index, element] of (pattern.elements as (Node | null)[]).entries()) {
        const found = element && stepsTo(element, name);
        if (found) {
          const step: Step = element.type === 'RestElement' ? 'each' : { index };
          return { steps: [step, ...found.steps], defaults: found.defaults };
        }
      }
      return undefined;
    default:
      return undefined;
  }
}

function declaredIn(statement: Node, name: string): Binding | undefined {
  const declaration =
    statement.type === 'ExportNamedDeclaration'
      ? (statement.declaration as Node | null)
      : statement;
  if (!declaration) return undefined;
  if (declaration.type === 'ImportDeclaration') {
    for (const specifier of declaration.specifiers as Node[]) {
      if (nameOf(specifier.local) !== name) continue;
      const imported =
        specifier.type === 'ImportSpecifier' ? nameOf(specifier.imported)! : specifier.type;
      return { kind: 'import', source: (declaration.source as Node).value as string, imported };
    }
  }
  if (declaration.type === 'VariableDeclaration') {
    for (const declarator of declaration.declarations as Node[]) {
      const found = stepsTo(declarator.id as Node, name);
      if (found) return { kind: 'value', init: declarator.init as Node | undefined, ...found };
    }
  }
  if (
    (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') &&
    nameOf(declaration.id) === name
  ) {
    return { kind: 'other' };
  }
  return undefined;
}

function bindingOf(source: Source, identifier: Node): Binding | undefined {
  const name = identifier.name as string;
  for (let node = source.parents.get(identifier); node; node = source.parents.get(node)) {
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      for (const [index, param] of (node.params as Node[]).entries()) {
        const found = stepsTo(param, name);
        if (found) return { kind: 'param', fn: node, index, ...found };
      }
    }
    if (node.type === 'ForOfStatement' || node.type === 'ForInStatement') {
      const left = node.left as Node;
      const found =
        left.type === 'VariableDeclaration' &&
        stepsTo((left.declarations as Node[])[0].id as Node, name);
      if (found) return { kind: 'each', of: node.right as Node, ...found };
    }
    if (node.type === 'ForStatement' && isNode(node.init)) {
      const found = declaredIn(node.init, name);
      if (found) return found;
    }
    const body = (node.type === 'SwitchCase' ? node.consequent : node.body) as Node[] | undefined;
    if (Array.isArray(body)) {
      for (const statement of body) {
        const found = declaredIn(statement, name);
        if (found) return found;
      }
    }
  }
  return undefined;
}

// The file a relative import names, as a path from the repository root without its extension.
const moduleOf = (from: string, specifier: string) =>
  specifier.startsWith('.')
    ? normalize(join(dirname(from), specifier)).replace(/\.tsx?$/, '')
    : undefined;

class WidthTracer {
  private readonly sources = new Map<string, Source>();
  private readonly breakpointModule: string;

  constructor(files: Record<string, string>, breakpointModule: string) {
    this.breakpointModule = breakpointModule;
    for (const [file, code] of Object.entries(files))
      this.sources.set(file, parseSource(file, code));
  }

  private sourceFor(module: string): Source | undefined {
    return (
      this.sources.get(`${module}.ts`) ??
      this.sources.get(`${module}.tsx`) ??
      this.sources.get(`${module}/index.ts`)
    );
  }

  // Every `setViewportSize` call and `test.use({ viewport })` outside the breakpoint file, with the
  // leaves its width comes from. A `test.use` with no viewport gives no leaves.
  calls(): { source: Source; call: Node; leaves: Leaf[] }[] {
    const found: { source: Source; call: Node; leaves: Leaf[] }[] = [];
    for (const source of this.sources.values()) {
      if (source.file.replace(/\.tsx?$/, '') === this.breakpointModule) continue;
      walk(source.program, (node) => {
        const callee = node.callee as Node | undefined;
        if (node.type !== 'CallExpression' || callee?.type !== 'MemberExpression') return;
        const [options] = node.arguments as Node[];
        const method = nameOf(callee.property);
        if (method === 'setViewportSize') {
          found.push({
            source,
            call: node,
            leaves: this.trace(source, options, [{ prop: 'width' }]),
          });
        } else if (method === 'use' && nameOf(callee.object) === 'test' && options) {
          const steps: Step[] = [{ prop: 'viewport' }, { prop: 'width' }];
          found.push({ source, call: node, leaves: this.trace(source, options, steps) });
        }
      });
    }
    return found;
  }

  private refuse(source: Source, node: Node, reason: string): Leaf[] {
    return [{ ok: false, source, node, reason }];
  }

  private trace(source: Source, node: Node, steps: Step[], depth = 0): Leaf[] {
    if (depth > 40) return this.refuse(source, node, 'too far to follow');
    const next = (to: Node, toSteps: Step[], from: Source = source) =>
      this.trace(from, to, toSteps, depth + 1);

    if (WRAPPERS.has(node.type)) return next(node.expression as Node, steps);

    switch (node.type) {
      case 'Literal':
        if (node.value === null) return [];
        return this.refuse(source, node, 'a width written by hand');

      case 'ObjectExpression': {
        const [step, ...rest] = steps;
        if (step === undefined || (typeof step === 'object' && 'index' in step)) {
          return this.refuse(source, node, 'not a width');
        }
        return (node.properties as Node[]).flatMap((property) => {
          if (property.type === 'SpreadElement') return next(property.argument as Node, steps);
          if (step === 'each' || nameOf(property.key) === step.prop)
            return next(property.value as Node, rest);
          return [];
        });
      }

      case 'ArrayExpression': {
        const [step, ...rest] = steps;
        if (step === undefined || (typeof step === 'object' && 'prop' in step)) {
          return this.refuse(source, node, 'not a width');
        }
        return (node.elements as (Node | null)[]).flatMap((element, index) => {
          if (!element) return [];
          if (element.type === 'SpreadElement') return next(element.argument as Node, steps);
          return step === 'each' || step.index === index ? next(element, rest) : [];
        });
      }

      case 'MemberExpression': {
        const property = node.property as Node;
        const step: Step = !node.computed
          ? { prop: nameOf(property)! }
          : property.type === 'Literal' && typeof property.value === 'number'
            ? { index: property.value }
            : property.type === 'Literal'
              ? { prop: String(property.value) }
              : 'each';
        return next(node.object as Node, [step, ...steps]);
      }

      case 'ConditionalExpression':
        return [...next(node.consequent as Node, steps), ...next(node.alternate as Node, steps)];

      case 'LogicalExpression':
        return [...next(node.left as Node, steps), ...next(node.right as Node, steps)];

      case 'BinaryExpression': {
        if (steps.length > 0 || (node.operator !== '+' && node.operator !== '-')) {
          return this.refuse(source, node, 'not a width');
        }
        // One pixel past an edge reaches its other side; any other number is a width by hand.
        const one = (side: Node) => side.type === 'Literal' && side.value === 1;
        if (one(node.right as Node)) return next(node.left as Node, steps);
        if (node.operator === '+' && one(node.left as Node)) return next(node.right as Node, steps);
        return [...next(node.left as Node, steps), ...next(node.right as Node, steps)];
      }

      case 'CallExpression': {
        const callee = node.callee as Node;
        // The window put back to the size it had: a size read from the page, not chosen.
        if (callee.type === 'MemberExpression' && nameOf(callee.property) === 'viewportSize') {
          return [{ ok: true, source, node, reason: "the page's own size" }];
        }
        if (callee.type === 'Identifier') {
          const binding = bindingOf(source, callee);
          if (
            binding?.kind === 'import' &&
            moduleOf(source.file, binding.source) === this.breakpointModule
          ) {
            const leaves = (node.arguments as Node[]).flatMap((argument) => next(argument, []));
            const refused = leaves.filter((leaf) => !leaf.ok);
            return refused.length > 0
              ? refused
              : [{ ok: true, source, node, reason: 'the breakpoint file' }];
          }
        }
        return this.refuse(source, node, 'a call the guard cannot follow');
      }

      // A callback's element (callersOf): each element of the array the method was called on.
      case 'EachOf':
        return next(node.of as Node, ['each', ...steps]);

      case 'Identifier':
        return this.traceBinding(source, node, steps, depth);

      default:
        return this.refuse(source, node, `a ${node.type} the guard cannot follow`);
    }
  }

  private traceBinding(source: Source, identifier: Node, steps: Step[], depth: number): Leaf[] {
    const next = (to: Node, toSteps: Step[], from: Source = source) =>
      this.trace(from, to, toSteps, depth + 1);
    const binding = bindingOf(source, identifier);
    const fromDefaults = (defaults: Default[]) =>
      defaults.flatMap((fallback) => next(fallback.node, [...fallback.steps, ...steps]));

    switch (binding?.kind) {
      case undefined:
        return this.refuse(source, identifier, 'a name declared nowhere in the file');
      case 'other':
        return this.refuse(source, identifier, 'not a width');
      case 'import': {
        const module = moduleOf(source.file, binding.source);
        if (module === this.breakpointModule) {
          return [{ ok: true, source, node: identifier, reason: 'the breakpoint file' }];
        }
        const target = module && this.sourceFor(module);
        if (!target) return this.refuse(source, identifier, `imported from ${binding.source}`);
        for (const statement of target.program.body as Node[]) {
          if (statement.type !== 'ExportNamedDeclaration') continue;
          const exported = declaredIn(statement, binding.imported);
          if (exported?.kind === 'value' && exported.init) {
            return [
              ...next(exported.init, [...exported.steps, ...steps], target),
              ...exported.defaults.flatMap((fallback) =>
                next(fallback.node, [...fallback.steps, ...steps], target),
              ),
            ];
          }
        }
        return this.refuse(source, identifier, `imported from ${binding.source}`);
      }
      case 'value':
        return [
          ...(binding.init ? next(binding.init, [...binding.steps, ...steps]) : []),
          ...fromDefaults(binding.defaults),
        ];
      case 'each':
        return [
          ...next(binding.of, ['each', ...binding.steps, ...steps]),
          ...fromDefaults(binding.defaults),
        ];
      case 'param': {
        const callers = this.callersOf(source, binding.fn, binding.index);
        if (callers.length === 0 && binding.defaults.length === 0) {
          return this.refuse(source, identifier, 'a parameter the guard finds no caller for');
        }
        return [
          ...callers.flatMap(({ from, value }) => next(value, [...binding.steps, ...steps], from)),
          ...fromDefaults(binding.defaults),
        ];
      }
    }
  }

  // The values passed for a function's parameter, in its own file and in the files that import it.
  private callersOf(source: Source, fn: Node, index: number): { from: Source; value: Node }[] {
    const holder = source.parents.get(fn);
    // A callback given to an array's own method takes that array's elements.
    if (
      holder?.type === 'CallExpression' &&
      (holder.arguments as Node[])[0] === fn &&
      index === 0
    ) {
      const callee = holder.callee as Node;
      if (callee.type === 'MemberExpression' && ARRAY_CALLBACKS.has(nameOf(callee.property)!)) {
        return [
          {
            from: source,
            value: { ...(callee.object as Node), type: 'EachOf', of: callee.object },
          },
        ];
      }
    }
    const name =
      fn.type === 'FunctionDeclaration'
        ? nameOf(fn.id)
        : holder?.type === 'VariableDeclarator'
          ? nameOf(holder.id)
          : undefined;
    if (!name) return [];

    const values: { from: Source; value: Node }[] = [];
    const module = source.file.replace(/\.tsx?$/, '');
    for (const other of this.sources.values()) {
      const locals = new Set<string>();
      if (other === source) locals.add(name);
      for (const statement of other.program.body as Node[]) {
        if (statement.type !== 'ImportDeclaration') continue;
        if (moduleOf(other.file, (statement.source as Node).value as string) !== module) continue;
        for (const specifier of statement.specifiers as Node[]) {
          if (specifier.type === 'ImportSpecifier' && nameOf(specifier.imported) === name) {
            locals.add(nameOf(specifier.local)!);
          }
        }
      }
      if (locals.size === 0) continue;
      walk(other.program, (node) => {
        if (node.type !== 'CallExpression') return;
        const callee = node.callee as Node;
        if (callee.type !== 'Identifier' || !locals.has(callee.name as string)) return;
        const value = (node.arguments as Node[])[index];
        if (value) values.push({ from: other, value });
      });
    }
    return values;
  }
}

// One line per width that does not come from the breakpoint file: where it is set, and where written.
function offenders(tracer: WidthTracer): string[] {
  return tracer.calls().flatMap(({ source, call, leaves }) =>
    leaves
      .filter((leaf) => !leaf.ok)
      .map((leaf) => {
        const at = `${leaf.source.file}:${lineOf(leaf.source, leaf.node)}`;
        const set = `${source.file}:${lineOf(source, call)}`;
        return `${set} width ${textOf(leaf.source, leaf.node)}${at === set ? '' : ` (written at ${at})`}: ${leaf.reason}`;
      }),
  );
}

describe('the width a spec sets the window to', () => {
  // Each shape a spec writes, held to the rule on a spec of its own, so a guard that passes everything fails here.
  const probe = (code: string) =>
    offenders(
      new WidthTracer(
        {
          'tests/e2e/probe.spec.ts': `import { test } from '@playwright/test';
import { BAND_WIDTHS, BREAKPOINTS, PAGE_HEADER, PAGE_HEADER_GUTTER, PHONE_WIDTH, PURPOSE_WIDTHS } from './breakpoints';
import { openAt } from './probe-helpers';
${code}`,
          'tests/e2e/probe-helpers.ts': `import type { Page } from '@playwright/test';
export async function openAt(page: Page, width: number) {
  await page.setViewportSize({ width, height: 800 });
}`,
          'tests/e2e/breakpoints.ts': 'export const PHONE_WIDTH = 375;',
        },
        'tests/e2e/breakpoints',
      ),
    ).map((line) => line.replace(/tests\/e2e\//g, ''));

  it('follows a width from the breakpoint file through loops, objects, helpers and a step past an edge', () => {
    expect(
      probe(`const SIZES = [{ width: BREAKPOINTS.phone, height: 800 }, { width: PHONE_WIDTH, height: 812 }] as const;
const DESKTOP = { width: BREAKPOINTS.pageWithNavWide, height: 800 };
test('t', async ({ page }) => {
  for (const size of SIZES) await page.setViewportSize(size);
  for (const [name, { width }] of [['band', { width: BAND_WIDTHS.tablet }]] as const) {
    await page.setViewportSize({ width, height: 900 });
  }
  for (const width of [BREAKPOINTS.tablet, BREAKPOINTS.tablet + 1]) await page.setViewportSize({ width, height: 900 });
  await page.setViewportSize({ width: PAGE_HEADER.plus + PAGE_HEADER_GUTTER, height: 900 });
  await page.setViewportSize(DESKTOP);
  await page.setViewportSize({ ...DESKTOP, height: 600 });
  await openAt(page, PHONE_WIDTH);
  [BREAKPOINTS.phone].forEach((width) => page.setViewportSize({ width, height: 1 }));
  const before = page.viewportSize();
  if (before) await page.setViewportSize(before);
});
test.use({ viewport: { width: BREAKPOINTS.tablet + 1, height: 900 }, hasTouch: true });
test.use({ locale: 'en-GB' });
test.use({ viewport: { width: PURPOSE_WIDTHS.reflow, height: 640 } });
test('u', async ({ page }) => openAt(page, PURPOSE_WIDTHS.shellTabs));`),
    ).toEqual([]);
  });

  it('refuses a width written by hand, however it reaches the call', () => {
    expect(
      probe(`const DESKTOP = { width: 1280, height: 800 };
test('t', async ({ page }) => {
  await page.setViewportSize({ width: 712, height: 900 });
  for (const width of [BREAKPOINTS.phone, 1000]) await page.setViewportSize({ width, height: 900 });
  await page.setViewportSize({ width: BREAKPOINTS.phone + 72, height: 900 });
  await page.setViewportSize(DESKTOP);
  await openAt(page, 390);
  for (let width = 660; width <= 900; width += 20) await page.setViewportSize({ width, height: 800 });
});
async function scan(page, { width = 375 } = {}) {
  await page.setViewportSize({ width, height: 812 });
}
const PHONE = { width: 390, height: 844 };
test.use({ viewport: PHONE, isMobile: true });`),
    ).toEqual([
      'probe.spec.ts:6 width 712: a width written by hand',
      'probe.spec.ts:7 width 1000: a width written by hand',
      'probe.spec.ts:8 width 72: a width written by hand',
      'probe.spec.ts:9 width 1280 (written at probe.spec.ts:4): a width written by hand',
      'probe.spec.ts:11 width 660: a width written by hand',
      'probe.spec.ts:14 width 375 (written at probe.spec.ts:13): a width written by hand',
      'probe.spec.ts:17 width 390 (written at probe.spec.ts:16): a width written by hand',
      'probe-helpers.ts:3 width 390 (written at probe.spec.ts:10): a width written by hand',
    ]);
  });

  it('comes from the shared breakpoint file in every spec and helper under tests/e2e', () => {
    const files = sourceFiles({ under: 'tests/e2e/' });
    // Precondition: the listing reached the specs, and the file every width is to come from.
    expect(files).toContain('tests/e2e/shell.spec.ts');
    expect(files).toContain(BREAKPOINT_FILE);

    const tracer = new WidthTracer(
      Object.fromEntries(files.map((file) => [file, readSource(file)])),
      BREAKPOINT_MODULE,
    );
    // Precondition: the scan found the calls, so an empty list of offenders is not an empty scan.
    expect(tracer.calls().some(({ source }) => source.file === 'tests/e2e/shell.spec.ts')).toBe(
      true,
    );

    expect(offenders(tracer)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------
// The purpose widths: a width no edge gives, each kept for a purpose its comment names.

// The reasons a purpose width may give besides a shipped bug's id (`MB.<n>`), matched without case.
const PURPOSE_REASONS = ['WCAG reflow', 'text-fit band', 'screenshot size'] as const;
const BUG_ID = /\bMB\.\d+\b/;

// Reads `export const PURPOSE_WIDTHS = { … }` from the breakpoint file's source, without running it, and
// lists each entry that breaks the rule: not a named number, no comment directly above it naming a bug
// id or a reason, or a width `taken` already holds (an edge, the phone width or the desktop width).
function purposeWidths(code: string, taken: number[]) {
  const source = parseSource(BREAKPOINT_FILE, code);
  const widths: Record<string, number> = {};
  const problems: string[] = [];
  let init: Node | undefined;
  for (const statement of source.program.body as Node[]) {
    const declaration = statement.declaration as Node | undefined;
    if (statement.type !== 'ExportNamedDeclaration' || declaration?.type !== 'VariableDeclaration')
      continue;
    for (const declarator of declaration.declarations as Node[]) {
      if (nameOf(declarator.id) === 'PURPOSE_WIDTHS') init = declarator.init as Node;
    }
  }
  if (!init) return { widths, problems: ['PURPOSE_WIDTHS: not exported'] };
  while (WRAPPERS.has(init.type)) init = init.expression as Node;
  if (init.type !== 'ObjectExpression') {
    return { widths, problems: ['PURPOSE_WIDTHS: not an object of named numbers'] };
  }

  const lines = code.split('\n');
  for (const property of init.properties as Node[]) {
    const line = lineOf(source, property);
    const key =
      property.type === 'Property' && !property.computed ? nameOf(property.key) : undefined;
    let value = property.value as Node | undefined;
    while (value && WRAPPERS.has(value.type)) value = value.expression as Node;
    if (key === undefined || value?.type !== 'Literal' || typeof value.value !== 'number') {
      problems.push(`breakpoints.ts:${line} ${textOf(source, property)}: not a named number`);
      continue;
    }
    widths[key] = value.value;
    const entry = `PURPOSE_WIDTHS.${key} (${value.value})`;

    // The comment directly above: the run of `//` lines that ends on the line before the entry.
    const comment: string[] = [];
    for (let at = line - 2; at >= 0 && /^\s*\/\//.test(lines[at]); at--) comment.unshift(lines[at]);
    const text = comment.join(' ').toLowerCase();
    if (comment.length === 0) problems.push(`${entry}: no comment above it`);
    else if (
      !BUG_ID.test(comment.join(' ')) &&
      !PURPOSE_REASONS.some((reason) => text.includes(reason.toLowerCase()))
    ) {
      problems.push(`${entry}: its comment names neither a bug id nor a reason`);
    }
    if (taken.includes(value.value)) {
      problems.push(`${entry}: the same width as an edge, the phone width or the desktop width`);
    }
  }
  return { widths, problems };
}

describe('the purpose widths in the breakpoint file', () => {
  // The rule held to files of its own, so a reader that passes everything fails here.
  const TAKEN = [375, 640, 1280];
  const probe = (body: string) =>
    purposeWidths(
      `import { BREAKPOINTS } from './x';\nexport const PURPOSE_WIDTHS = {\n${body}\n} as const;`,
      TAKEN,
    );

  it('accepts a named number with a bug id or a fixed reason directly above it', () => {
    expect(
      probe(`  // MB.212: the shell's tabs overflowed at this width.
  shellTabs: 420,
  // WCAG reflow: content fits 320 CSS pixels without a sideways scroll.
  reflow: 320,
  // The tabs' text-fit band,
  // where the last label wraps.
  tabFit: 777,
  // Screenshot size of the help articles.
  helpShot: 1024,`),
    ).toEqual({
      widths: { shellTabs: 420, reflow: 320, tabFit: 777, helpShot: 1024 },
      problems: [],
    });
  });

  it('refuses an entry with no comment directly above it, or one that names no purpose', () => {
    expect(
      probe(`  shellTabs: 420,
  // A width that looked right.
  reflow: 320,
  // MB.212

  spaced: 862,`).problems,
    ).toEqual([
      'PURPOSE_WIDTHS.shellTabs (420): no comment above it',
      'PURPOSE_WIDTHS.reflow (320): its comment names neither a bug id nor a reason',
      'PURPOSE_WIDTHS.spaced (862): no comment above it',
    ]);
  });

  it('refuses an entry that is already an edge, the phone width or the desktop width', () => {
    expect(
      probe(`  // MB.212
  phone: 640,
  // WCAG reflow
  small: 375,
  // Screenshot size
  desktop: 1280,`).problems,
    ).toEqual([
      'PURPOSE_WIDTHS.phone (640): the same width as an edge, the phone width or the desktop width',
      'PURPOSE_WIDTHS.small (375): the same width as an edge, the phone width or the desktop width',
      'PURPOSE_WIDTHS.desktop (1280): the same width as an edge, the phone width or the desktop width',
    ]);
  });

  it('refuses a group the guard cannot read without running it', () => {
    expect(
      probe(`  // MB.212
  wide: BREAKPOINTS.phone + 1,
  // MB.212
  ['computed']: 420,
  ...BREAKPOINTS,`).problems,
    ).toEqual([
      'breakpoints.ts:4 wide: BREAKPOINTS.phone + 1: not a named number',
      "breakpoints.ts:6 ['computed']: 420: not a named number",
      'breakpoints.ts:7 ...BREAKPOINTS: not a named number',
    ]);
    expect(purposeWidths('export const PURPOSE_WIDTHS = makeWidths();', TAKEN).problems).toEqual([
      'PURPOSE_WIDTHS: not an object of named numbers',
    ]);
    expect(purposeWidths('export const PHONE_WIDTH = 375;', TAKEN).problems).toEqual([
      'PURPOSE_WIDTHS: not exported',
    ]);
  });

  it('gives each purpose width a named purpose, and none an edge, the phone or the desktop width already gives', async () => {
    const file = await loadBreakpoints();
    const taken = sorted([
      ...compiledStylesheets().flatMap((css) => preludes(css, MEDIA).flatMap(edgesIn)),
      ...Object.values(file.BREAKPOINTS),
      ...Object.values(file.BAND_WIDTHS),
      ...Object.values(file.PAGE_HEADER).map((edge) => edge + file.PAGE_HEADER_GUTTER),
      file.PHONE_WIDTH,
      file.DESKTOP_WIDTH,
    ]);
    // Precondition: the widths an entry may not repeat include the edges and both fixed widths.
    expect(taken).toEqual(expect.arrayContaining([375, 1280, file.BREAKPOINTS.phone]));

    const { widths, problems } = purposeWidths(readSource(BREAKPOINT_FILE), taken);
    expect(problems).toEqual([]);
    // Precondition: the group has entries, so a clean read is not an empty one.
    expect(Object.keys(widths).length).toBeGreaterThan(0);
    // The group the specs import is the one read here.
    expect(file.PURPOSE_WIDTHS).toEqual(widths);
  });
});
