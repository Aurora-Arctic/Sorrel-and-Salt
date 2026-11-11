import { describe, expect, it } from 'vitest';
import { filesMatching, sourceFiles } from '../support/repo-scan';

// A search parameter is read through the shared readers, so a change to trimming, to a repeated parameter or to what
// counts as on reaches every page: `single()` and `trimmed()` for a value, `flagParam` for an on/off switch.

const PARAM_TABLE = 'src/lib/search-param-table.ts';

describe('on/off search parameters', () => {
  const outsideTable = (regex: RegExp) => {
    const files = sourceFiles({ under: 'src/' });
    // Precondition: the scan holds the table and the two parameter tables that hold switches.
    expect(files).toContain(PARAM_TABLE);
    expect(files).toContain('src/components/CompendiumList/params.ts');
    expect(files).toContain('src/components/IngredientSearch/coven-params.ts');
    return filesMatching(files, regex).filter((file) => file !== PARAM_TABLE);
  };

  it('are read as `1` only by the parameter table’s flag reader', () => {
    expect(outsideTable(/single\(raw\)\s*===\s*'1'/)).toEqual([]);
  });

  it('are written as `1` only by the parameter table’s flag reader', () => {
    expect(outsideTable(/\(?on\s*\?\s*'1'\s*:\s*undefined/)).toEqual([]);
  });
});

describe('search parameters in src/app', () => {
  // `typeof query.entry === 'string'`, `Array.isArray(params.request)`, `Array.isArray(q)`: a page's own read of its
  // params. `Array.isArray` over read data, such as a list of timeouts, is not a parameter and is not matched.
  const HAND_READ =
    /typeof\s+(?:query|params|searchParams)\.\w+\s*===\s*'string'|Array\.isArray\(\s*(?:q|query|params|searchParams)\b/;

  it('are read through single() and trimmed(), never by hand', () => {
    const files = sourceFiles({ under: 'src/app/' });
    // Precondition: the scan holds the pages that read their params by hand today.
    expect(files).toContain('src/app/(public)/help/search/page.tsx');
    expect(files).toContain('src/app/(shell)/coven/[slug]/ingredients/page.tsx');

    expect(filesMatching(files, HAND_READ)).toEqual([]);
  });
});
