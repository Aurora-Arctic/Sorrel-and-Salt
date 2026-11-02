import { seedAstrologyVocabularies } from './astrology';
import { seedCategoryVocabulary } from './categories';
import {
  assertCompendiumValid,
  seedCompendiumContent,
  type SeedCompendiumOptions,
} from './compendium';
import { loadCompendium, readConversionManifest, type LoadedCompendium } from './compendium/load';
import type { SeedCompendiumReport } from './compendium/report';
import { seedDemoCovenSeats } from './demo-coven';
import { seedDemoCovenContent, type DemoCovenContentReport } from './demo-coven-content';
import { seedDeityVocabulary } from './deities';
import { seedFormVocabulary } from './forms';
import { beginSeedTransaction } from './idempotent';
import { seedVocabularySources } from './sources';
import type { SeedDatabase } from './types';

// The seven reference seeds in migrate.yml's order in one transaction, for the hand-started seed workflow: a dry run rolls back, so run apart each would read the
// database without what the earlier seeds would write. migrate.yml still runs the seven apart, each committing alone.

export interface SeedReferenceDataOptions extends Pick<
  SeedCompendiumOptions,
  'manifest' | 'dryRun' | 'force'
> {
  /** The compendium files, by default those under `compendium/`. */
  compendium?: LoadedCompendium;
}

/**
 * Checks the compendium files, then runs the seven seeds in one transaction and
 * returns the compendium seed's report, with the sources seed's KEPT sources first. A dry run rolls all seven back at once;
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
): Promise<SeedCompendiumReport & { demoCovenContent: DemoCovenContentReport }> {
  assertCompendiumValid(compendium);
  return beginSeedTransaction(
    db,
    async (tx) => {
      await seedCategoryVocabulary(tx);
      await seedFormVocabulary(tx);
      await seedAstrologyVocabularies(tx);
      await seedDeityVocabulary(tx);
      const sourcesKept = await seedVocabularySources(tx);
      const report = await seedCompendiumContent(tx, compendium, { manifest, force });
      report.kept.unshift(...sourcesKept.map((source) => ({ where: null, ...source })));
      await seedDemoCovenSeats(tx);
      const demoCovenContent = await seedDemoCovenContent(tx);
      return { ...report, demoCovenContent };
    },
    { dryRun },
  );
}
