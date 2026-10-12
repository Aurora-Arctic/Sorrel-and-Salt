import { slugify } from '../src/lib/slugify';
import type { AdminInvitationEntry } from '../src/components/AdminInvitations/types';
import type { GroupKind } from '../src/components/GroupForm/types';

// Invented rows the admin stories share, so a form's story and its list's
// story offer the same groups and the same invitations: each story file kept
// its own copy before MB.115. Every name is invented — Fixture, Mock, Stub —
// never a real plant, tradition or person (M1.25), so no seed can ever hold
// one of them.

/** Four group names per kind of group, enough for a type-ahead to narrow as it is typed into. */
export const GROUP_NAMES: Record<GroupKind, readonly string[]> = {
  category: ['Fixture Healing', 'Fixture Protection', 'Mock Divination', 'Stub Prosperity'],
  form: ['Fixture Mineral', 'Fixture Substance', 'Mock Preparation', 'Stub Plant Part'],
  tradition: ['Fixtural', 'Mockish', 'Old Testic', 'Stubbish'],
};

/** Fixed ids, the nth for the nth name of any kind, so a story renders the same every time. */
export const FIXTURE_IDS = [
  '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21',
  '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10',
  '2d7d2d4c-4f6a-4b59-9c30-1e9a3b6c4f0f',
  '3e6c3c3b-5a79-4a48-8d2f-0d8b2a5b3e1e',
] as const;

/** The names as a form's group picker takes them, each with its fixed id. */
export function asOptions(names: readonly string[]): { id: string; name: string }[] {
  return names.map((name, index) => ({ id: FIXTURE_IDS[index], name }));
}

/** The names as a list's group filter takes them, each by its slug. */
export function asSlugs(names: readonly string[]): { slug: string; name: string }[] {
  return names.map((name) => ({ slug: slugify(name), name }));
}

/** Two pending admin invitations: one with a note, one without, a day apart in expiry. */
export const INVITATIONS: AdminInvitationEntry[] = [
  {
    id: 'i1',
    email: 'ada@example.test',
    note: 'Curates the resins',
    expiresAt: new Date('2026-10-17T20:05:00Z'),
  },
  {
    id: 'i2',
    email: 'brook.fixturewort@example.test',
    note: null,
    expiresAt: new Date('2026-10-16T09:00:00Z'),
  },
];
