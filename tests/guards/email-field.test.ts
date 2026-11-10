import { readFileSync } from 'node:fs';
import { inject, describe, expect, it } from 'vitest';

// An email input is drawn by Field/email-field.tsx, so the format, the check and the browser
// attributes are written once. The invite forms also take their refusal from lib/email-failure.ts.
const SHARED = 'src/components/Field/email-field.tsx';
const INVITE_FORMS = [
  'src/components/InviteDialog/index.tsx',
  'src/components/AdminInvitations/invite-form.tsx',
];

describe('the email field is written once', () => {
  it('has no plain field that checks an address by hand', () => {
    const offenders = inject('repoFiles')
      .filter((path) => path.startsWith('src/components/') && /\.tsx$/.test(path))
      .filter((path) => path !== SHARED)
      .filter((path) => readFileSync(path, 'utf8').includes('check={emailAddressProblem}'));
    expect(offenders).toEqual([]);
  });

  it.each(INVITE_FORMS)('%s uses the shared field and keeps no validator of its own', (path) => {
    const source = readFileSync(path, 'utf8');
    expect(source).toContain('<EmailField');
    expect(source).toContain('emailFailure');
    expect(source).not.toContain('validateEmailAddress');
  });
});
