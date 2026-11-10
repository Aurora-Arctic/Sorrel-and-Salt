import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import * as shared from '../support/constants';
import { fromRoot } from '../support/paths';

// A value many tests share lives once in tests/support/constants.ts. A copy in a test file drifts: the origin was
// `http://localhost:3000` in thirteen files and `http://localhost:8000` in the rest, and a changed port had to be edited in each.

const HOME = 'tests/support/constants.ts';

// Each of these needs an `ORIGIN` of its own value for a reason the test states.
const OWN_ORIGIN: Record<string, string> = {
  'tests/components/IngredientEntry/back-href.test.ts':
    'the origin of a link that must be told apart from the app',
  'tests/modules/documents/graphql/document-mailing.test.ts':
    'a request origin that is not the development address',
  'tests/emails/parts/layout.test.tsx': 'the staging address the footer links to',
};

const files = inject('repoFiles').filter((file) => /^tests\/.*\.tsx?$/.test(file) && file !== HOME);
const source = (file: string) => readFileSync(fromRoot(file), 'utf8');
const declared = (name: string, text: string) =>
  new RegExp(`^\\s*(?:export )?const ${name}\\b`, 'm').test(text);

describe('values tests share', () => {
  it('declares no ORIGIN of its own outside the named exceptions', () => {
    // Precondition: the scan found the exceptions, so each is still a real file with a local declaration.
    for (const [file] of Object.entries(OWN_ORIGIN)) {
      expect(files).toContain(file);
      expect(declared('ORIGIN', source(file))).toBe(true);
    }

    const copies = files.filter(
      (file) => !(file in OWN_ORIGIN) && declared('ORIGIN', source(file)),
    );

    expect(copies).toEqual([]);
  });

  it('declares no shared value again under its own name', () => {
    expect(Object.keys(shared).sort()).toEqual([
      'MAILPIT_URL',
      'ORIGIN',
      'PASSWORD',
      'USER_ID',
      'WORKSPACE_ID',
    ]);

    const copies = files.flatMap((file) => {
      const text = source(file);
      return Object.entries(shared)
        .filter(([name, value]) => text.includes(`const ${name} = '${value}'`))
        .map(([name]) => `${file}: ${name}`);
    });

    expect(copies).toEqual([]);
  });
});
