import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';
import type { ArrowFunctionExpression, FunctionExpression, Node } from '@babel/types';
import { describe, expect, inject, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// Since M11.18 a spec file's tests spread across the workers, each with its own
// database, so a test that reads what an earlier test wrote passes only when
// both land on the same worker: an intermittent red, the worst kind. The one
// shape every chained file here had was a variable declared outside the test
// and assigned inside it, so this guard fails that shape wherever the file,
// or the `describe` block around the test, is not serial. Assigning in a hook
// (`beforeAll`, `beforeEach`) stays legal: a hook runs on every worker that
// comes to the file. The rule, and when serial is still the choice:
// claude-docs/testing/e2e.md, "E2E" (the paragraph on `fullyParallel`).
// Parsed with `@babel/parser`, which reads TypeScript as written; the
// installed `typescript` is the native compiler and has no parser API.

const SPEC = /^tests\/e2e\/.*\.spec\.ts$/;
const TEST_CALL = /^test(\.(only|skip|fixme|fail))?$/;
const DESCRIBE_CALL = /^test\.describe(\.(only|skip|fixme|serial|parallel))?(\.(only|skip))?$/;

interface Finding {
  file: string;
  line: number;
  name: string;
}

/** `test.describe.configure` → 'test.describe.configure'; anything else dotted on identifiers → its name, or null. */
function calleeName(node: Node): string | null {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    const object = calleeName(node.object);
    return object && `${object}.${node.property.name}`;
  }
  return null;
}

/** Every node directly under this one, in source order. */
function children(node: Node): Node[] {
  const out: Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item && typeof item === 'object' && typeof item.type === 'string') out.push(item as Node);
    }
  }
  return out;
}

function* walk(node: Node): Generator<Node> {
  yield node;
  for (const child of children(node)) yield* walk(child);
}

/** The identifiers a binding pattern declares: `x`, `{ a, b: c }`, `[d, ...e]`, `f = 1`. */
function patternNames(node: Node): string[] {
  switch (node.type) {
    case 'Identifier':
      return [node.name];
    case 'ObjectPattern':
      return node.properties.flatMap((p) =>
        p.type === 'RestElement' ? patternNames(p.argument) : patternNames(p.value),
      );
    case 'ArrayPattern':
      return node.elements.flatMap((e) => (e ? patternNames(e) : []));
    case 'RestElement':
      return patternNames(node.argument);
    case 'AssignmentPattern':
      return patternNames(node.left);
    default:
      return [];
  }
}

/** The variables an assignment writes, by their root: `users.member.id = …` writes `users`. */
function assignedRoots(node: Node): string[] {
  switch (node.type) {
    case 'Identifier':
      return [node.name];
    case 'MemberExpression':
      return assignedRoots(node.object);
    case 'TSNonNullExpression':
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'ParenthesizedExpression':
      return assignedRoots(node.expression);
    case 'ObjectPattern':
    case 'ArrayPattern':
      return patternNames(node);
    default:
      return [];
  }
}

/** Does this statement list hold `test.describe.configure({ mode: 'serial' })`? */
function declaresSerial(statements: Node[]): boolean {
  return statements.some((statement) => {
    if (statement.type !== 'ExpressionStatement') return false;
    const call = statement.expression;
    if (call.type !== 'CallExpression' || calleeName(call.callee) !== 'test.describe.configure')
      return false;
    const [options] = call.arguments;
    return (
      options?.type === 'ObjectExpression' &&
      options.properties.some(
        (p) =>
          p.type === 'ObjectProperty' &&
          p.key.type === 'Identifier' &&
          p.key.name === 'mode' &&
          p.value.type === 'StringLiteral' &&
          p.value.value === 'serial',
      )
    );
  });
}

function lastFunction(
  call: Node & { type: 'CallExpression' },
): ArrowFunctionExpression | FunctionExpression | undefined {
  const last = call.arguments[call.arguments.length - 1];
  return last?.type === 'ArrowFunctionExpression' || last?.type === 'FunctionExpression'
    ? last
    : undefined;
}

/**
 * Every assignment in the spec that writes a variable declared outside its
 * test, with the serial scopes around it skipped — or, with `ignoreSerial`,
 * every such assignment regardless, which is how the guard proves it can see
 * the chained files it allows.
 */
export function chainedAssignments(file: string, { ignoreSerial = false } = {}): Finding[] {
  const source = readFileSync(`${REPO_ROOT}/${file}`, 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] });
  const findings: Finding[] = [];

  // Only a name the file declares can chain two tests: a browser global such
  // as `document`, written inside `page.evaluate`, is declared nowhere here.
  const declared = new Set<string>();
  for (const node of walk(ast.program)) {
    if (node.type === 'VariableDeclarator') patternNames(node.id).forEach((n) => declared.add(n));
    if (node.type === 'FunctionDeclaration' && node.id) declared.add(node.id.name);
    if (
      node.type === 'ImportSpecifier' ||
      node.type === 'ImportDefaultSpecifier' ||
      node.type === 'ImportNamespaceSpecifier'
    )
      declared.add(node.local.name);
  }

  const checkTest = (fn: ArrowFunctionExpression | FunctionExpression, serial: boolean) => {
    if (serial && !ignoreSerial) return;
    const locals = new Set<string>();
    if ('params' in fn)
      for (const param of fn.params) patternNames(param).forEach((n) => locals.add(n));
    for (const node of walk(fn)) {
      if (node.type === 'VariableDeclarator') patternNames(node.id).forEach((n) => locals.add(n));
      if (node.type === 'FunctionDeclaration' && node.id) locals.add(node.id.name);
    }
    for (const node of walk(fn)) {
      const target =
        node.type === 'AssignmentExpression'
          ? node.left
          : node.type === 'UpdateExpression'
            ? node.argument
            : null;
      if (!target) continue;
      for (const name of assignedRoots(target)) {
        if (!locals.has(name) && declared.has(name))
          findings.push({ file, line: node.loc?.start.line ?? 0, name });
      }
    }
  };

  const visit = (node: Node, serial: boolean) => {
    if (node.type === 'CallExpression') {
      const name = calleeName(node.callee);
      const fn = name && lastFunction(node);
      if (fn && name && DESCRIBE_CALL.test(name)) {
        const body = fn.body.type === 'BlockStatement' ? fn.body.body : [];
        return visitStatements(body, serial || name.includes('.serial'));
      }
      if (fn && name && TEST_CALL.test(name)) return checkTest(fn, serial);
    }
    for (const child of children(node)) visit(child, serial);
  };

  const visitStatements = (statements: Node[], serial: boolean) => {
    const serialHere = serial || declaresSerial(statements);
    for (const statement of statements) visit(statement, serialHere);
  };

  visitStatements(ast.program.body, false);
  return findings;
}

const label = ({ file, line, name }: Finding) => `${file}:${line} ${name}`;

describe('M11.18: a spec file whose tests chain is serial', () => {
  it('finds no test outside a serial scope that assigns a variable declared outside it', () => {
    const specs = inject('repoFiles').filter((file) => SPEC.test(file));

    // Preconditions: the scan covers the suite, and the detector sees both the
    // shape it forbids and the one it allows — otherwise an empty result is
    // true of nothing. 01-invitations chains on `invitedPath` and is serial
    // whole; 01-accounts chains on `holder` inside a serial block alone; and
    // shell.spec.ts assigns `users` in `beforeAll`, which is no chain.
    expect(specs.length).toBeGreaterThan(15);
    const chained = (file: string) =>
      chainedAssignments(file, { ignoreSerial: true }).map((f) => f.name);
    expect(chained('tests/e2e/stories/01-invitations.spec.ts')).toContain('invitedPath');
    expect(chained('tests/e2e/stories/01-accounts.spec.ts')).toContain('holder');
    expect(chained('tests/e2e/shell.spec.ts')).toEqual([]);
    // axe.spec.ts writes `document.title` inside `page.evaluate`: a browser global, no chain.
    expect(chained('tests/e2e/axe.spec.ts')).toEqual([]);
    expect(chainedAssignments('tests/e2e/stories/01-invitations.spec.ts')).toEqual([]);
    expect(chainedAssignments('tests/e2e/stories/01-accounts.spec.ts')).toEqual([]);

    expect(specs.flatMap((file) => chainedAssignments(file).map(label))).toEqual([]);
  });
});
