import { PILOT } from './pilot';
import { RESINS_WOODS_AND_OTHER } from './resins-woods-and-other';
import { PLANTS_L_Q } from './plants-l-q';
import { PLANTS_CO_K } from './plants-co-k';
import { PLANTS_R_Z } from './plants-r-z';
import { STONES_AND_METALS } from './stones-and-metals';
import { PLANTS_A_CN } from './plants-a-cn';
import type { SeedCompendiumShard } from '../types';

// Every shard of the production compendium, in seeding order: a substitute
// links an entry in its own shard or an earlier one, never a later one
// (claude-docs/db/compendium-seed/README.md). One line per shard.
export const COMPENDIUM: readonly SeedCompendiumShard[] = [
  PILOT,
  RESINS_WOODS_AND_OTHER,
  PLANTS_L_Q,
  PLANTS_CO_K,
  PLANTS_R_Z,
  STONES_AND_METALS,
  PLANTS_A_CN,
];
