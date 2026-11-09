import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

// A component shows a failed request's message through failureMessage (src/lib/graphql-failure.ts), so
// every screen words the same refusal the same way. Reading the alert or the first issue by hand is what
// this refuses. The files below still do, because their lanes of the M17.8 fixes do not own them; the list
// only shrinks.

const HAND_READ = /readGraphqlFailure\(\w+\)\.alert|readGraphqlIssues\(\w+\)\[0\]/;
const NOT_YET_MOVED = new Set([
  'src/components/AddIcon/index.tsx',
  'src/components/AdminCards/download-csv.tsx',
  'src/components/ConfirmedAction/index.tsx',
  'src/components/DocumentEditor/editor.tsx',
  'src/components/IngredientEntry/cupboard-writes.tsx',
  'src/components/IngredientEntry/delete-entry.tsx',
  'src/components/IngredientEntry/review-mark.tsx',
  'src/components/IngredientForm/index.tsx',
  'src/components/IngredientForm/read-failure.tsx',
  'src/components/InvitationAcceptance/index.tsx',
  'src/components/ReceivedInvitations/accept-control.tsx',
  'src/components/ShownSwitch/index.tsx',
]);

describe('reading a failure message in a component', () => {
  it('goes through failureMessage, not .alert or the first issue read by hand', () => {
    const files = inject('repoFiles').filter((file) => /^src\/components\/.*\.tsx?$/.test(file));

    // Precondition: the scan reached the components, and the helper exists to be used.
    expect(files.length).toBeGreaterThan(100);
    expect(readFileSync('src/lib/graphql-failure.ts', 'utf8')).toContain(
      'export function failureMessage',
    );

    const offending = files.filter(
      (file) => HAND_READ.test(readFileSync(file, 'utf8')) && !NOT_YET_MOVED.has(file),
    );
    const stale = [...NOT_YET_MOVED].filter(
      (file) => !files.includes(file) || !HAND_READ.test(readFileSync(file, 'utf8')),
    );
    expect(offending).toEqual([]);
    expect(stale).toEqual([]);
  });
});
