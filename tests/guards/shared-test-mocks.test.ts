import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';
import { readSource, sourceFiles } from '../support/repo-scan';

// Four stand-ins nearly every component and service test needs are written once under tests/support/ and mocked in
// by import, as `next/cache` is from tests/support/next-data-cache.ts. A copy in a test file drifts from the module
// it stands in for, and a change to that module then has to be made in every copy.

// This file is left out: its samples are copies.
const SELF = 'tests/guards/shared-test-mocks.test.ts';
const files = sourceFiles({ under: 'tests/' }).filter((file) => file !== SELF);

/** The names a module exports, read from its source so a missing module reads as no names rather than a load error. */
const exportsOf = (file: string): string[] => {
  if (!existsSync(fromRoot(file))) return [];
  const text = readSource(file);
  const declared = [
    ...text.matchAll(/^export\s+(?:async\s+)?(?:const|let|function)\s+(\w+)/gm),
  ].map(([, name]) => name!);
  const listed = [...text.matchAll(/^export\s*\{([^}]*)\}/gm)].flatMap(([, names]) =>
    names!.split(',').map((name) =>
      name
        .trim()
        .split(/\s+as\s+/)
        .pop()!,
    ),
  );
  return [...declared, ...listed].filter(Boolean).sort();
};

/** A `vi.mock` of `module` whose factory is anything but `() => import('…/support/<home>')`. */
const inlineMock = (module: string, home: string) => (text: string) => {
  const quoted = module.replace(/[/.@-]/g, (c) => `\\${c}`);
  const mocks = text.match(new RegExp(`vi\\.(?:do)?[mM]ock\\(\\s*['"]${quoted}['"]`, 'g')) ?? [];
  const shared =
    text.match(
      new RegExp(
        `vi\\.(?:do)?[mM]ock\\(\\s*['"]${quoted}['"]\\s*,\\s*\\(\\)\\s*=>\\s*import\\(\\s*['"][./]*support/${home}['"]\\s*\\)\\s*\\)`,
        'g',
      ),
    ) ?? [];
  return mocks.length > shared.length;
};

/** The text of each `vi.mock(module, …)` call, to its closing parenthesis. */
const mockCalls = (text: string, module: string): string[] => {
  const calls: string[] = [];
  for (const start of text.matchAll(
    new RegExp(`vi\\.(?:do)?[mM]ock\\(\\s*['"]${module}['"]`, 'g'),
  )) {
    let depth = 0;
    for (let i = start.index + start[0].indexOf('('); i < text.length; i++) {
      if (text[i] === '(') depth++;
      else if (text[i] === ')' && --depth === 0) {
        calls.push(text.slice(start.index, i + 1));
        break;
      }
    }
  }
  return calls;
};

// A router of the test's own: a `useRouter` property or method, a local `useRouter` declared, or any `useRouter` a
// next/navigation factory names (a shorthand `{ useRouter }` included).
const ownRouter = (text: string): boolean =>
  /\buseRouter\s*:/.test(text) ||
  /\buseRouter\s*\([^)]*\)\s*\{/.test(text) ||
  /\b(?:const|let|var)\s+useRouter\b/.test(text) ||
  mockCalls(text, 'next/navigation').some((call) => /\buseRouter\b/.test(call));

interface SharedMock {
  /** The support module every test uses instead. */
  home: string;
  /** The names `home` must export. */
  exports: string[];
  /** True of a test file that writes its own copy. */
  copies: (text: string) => boolean;
  /** Copies in each shape tests write them, which `copies` must catch. */
  copy: string[];
  /** The shared form, which `copies` must let through. */
  shared: string;
}

const MOCKS: Record<string, SharedMock> = {
  'the next/navigation router': {
    home: 'tests/support/next-navigation.ts',
    exports: ['router', 'useRouter'],
    // A factory that needs more of next/navigation spreads the shared module and adds the rest.
    copies: ownRouter,
    copy: [
      "vi.mock('next/navigation', () => ({ useRouter: () => router }));",
      "const useRouter = () => router;\nvi.mock('next/navigation', () => ({ useRouter }));",
      "vi.mock('next/navigation', () => ({ useRouter, usePathname: () => '/' }));",
      "vi.mock('next/navigation', () => ({\n  useRouter() {\n    return router;\n  },\n}));",
    ],
    shared:
      "vi.mock('next/navigation', async () => ({ ...(await import('../../support/next-navigation')), usePathname: () => '/' }));",
  },
  'the query-client render wrapper': {
    home: 'tests/support/render-with-query.tsx',
    exports: ['renderWithQuery', 'queryWrapper'],
    // Any provider at all, a named client's included: the shared module keeps one client across `rerender`.
    copies: (text) => /<QueryClientProvider\b|createElement\(\s*QueryClientProvider\b/.test(text),
    copy: [
      'render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);',
      'const client = makeQueryClient();\nrender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);',
      'renderHook(() => useThing(), { wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children) });',
    ],
    shared: 'renderWithQuery(<NameForm />);',
  },
  'the request-session mock': {
    home: 'tests/support/request-session.ts',
    exports: exportsOf('src/lib/request-session.ts'),
    copies: inlineMock('@/lib/request-session', 'request-session'),
    copy: ["vi.mock('@/lib/request-session', () => ({ getSession }));"],
    shared: "vi.mock('@/lib/request-session', () => import('../../support/request-session'));",
  },
  'the mail mock': {
    home: 'tests/support/mail.ts',
    exports: exportsOf('src/lib/mail.ts'),
    copies: inlineMock('@/lib/mail', 'mail'),
    copy: ["vi.mock('@/lib/mail', () => ({ send }));"],
    shared: "vi.mock('@/lib/mail', () => import('../support/mail'));",
  },
};

describe('stand-ins every test shares', () => {
  describe.each(Object.entries(MOCKS))('%s', (_, mock) => {
    it('tells a copy from the shared form', () => {
      for (const copy of mock.copy) expect(mock.copies(copy), copy).toBe(true);
      expect(mock.copies(mock.shared)).toBe(false);
    });

    it('is exported, every name of it, from its support module', () => {
      // Precondition: the names were read, so an empty list is not "nothing to export".
      expect(mock.exports.length).toBeGreaterThan(0);
      expect(exportsOf(mock.home)).toEqual(expect.arrayContaining(mock.exports));
    });

    it('is written in no test file but its support module', () => {
      // Precondition: the scan reached the test files, so an empty list is not a scan of nothing.
      expect(files.length).toBeGreaterThan(100);

      const copies = files.filter((file) => file !== mock.home && mock.copies(readSource(file)));

      expect(copies).toEqual([]);
    });
  });
});
