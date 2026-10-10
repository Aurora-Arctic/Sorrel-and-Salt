import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// M8.7: every admin write to what the compendium cache holds expires the
// `compendium` tag, or the cache answers the admin's outdated values for an
// hour. The sweep's guard: in the two modules that own compendium-tier data —
// `ingredients` (its entries and references, a null `workspaceId`) and
// `vocabulary` (categories, forms, planets and signs, deities, and the groups
// and traditions that order them) — every exported service gated by
// `assertSiteAdmin` calls `expireCompendium`. Keyed on those modules rather
// than on every admin mutation: the identity module's admin writes (a user's
// role, a pause, an admin invitation) touch nothing the cache holds, and a
// list of exemptions there would be one each of them had to join
// (claude-docs/db/compendium-cache.md, "Expiring the tag").

const MODULES = ['ingredients', 'vocabulary'];

/**
 * Each exported service: its name and its text to its closing brace, the
 * first `}` at the start of a line, where Prettier puts a top-level one.
 */
function exportedServices(file: string): { name: string; body: string }[] {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(/^export (?:async )?function (\w+)/gm)].map((match) => {
    const end = text.indexOf('\n}', match.index);
    return { name: match[1], body: text.slice(match.index, end) };
  });
}

const services = MODULES.flatMap((module) => {
  const directory = join(REPO_ROOT, 'src/modules', module, 'services');
  return readdirSync(directory)
    .filter((name) => name.endsWith('.ts'))
    .flatMap((name) =>
      exportedServices(join(directory, name)).map((service) => ({
        ...service,
        file: `src/modules/${module}/services/${name}`,
      })),
    );
});

const adminWrites = services.filter((service) => service.body.includes('assertSiteAdmin('));

describe('M8.7: every compendium-tier admin write expires the compendium tag', () => {
  // The precondition: the scan reaches every vocabulary's writes and the
  // compendium's, so an empty or half list cannot pass the assertion below.
  it('finds the admin writes it guards', () => {
    expect(adminWrites.map((service) => service.name)).toEqual(
      expect.arrayContaining([
        'createCompendiumEntry',
        'updateCompendiumEntry',
        'deleteCompendiumEntry',
        'createReference',
        'updateReference',
        'createCategory',
        'deleteCategoryGroup',
        'updateIngredientFormValue',
        'deleteIngredientFormGroup',
        'createAstrologyValue',
        'updateDeity',
        'deleteDeityTradition',
      ]),
    );
    expect(adminWrites.length).toBeGreaterThanOrEqual(26);
  });

  it.each(adminWrites.map((service) => [`${service.file} ${service.name}`, service.body]))(
    '%s calls expireCompendium',
    (_, body) => {
      expect(body).toMatch(/\bexpireCompendium\(\)/);
    },
  );
});
