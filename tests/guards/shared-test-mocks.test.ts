import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { fromRoot } from '../support/paths';

// Four stand-ins nearly every component and service test needs are written once under tests/support/ and mocked in
// by import, as `next/cache` is from tests/support/next-data-cache.ts. A copy in a test file drifts from the module
// it stands in for, and a change to that module then has to be made in every copy.

// This file is left out: its samples are copies.
const SELF = 'tests/guards/shared-test-mocks.test.ts';
const files = inject('repoFiles').filter((file) => /^tests\/.*\.tsx?$/.test(file) && file !== SELF);
const source = (file: string) => readFileSync(fromRoot(file), 'utf8');

/** The names a module exports, read from its source so a missing module reads as no names rather than a load error. */
const exportsOf = (file: string): string[] => {
  if (!existsSync(fromRoot(file))) return [];
  const text = source(file);
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

interface SharedMock {
  /** The support module every test uses instead. */
  home: string;
  /** The names `home` must export. */
  exports: string[];
  /** True of a test file that writes its own copy. */
  copies: (text: string) => boolean;
  /** A copy as tests write it today, which `copies` must catch. */
  copy: string;
  /** The shared form, which `copies` must let through. */
  shared: string;
}

const MOCKS: Record<string, SharedMock> = {
  'the next/navigation router': {
    home: 'tests/support/next-navigation.ts',
    exports: ['router', 'useRouter'],
    // Any `useRouter:` property: a factory that needs more of next/navigation spreads the shared module and adds it.
    copies: (text) => /\buseRouter\s*:/.test(text),
    copy: "vi.mock('next/navigation', () => ({ useRouter: () => router }));",
    shared:
      "vi.mock('next/navigation', async () => ({ ...(await import('../../support/next-navigation')), usePathname: () => '/' }));",
  },
  'the query-client render wrapper': {
    home: 'tests/support/render-with-query.tsx',
    exports: ['renderWithQuery'],
    copies: (text) => /<QueryClientProvider\s+client=\{\s*makeQueryClient\(\)\s*\}/.test(text),
    copy: 'render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);',
    shared: 'renderWithQuery(<NameForm />);',
  },
  'the request-session mock': {
    home: 'tests/support/request-session.ts',
    exports: exportsOf('src/lib/request-session.ts'),
    copies: inlineMock('@/lib/request-session', 'request-session'),
    copy: "vi.mock('@/lib/request-session', () => ({ getSession }));",
    shared: "vi.mock('@/lib/request-session', () => import('../../support/request-session'));",
  },
  'the mail mock': {
    home: 'tests/support/mail.ts',
    exports: exportsOf('src/lib/mail.ts'),
    copies: inlineMock('@/lib/mail', 'mail'),
    copy: "vi.mock('@/lib/mail', () => ({ send }));",
    shared: "vi.mock('@/lib/mail', () => import('../support/mail'));",
  },
};

describe('stand-ins every test shares', () => {
  describe.each(Object.entries(MOCKS))('%s', (_, mock) => {
    it('tells a copy from the shared form', () => {
      expect(mock.copies(mock.copy)).toBe(true);
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

      const copies = files.filter((file) => file !== mock.home && mock.copies(source(file)));

      expect(copies).toEqual([]);
    });
  });
});
