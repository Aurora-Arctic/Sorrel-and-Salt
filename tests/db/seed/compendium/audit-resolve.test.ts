import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { wikiKey } from '@/db/seed/compendium/audit';
import {
  applyResolutions,
  resolveCitations,
  titlesToLookUp,
  type PageInfo,
} from '@/db/seed/compendium/audit-resolve';
import { runResolve } from '@/db/seed/compendium/audit-run';
import { parseEntryFile, entryFilePath } from '@/db/seed/compendium/parse-entry';
import type { RenderableEntryFile } from '@/db/seed/compendium/render-entry';
import type { NameBasis, SeedCitation, SeedCompendiumEntry } from '@/db/seed/types';
import {
  fileOf,
  fixtureFolder,
  loadedOf,
  SAMPLEWORT,
  TESTWORT,
  type FixtureFolder,
} from './files-fixture';

// Resolving by Wikipedia (M14.11): a citation headed "X" is `resolved` only
// when Wikipedia's page "X" is, or redirects to, the article the entry
// already cites as `stated` for its own formal name. Every name, page and
// redirect here is invented.

type Citation = SeedCitation<'canonicalName'>;

const WIKI_SOURCES = {
  'fixture-wikipedia-testwort': {
    kind: 'entry' as const,
    title: 'Fixtura testalis',
    container: 'Wikipedia',
    url: 'https://en.wikipedia.org/w/index.php?title=Fixtura_testalis&oldid=1',
    accessed: '2026-10-11',
  },
};

const own = (nameBasis: NameBasis = 'stated'): Citation => ({
  source: 'fixture-wikipedia-testwort',
  supports: ['canonicalName'],
  nameBasis,
});

const under = (heading: string, nameBasis: NameBasis = 'unaudited'): Citation => ({
  source: 'fixture-herbal',
  locator: `under "${heading}"; p. 3`,
  supports: ['canonicalName'],
  nameBasis,
});

function citing(
  entry: SeedCompendiumEntry,
  references: Citation[],
  folkNames?: string[],
): RenderableEntryFile {
  return fileOf(entry, (file) => {
    file.entry.references = references;
    file.entry.variants = [];
    if (folkNames !== undefined) file.entry.folkNames = folkNames;
    else delete file.entry.folkNames;
  });
}

const lookup = (pages: Record<string, PageInfo>) =>
  new Map(Object.entries(pages).map(([title, info]) => [wikiKey(title), info]));

const testwortPath = entryFilePath(TESTWORT);
const OWN_PAGE: PageInfo = { title: 'Fixtura testalis' };

const resolveWith = (files: RenderableEntryFile[], pages: Record<string, PageInfo>) =>
  resolveCitations(loadedOf(files, WIKI_SOURCES), lookup(pages));

describe('resolveCitations', () => {
  it('resolves a heading whose page redirects to the article the entry cites', () => {
    const report = resolveWith(
      [citing(TESTWORT, [own(), under('Proofleaf')]), citing(SAMPLEWORT, [])],
      {
        'Fixtura testalis': OWN_PAGE,
        Proofleaf: { title: 'Fixtura testalis' },
      },
    );
    expect(report.resolutions).toEqual([
      expect.objectContaining({
        path: testwortPath,
        source: 'fixture-herbal',
        headedAs: 'Proofleaf',
        resolvedBy: 'fixture-wikipedia-testwort',
      }),
    ]);
    expect(report.unresolved).toEqual([]);
  });

  it('leaves a heading whose page is another article, and says so', () => {
    const report = resolveWith(
      [citing(TESTWORT, [own(), under('Proofleaf')]), citing(SAMPLEWORT, [])],
      {
        'Fixtura testalis': OWN_PAGE,
        Proofleaf: { title: 'Fixtura' },
      },
    );
    expect(report.resolutions).toEqual([]);
    expect(report.unresolved).toEqual([expect.objectContaining({ reason: 'other-page' })]);
  });

  it('leaves a disambiguation page, even one that redirects to the cited title', () => {
    const report = resolveWith(
      [citing(TESTWORT, [own(), under('Proofleaf')]), citing(SAMPLEWORT, [])],
      {
        'Fixtura testalis': OWN_PAGE,
        Proofleaf: { title: 'Fixtura testalis', disambiguation: true },
      },
    );
    expect(report.resolutions).toEqual([]);
    expect(report.unresolved).toEqual([expect.objectContaining({ reason: 'disambiguation' })]);
  });

  it('leaves a heading with no page', () => {
    const report = resolveWith(
      [citing(TESTWORT, [own(), under('Proofleaf')]), citing(SAMPLEWORT, [])],
      {
        'Fixtura testalis': OWN_PAGE,
        Proofleaf: { missing: true },
      },
    );
    expect(report.unresolved).toEqual([expect.objectContaining({ reason: 'no-page' })]);
  });

  it('leaves a heading another file uses as a name, though its page would resolve', () => {
    const report = resolveWith(
      [citing(TESTWORT, [own(), under('Proofleaf')]), citing(SAMPLEWORT, [], ['Proofleaf'])],
      { 'Fixtura testalis': OWN_PAGE, Proofleaf: { title: 'Fixtura testalis' } },
    );
    expect(report.resolutions).toEqual([]);
    expect(report.unresolved).toEqual([expect.objectContaining({ reason: 'collision' })]);
  });

  it('leaves an entry that cites no Wikipedia article as stated', () => {
    const report = resolveWith(
      [citing(TESTWORT, [own('unaudited'), under('Proofleaf')]), citing(SAMPLEWORT, [])],
      {
        Proofleaf: { title: 'Fixtura testalis' },
      },
    );
    expect(report.resolutions).toEqual([]);
    expect(report.unresolved.map((item) => item.reason)).toEqual([
      'no-wikipedia-source',
      'no-wikipedia-source',
    ]);
  });

  it('never rewrites a citation already stated or resolved', () => {
    const report = resolveWith(
      [citing(TESTWORT, [own(), under('Proofleaf', 'stated')]), citing(SAMPLEWORT, [])],
      { 'Fixtura testalis': OWN_PAGE, Proofleaf: { title: 'Fixtura testalis' } },
    );
    expect(report.resolutions).toEqual([]);
    expect(report.unresolved).toEqual([]);
  });

  it('asks to look up each heading and each cited article, once', () => {
    const titles = titlesToLookUp(
      loadedOf(
        [citing(TESTWORT, [own(), under('Proofleaf'), under('Proofleaf')]), citing(SAMPLEWORT, [])],
        WIKI_SOURCES,
      ),
    );
    expect(titles.sort()).toEqual(['Fixtura testalis', 'Proofleaf']);
  });
});

describe('applyResolutions', () => {
  let folder: FixtureFolder | undefined;
  afterEach(() => folder?.remove());

  it('writes nameBasis, headedAs and resolvedBy on the matching citation only, and leaves the hash', () => {
    const files = [
      citing(TESTWORT, [own(), under('Proofleaf'), under('Other')]),
      citing(SAMPLEWORT, []),
    ];
    folder = fixtureFolder(files);
    folder.write(
      'sources/fixture-wikipedia-testwort.yaml',
      'kind: entry\ntitle: Fixtura testalis\ncontainer: Wikipedia\nurl: https://en.wikipedia.org/w/index.php?title=Fixtura_testalis&oldid=1\naccessed: 2026-10-11\n',
    );
    const before = readFileSync(join(folder.root, testwortPath), 'utf8');
    const hash = parseEntryFile(testwortPath, before).file!.hash;
    const run = runResolve({
      root: folder.root,
      lookup: lookup({
        'Fixtura testalis': OWN_PAGE,
        Proofleaf: { title: 'Fixtura testalis' },
        Other: { title: 'Fixtura' },
      }),
    });
    expect(run.issues).toEqual([]);
    expect(run.changed).toEqual([testwortPath]);
    const { file } = parseEntryFile(
      testwortPath,
      readFileSync(join(folder.root, testwortPath), 'utf8'),
    );
    const [, proofleaf, other] = file!.entry.references;
    expect(proofleaf).toMatchObject({
      nameBasis: 'resolved',
      headedAs: 'Proofleaf',
      resolvedBy: 'fixture-wikipedia-testwort',
    });
    expect(other).toMatchObject({ nameBasis: 'unaudited' });
    expect(other?.headedAs).toBeUndefined();
    expect(file!.hash).toBe(hash);
    // A second run finds nothing left to write.
    expect(
      runResolve({
        root: folder.root,
        lookup: lookup({ 'Fixtura testalis': OWN_PAGE, Proofleaf: { title: 'Fixtura testalis' } }),
      }).changed,
    ).toEqual([]);
  });

  it('refuses a file whose citation it cannot find', () => {
    const result = applyResolutions('x.md', '---\nstatus: approved\n---\n', [
      {
        path: 'x.md',
        source: 'a',
        headedAs: 'B',
        resolvedBy: 'c',
        locator: 'under "B"',
        citedOn: ['entry'],
        article: 'B',
      },
    ]);
    expect('issue' in result).toBe(true);
  });
});

describe('the entry’s own article', () => {
  it('counts a Wikipedia citation not yet stated when its fetched page’s taxobox names the formal name', () => {
    const page = '{{Speciesbox\n| genus = Fixtura\n| species = testalis\n}}';
    const files = [
      citing(TESTWORT, [own('unaudited'), under('Proofleaf')]),
      citing(SAMPLEWORT, []),
    ];
    const pages = { 'Fixtura testalis': OWN_PAGE, Proofleaf: { title: 'Fixtura testalis' } };
    const withPage = resolveCitations(
      loadedOf(files, WIKI_SOURCES),
      lookup(pages),
      new Map([[wikiKey('Fixtura testalis'), page]]),
    );
    expect(withPage.resolutions.map((r) => r.headedAs)).toEqual(['Proofleaf']);
    const without = resolveCitations(loadedOf(files, WIKI_SOURCES), lookup(pages));
    expect(without.resolutions).toEqual([]);
  });

  it('counts a mineral article that names the formal name as the entry’s own', () => {
    const entry = { ...TESTWORT, canonicalName: 'Testium' };
    const files = [citing(entry, [own('unaudited'), under('Proofleaf')]), citing(SAMPLEWORT, [])];
    const pages = { Testium: { title: 'Testium' }, Proofleaf: { title: 'Testium' } };
    const page = "{{Infobox mineral\n| name = Testium\n}}\n'''Testium''' is a [[mineral]].";
    const sources = {
      'fixture-wikipedia-testwort': {
        ...WIKI_SOURCES['fixture-wikipedia-testwort'],
        title: 'Testium',
        url: 'https://en.wikipedia.org/w/index.php?title=Testium&oldid=1',
      },
    };
    const withPage = resolveCitations(
      loadedOf(files, sources),
      lookup(pages),
      new Map([[wikiKey('Testium'), page]]),
    );
    expect(withPage.resolutions.map((r) => r.headedAs)).toEqual(['Proofleaf']);
    const group = page.replace('is a [[mineral]]', 'are a group of silicate minerals');
    const refused = resolveCitations(
      loadedOf(files, sources),
      lookup(pages),
      new Map([[wikiKey('Testium'), group]]),
    );
    expect(refused.resolutions).toEqual([]);
  });
});
