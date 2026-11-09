import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Both invite forms check and draw the address through InviteDialog/email-field.tsx, so one rule decides it.
const FORMS = [
  'src/components/InviteDialog/index.tsx',
  'src/components/AdminInvitations/invite-form.tsx',
];

describe('the invite forms share one email check', () => {
  it.each(FORMS)('%s uses the shared field and keeps no validator of its own', (path) => {
    const source = readFileSync(path, 'utf8');
    expect(source).toMatch(/InviteDialog\/email-field|\.\/email-field/);
    expect(source).not.toContain('validateEmailAddress');
  });
});
