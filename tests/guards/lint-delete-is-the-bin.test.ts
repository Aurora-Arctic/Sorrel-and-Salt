import { describe, expect, it } from 'vitest';
import {
  DELETE_RULE,
  allowedProbe,
  nounTextProbe,
  quietTextProbe,
  redTextProbe,
} from '../support/lint-probes/delete-is-the-bin';
import { diagnosticsAt, expectProbeFlagged } from '../support/repo-scan';

// A Delete is the delete icon (`BinButton`, src/components/IconTip/icon-button.tsx), with its tip and its name, never
// a text button; the one red Delete is Delete Coven, a named red control (.claude/rules/components.md, "Destructive
// controls"). The rule is lint's, `sorrel/delete-is-the-bin`; the probes are linted once by the unit project's setup.

describe('a Delete is the delete icon', () => {
  it.each([
    { probe: redTextProbe, drawn: 'a red text button' },
    { probe: nounTextProbe, drawn: 'a red text button naming its noun' },
    { probe: quietTextProbe, drawn: 'a quiet text button' },
  ])('flags a Delete drawn as $drawn', ({ probe }) => {
    expectProbeFlagged(probe, DELETE_RULE);
  });

  it('leaves Delete Coven red, its confirm red and the delete icon alone', () => {
    // Precondition: the rule is live, so silence on the allowed probe is the rule passing it.
    expect(diagnosticsAt(redTextProbe, DELETE_RULE)).toHaveLength(1);

    expect(diagnosticsAt(allowedProbe, DELETE_RULE)).toEqual([]);
  });
});
