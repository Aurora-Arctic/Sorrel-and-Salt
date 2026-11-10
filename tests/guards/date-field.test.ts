import { readFileSync } from 'node:fs';
import { inject, describe, expect, it } from 'vitest';

// A day picker is drawn with its label, hint and error by Field/plain-date-field.tsx, so a fix to how
// a date field shows its error reaches every form.
const SHARED = 'src/components/Field/plain-date-field.tsx';

describe('the date field is wired once', () => {
  it('has no form that draws a bare DateField', () => {
    const offenders = inject('repoFiles')
      .filter((path) => path.startsWith('src/components/') && /\.tsx$/.test(path))
      .filter((path) => !path.endsWith('.stories.tsx') && path !== SHARED)
      .filter((path) => /<DateField[\s/>]/.test(readFileSync(path, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
