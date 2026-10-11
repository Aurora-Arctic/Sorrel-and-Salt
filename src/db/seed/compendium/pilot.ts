import type { SeedCompendiumShard } from '../types';

// MB.242's pilot: fourteen entries of the candidate list, one of each kind,
// researched to the full rule so the shape, the guard and the CI path are
// proven on real data before the six content lanes (MB.243–MB.248) depend on
// them. Every value traces to a source a citation names; the sources and
// what was left out are recorded in claude-docs/db/compendium-seed/pilot.md.
export const PILOT: SeedCompendiumShard = {
  name: 'pilot',
  sources: {},
  entries: [],
};
