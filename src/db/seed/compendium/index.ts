import { PILOT } from './pilot';
import type { SeedCompendiumShard } from '../types';

// Every shard of the production compendium, in seeding order: a substitute
// links an entry in its own shard or an earlier one, never a later one
// (claude-docs/db/compendium-seed/README.md). One line per shard.
export const COMPENDIUM: readonly SeedCompendiumShard[] = [PILOT];
