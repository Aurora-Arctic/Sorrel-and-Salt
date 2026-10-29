import { seedAstrologyVocabularies } from './astrology';
import { seedCategoryVocabulary } from './categories';
import {
  assertCompendiumValid,
  seedCompendiumContent,
  type SeedCompendiumOptions,
} from './compendium';
import { loadCompendium, readConversionManifest, type LoadedCompendium } from './compendium/load';
import type { SeedCompendiumReport } from './compendium/report';
import { seedDeityVocabulary } from './deities';
import { seedFormVocabulary } from './forms';
import { beginSeedTransaction } from './idempotent';
import { seedVocabularySources } from './sources';
import type { SeedDatabase } from './types';

// The six reference seeds in migrate.yml's order in one transaction, for the hand-started seed workflow: a dry run rolls back, so run apart each would read the
// database without what the earlier seeds would write. migrate.yml still runs the six apart, each committing alone.

export interface SeedReferenceDataOptions extends Pick<
  SeedCompendiumOptions,
  'manifest' | 'dryRun' | 'force'
> {
  /** The compendium files, by default those under `compendium/`. */
  compendium?: LoadedCompendium;
}

/**
 * Checks the compendium files, then runs the six seeds in one transaction and
 * returns the compendium seed's report. A dry run rolls all six back at once;
 * `force` reaches the compendium seed only, the one seed that refuses.
 */
export async function seedReferenceData(
  db: SeedDatabase,
  {
    compendium = loadCompendium(),
    manifest = readConversionManifest(),
    dryRun = false,
    force = false,
  }: SeedReferenceDataOptions = {},
): Promise<SeedCompendiumReport> {
  assertCompendiumValid(compendium);
  return beginSeedTransaction(
    db,
    async (tx) => {
      await seedCategoryVocabulary(tx);
      await seedFormVocabulary(tx);
      await seedAstrologyVocabularies(tx);
      await seedDeityVocabulary(tx);
      await seedVocabularySources(tx);
      return seedCompendiumContent(tx, compendium, { manifest, force });
    },
    { dryRun },
  );
}
