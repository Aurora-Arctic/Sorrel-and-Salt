import { describe, expect, it } from 'vitest';
import { WorkingInput } from '@/modules/grimoire/validation/working';

// The input mirrors spell_workings' and spell_working_participants' CHECKs (M13.4), so the
// database is never what a user sees refuse a working.

const MEMBER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const base = { workedOn: '2026-10-01' };

function failedPaths(input: unknown) {
  const result = WorkingInput.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => issue.path) ?? [];
}

describe('WorkingInput', () => {
  it('takes a date alone: no participants given means the service names the recorder', () => {
    const parsed = WorkingInput.parse(base);
    expect(parsed.participants).toBeUndefined();
    expect(parsed.note).toBeUndefined();
  });

  it('refuses a missing or malformed date', () => {
    expect(failedPaths({})).toContainEqual(['workedOn']);
    expect(failedPaths({ workedOn: '1 October' })).toContainEqual(['workedOn']);
  });

  it('reads a blank note as none, as the spell’s note is read', () => {
    expect(WorkingInput.parse({ ...base, note: '   ' }).note).toBeNull();
  });

  it('takes a member or a typed name per participant, in order', () => {
    const parsed = WorkingInput.parse({
      ...base,
      participants: [{ userId: MEMBER }, { name: ' Testwyn ' }],
    });
    expect(parsed.participants).toEqual([{ userId: MEMBER }, { name: 'Testwyn' }]);
  });

  it('refuses a participant that is both, neither, or a blank name', () => {
    for (const participant of [{ userId: MEMBER, name: 'Testwyn' }, {}]) {
      expect(failedPaths({ ...base, participants: [participant] })).toContainEqual([
        'participants',
        0,
      ]);
    }
    // A blank name is refused on the name, where the dialog shows it.
    expect(failedPaths({ ...base, participants: [{ name: '  ' }] })).toContainEqual([
      'participants',
      0,
      'name',
    ]);
  });

  it('refuses a member named twice and a name typed twice, case aside', () => {
    expect(
      failedPaths({ ...base, participants: [{ userId: MEMBER }, { userId: MEMBER }] }),
    ).toContainEqual(['participants', 1]);
    expect(
      failedPaths({ ...base, participants: [{ name: 'Testwyn' }, { name: 'TESTWYN' }] }),
    ).toContainEqual(['participants', 1]);
    expect(
      WorkingInput.safeParse({ ...base, participants: [{ userId: MEMBER }, { userId: OTHER }] })
        .success,
    ).toBe(true);
  });

  it('takes only private or workspace visibility', () => {
    expect(WorkingInput.parse({ ...base, visibility: 'private' }).visibility).toBe('private');
    expect(failedPaths({ ...base, visibility: 'public' })).toContainEqual(['visibility']);
  });
});
