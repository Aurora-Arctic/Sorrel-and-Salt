import { describe, expect, it } from 'vitest';
import { FIXTURE_WORKSPACES } from '@/db/seed/standard';
import { slugify } from '@/lib/slugify';
import { A, B, C } from '../as-user';
import { makeWorkspace, workspaceColumns } from './workspace';

// Derived here the way the seed derives them, rather than written down — a
// workspace name copied into this file would be the second spelling the slug
// rule forbids.
const SEEDED_SLUGS = new Set(FIXTURE_WORKSPACES.map((workspace) => slugify(workspace.name)));

// M1.25 — a coven, with the membership that makes it worth having one.
//
// The slug is the part worth testing. CLAUDE.md's slug rule says a slug is
// derived from the name and never written down beside it, and a fixture is
// exactly where a second spelling would get written down: a test that names a
// workspace and hand-writes its slug is one typo away from asserting against
// a /coven/<slug> that does not resolve.

describe('makeWorkspace', () => {
  it('builds a whole workspace with no arguments', () => {
    const workspace = makeWorkspace();

    expect(workspace.name).toBe('Fixture Coven');
    expect(workspace.slug).toBe('fixture-coven');
  });

  // M1.27 bakes the `standard` scenario — W and X — into the template every db
  // worker clones, and `workspaces_slug_unique` reserves their slugs. A default
  // that was one of them would be a fixture no test could insert; W is where a
  // fixture *spell* lands, by reference, which is a different thing.
  it('is not a workspace the standard seed already carries', () => {
    expect(SEEDED_SLUGS.size).toBe(2);
    expect(SEEDED_SLUGS.has(makeWorkspace().slug)).toBe(false);
  });

  it('opens with an owner, because a coven with no owner cannot be administered', () => {
    expect(makeWorkspace().members).toEqual([{ userId: A.id, role: 'owner' }]);
  });

  it('re-derives the slug from a name the override gives', () => {
    const workspace = makeWorkspace({ name: 'Fixture Coven Two' });

    expect(workspace.slug).toBe('fixture-coven-two');
    expect(workspace.slug).toBe(slugify('Fixture Coven Two'));
  });

  // Through the one shared implementation, so a fixture and M3.3's mutation
  // cannot disagree about what a name slugs to. `&` is the case that tells
  // the two apart: the package expands it to "and" (CLAUDE.md's slug rule),
  // and any second implementation would almost certainly drop it instead.
  it('slugs through src/lib/slugify, ampersand and all', () => {
    expect(makeWorkspace({ name: 'Sorrel & Salt' }).slug).toBe('sorrel-and-salt');
  });

  // `whitethorn-coven` is W's slug: the collision a test would actually want
  // to write, once M1.27 has W in every clone.
  it('leaves a slug the override names, so a test can write a colliding one', () => {
    expect(makeWorkspace({ name: 'Fixture Coven Two', slug: 'whitethorn-coven' }).slug).toBe(
      'whitethorn-coven',
    );
  });

  it('takes the membership the override names, in place of the default owner', () => {
    const members = [
      { userId: A.id, role: 'owner' as const },
      { userId: B.id, role: 'member' as const },
      { userId: C.id, role: 'viewer' as const },
    ];

    expect(makeWorkspace({ members }).members).toEqual(members);
  });

  it('gives each fixture its own member list', () => {
    const first = makeWorkspace();
    const second = makeWorkspace();

    first.members.push({ userId: B.id, role: 'member' });

    expect(second.members).toHaveLength(1);
  });
});

describe('workspaceColumns', () => {
  it('names each field the way the database spells it, and leaves the members out', () => {
    const columns = workspaceColumns(makeWorkspace());

    expect(columns).toEqual({ name: 'Fixture Coven', slug: 'fixture-coven' });
  });
});
