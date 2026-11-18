import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import * as supportMessages from '@/lib/support-messages';

// The server's message for one input is read with fieldMessage() in src/lib/graphql-failure.ts, so a change to the failure's
// shape reaches every form at once.

const HAND_LOOKUP = /\.field\?\.name\s*===/;

describe('a server field message in a component', () => {
  it('is read through fieldMessage, not by comparing the failure field name', () => {
    const files = inject('repoFiles').filter((file) => /^src\/components\/.*\.tsx?$/.test(file));

    // Precondition: the scan reached the components, and the helper exists to be used.
    expect(files.length).toBeGreaterThan(100);
    expect(readFileSync('src/lib/graphql-failure.ts', 'utf8')).toContain(
      'export function fieldMessage',
    );

    const offending = files.filter((file) => HAND_LOOKUP.test(readFileSync(file, 'utf8')));
    expect(offending).toEqual([]);
  });
});

// R7 in .claude/rules/components.md: a one-sentence message has no full stop. Both support forms read their empty-field
// messages from src/lib/support-messages.ts, so the rule is checked there.

const ONE_SENTENCE = /^[^.!?]*[.!?]?$/;

describe('a shared support form message', () => {
  it('ends with no full stop when it is one sentence', () => {
    const messages: [string, string][] = Object.entries(supportMessages);
    const oneSentence = messages.filter(([, text]) => ONE_SENTENCE.test(text));

    // Precondition: the module still holds the empty-field messages, and the filter kept them.
    expect(messages.map(([name]) => name)).toEqual(
      expect.arrayContaining(['ABOUT_REQUIRED', 'SUBJECT_REQUIRED', 'MESSAGE_REQUIRED']),
    );
    expect(oneSentence.length).toBeGreaterThanOrEqual(3);

    expect(oneSentence.filter(([, text]) => text.endsWith('.')).map(([name]) => name)).toEqual([]);
  });
});
