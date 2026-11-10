import { describe, expect, it } from 'vitest';
import { filesMatching, sourceFiles } from '../support/repo-scan';

// A coven address is built by `covenPath` and a compendium entry's by `compendiumEntryPath`, so a renamed segment or a
// change of encoding is made once; a template literal, or a string joined on, is a second builder.

const COVEN_BUILDER = 'src/lib/coven-path.ts';
const COMPENDIUM_BUILDER = 'src/lib/compendium-path.ts';

// `/coven/${…}`, `'/coven/' + …`, `${COVEN_LANDING_PATH}/…`.
const HAND_BUILT_COVEN = /`\/coven\/\$\{|['"]\/coven\/['"]\s*\+|\$\{COVEN_LANDING_PATH\}\//;
// `/compendium/ingredients/${…}`, `'/compendium/ingredients/' + …`, an origin before it included.
const HAND_BUILT_ENTRY = /\/compendium\/ingredients\/\$\{|['"]\/compendium\/ingredients\/['"]\s*\+/;

const sources = () => sourceFiles({ under: 'src/' });

describe('coven addresses', () => {
  it('are built only by the coven path builder, stories included', () => {
    const files = sources();
    // Precondition: the scan reaches the builder and the files that link into a coven most.
    expect(files).toContain(COVEN_BUILDER);
    expect(files).toContain('src/components/CovenNav/sections.ts');
    expect(files).toContain('src/components/SpellRecipe/index.stories.tsx');

    expect(filesMatching(files, HAND_BUILT_COVEN).filter((file) => file !== COVEN_BUILDER)).toEqual(
      [],
    );
  });
});

describe('compendium entry addresses', () => {
  it('are built only by the compendium path builder, the absolute ones in the sitemap and JSON-LD included', () => {
    const files = sources();
    expect(files).toContain(COMPENDIUM_BUILDER);
    expect(files).toContain('src/app/sitemap.ts');
    expect(files).toContain('src/lib/json-ld.ts');

    expect(
      filesMatching(files, HAND_BUILT_ENTRY).filter((file) => file !== COMPENDIUM_BUILDER),
    ).toEqual([]);
  });
});
