import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { auditMarker } from '@/db/seed/compendium/audit-apply';
import { readWikiPages, runAudit } from '@/db/seed/compendium/audit-run';
import { wikiKey } from '@/db/seed/compendium/audit';
import { parseEntryFile, entryFilePath } from '@/db/seed/compendium/parse-entry';
import { fileOf, fixtureFolder, SAMPLEWORT, TESTWORT, type FixtureFolder } from './files-fixture';

// The attribution audit run over a folder of invented files (M14.11): what
// `--report` and `--apply` leave on disk. Testwort cites the fixture herbal
// under "Proofleaf", which Samplewort carries as a folk name, so the collision
// heuristic flags Testwort; Samplewort's own citations are stated and stay
// untouched.

let folder: FixtureFolder | undefined;
afterEach(() => folder?.remove());

const testwortPath = entryFilePath(TESTWORT);
const samplewortPath = entryFilePath(SAMPLEWORT);

function colliding(sections: { questions?: string; editNotes?: string } = {}): FixtureFolder {
  return fixtureFolder([
    fileOf(TESTWORT, (file) => {
      file.entry.references[0] = {
        ...file.entry.references[0]!,
        locator: 'under "Proofleaf"; p. 12',
        nameBasis: 'unaudited',
      };
      delete file.entry.folkNames;
      file.sections = sections;
    }),
    fileOf(SAMPLEWORT, (file) => {
      file.entry.folkNames = ['Proofleaf'];
    }),
  ]);
}

/** Every file's text under the folder, by path. */
const snapshotOf = (root: string, paths: readonly string[]) =>
  Object.fromEntries(paths.map((path) => [path, readFileSync(join(root, path), 'utf8')]));

describe('runAudit', () => {
  it('reports the candidates and writes nothing', () => {
    folder = colliding();
    const before = snapshotOf(folder.root, [testwortPath, samplewortPath]);
    const run = runAudit({ root: folder.root, wiki: new Map(), mode: 'report' });
    expect(run.issues).toEqual([]);
    // The precondition: there was something --apply would have written.
    expect(run.report.candidates.map((candidate) => candidate.path)).toEqual([testwortPath]);
    expect(run.changed).toEqual([]);
    expect(snapshotOf(folder.root, [testwortPath, samplewortPath])).toEqual(before);
  });

  it('sets needs-review and adds one Questions block per flagged citation, above the Edit Notes', () => {
    folder = colliding({ editNotes: 'Keep the herbal.' });
    const hashBefore = parseEntryFile(
      testwortPath,
      readFileSync(join(folder.root, testwortPath), 'utf8'),
    ).file!.hash;
    const untouched = snapshotOf(folder.root, [samplewortPath]);

    const run = runAudit({ root: folder.root, wiki: new Map(), mode: 'apply' });
    expect(run.issues).toEqual([]);
    expect(run.changed).toEqual([testwortPath]);

    const text = readFileSync(join(folder.root, testwortPath), 'utf8');
    const { file } = parseEntryFile(testwortPath, text);
    expect(file?.status).toBe('needs-review');
    const marker = auditMarker({ source: 'fixture-herbal', headedAs: 'Proofleaf' });
    expect(marker).toBe('<!-- audit:fixture-herbal:Proofleaf -->');
    expect(text.split(marker)).toHaveLength(2);
    expect(file?.sections.questions).toContain(marker);
    expect(file?.sections.questions).toContain('Fixtura exemplaris');
    expect(file?.sections.editNotes).toBe('Keep the herbal.');
    // Neither the status nor a section is hashed, so a seedUpdate mark stays good.
    expect(file?.hash).toBe(hashBefore);
    expect(snapshotOf(folder.root, [samplewortPath])).toEqual(untouched);
  });

  it('adds to a Questions section the file already has, keeping what it said', () => {
    folder = colliding({ questions: 'Is the herbal the 2001 printing?' });
    runAudit({ root: folder.root, wiki: new Map(), mode: 'apply' });
    const { file } = parseEntryFile(
      testwortPath,
      readFileSync(join(folder.root, testwortPath), 'utf8'),
    );
    expect(file?.sections.questions?.startsWith('Is the herbal the 2001 printing?')).toBe(true);
    expect(file?.sections.questions).toContain('<!-- audit:fixture-herbal:Proofleaf -->');
  });

  it('changes no file on a second --apply', () => {
    folder = colliding({ editNotes: 'Keep the herbal.' });
    const first = runAudit({ root: folder.root, wiki: new Map(), mode: 'apply' });
    expect(first.changed).toEqual([testwortPath]);
    const after = snapshotOf(folder.root, [testwortPath, samplewortPath]);
    const second = runAudit({ root: folder.root, wiki: new Map(), mode: 'apply' });
    expect(second.issues).toEqual([]);
    // The precondition: the second run still finds the candidate it would write.
    expect(second.report.candidates.map((candidate) => candidate.path)).toEqual([testwortPath]);
    expect(second.changed).toEqual([]);
    expect(snapshotOf(folder.root, [testwortPath, samplewortPath])).toEqual(after);
  });

  it('writes a candidate naming no other formal name only when asked for all', () => {
    folder = fixtureFolder([
      fileOf(TESTWORT, (file) => {
        file.entry.references[0] = {
          ...file.entry.references[0]!,
          locator: 'under "Proofleaf"; p. 12',
          nameBasis: 'unaudited',
        };
      }),
      fileOf(SAMPLEWORT),
    ]);
    const run = runAudit({ root: folder.root, wiki: new Map(), mode: 'apply' });
    expect(run.report.candidates.map((candidate) => candidate.heuristics)).toEqual([
      ['no-binomial'],
    ]);
    expect(run.changed).toEqual([]);
    const all = runAudit({
      root: folder.root,
      wiki: new Map(),
      mode: 'apply',
      includeUnnamed: true,
    });
    expect(all.changed).toEqual([testwortPath]);
  });
});

describe('readWikiPages', () => {
  it('reads each page past its header, by its title and its file name', () => {
    folder = fixtureFolder([]);
    folder.write(
      'wiki/Fixtura_testalis.wikitext',
      'TITLE: Proofleaf herb\nREVID: 1\nPERMALINK: https://example.org/1\nFETCHED: 2026-10-11\n----\n{{Speciesbox}}\n',
    );
    const pages = readWikiPages([join(folder.root, 'wiki'), join(folder.root, 'absent')]);
    expect(pages.get(wikiKey('Fixtura testalis'))).toBe('\n{{Speciesbox}}\n');
    expect(pages.get(wikiKey('Proofleaf herb'))).toBe('\n{{Speciesbox}}\n');
  });

  it('feeds the run: a taxobox naming the formal name reports the citation as stated', () => {
    folder = fixtureFolder([
      fileOf(TESTWORT, (file) => {
        file.entry.references.push({
          source: 'fixture-wikipedia-testwort',
          supports: ['canonicalName'],
          nameBasis: 'unaudited',
        });
      }),
      fileOf(SAMPLEWORT),
    ]);
    folder.write(
      'sources/fixture-wikipedia-testwort.yaml',
      'kind: entry\ntitle: Proofleaf\ncontainer: Wikipedia\nurl: https://en.wikipedia.org/w/index.php?title=Fixtura_testalis&oldid=1\naccessed: 2026-10-11\n',
    );
    writeFileSync(
      join(folder.root, 'Fixtura_testalis.wikitext'),
      'TITLE: Fixtura testalis\n----\n{{Speciesbox\n| genus = Fixtura\n| species = testalis\n}}\n',
    );
    const run = runAudit({
      root: folder.root,
      wiki: readWikiPages([folder.root]),
      mode: 'report',
    });
    expect(run.issues).toEqual([]);
    expect(run.report.stated.map((stated) => stated.source)).toEqual([
      'fixture-wikipedia-testwort',
    ]);
  });
});
