import { describe, expect, it } from 'vitest';
import { SHORT_WARNINGS, passwordStrength } from '@/components/PasswordField/strength';

// The text line is 224px wide in the narrowest card; "Very Weak. " plus a warning of this many
// characters measures at most 204px in Lexend 300 at 13px, so it never wraps.
const LONGEST_WARNING = 18;

describe('the strength warnings', () => {
  it('are short enough to leave the strength line on one row', () => {
    for (const warning of Object.values(SHORT_WARNINGS)) {
      expect(warning.length).toBeLessThanOrEqual(LONGEST_WARNING);
    }
  });

  it('replace the long ones zxcvbn would give', () => {
    const { warning } = passwordStrength('password');
    expect(warning).toBe(SHORT_WARNINGS.topTen);
  });
});
