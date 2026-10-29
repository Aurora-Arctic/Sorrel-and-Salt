import { afterEach, describe, expect, it } from 'vitest';
import {
  checkCompendium,
  checkCompendiumFiles,
  releaseBranch,
  RELEASE_BRANCHES,
} from '@/db/seed/compendium/guard';
import { loadCompendium } from '@/db/seed/compendium/load';
import { entryFilePath } from '@/db/seed/compendium/parse-entry';
import type { RenderableEntryFile } from '@/db/seed/compendium/render-entry';
import { wordsOf } from '../compendium-fixture';
import {
  fileFor,
  fileOf,
  fixtureFolder,
  SAMPLEWORT,
  TESTWORT,
  type FixtureFolder,
} from './files-fixture';

// The rules a folder of entry files must satisfy over and above the
// entries' own (guard.test.ts). The fixture folder passes
// whole; each case breaks one rule in one file and expects the one issue,
// then shows the folder passes again with the condition removed, so a rule
// that never fired would fail here. The branch is always passed: CI sets
// `GITHUB_BASE_REF`, and the status gate must not read it by accident.

const folders: FixtureFolder[] = [];
afterEach(() => {
  for (const made of folders.splice(0)) made.remove();
});

/** The fixture folder with `edit` applied to Testwort's file, and `more` written on top; its issues on `branch`. */
function issuesWith(
  edit: (testwort: RenderableEntryFile, samplewort: RenderableEntryFile) => void = () => {},
  more: (folder: FixtureFolder) => void = () => {},
  branch: string | null = 'feature/anything',
): string[] {
  const testwort = fileOf(TESTWORT);
  const samplewort = fileOf(SAMPLEWORT);
  edit(testwort, samplewort);
  const made = fixtureFolder([testwort, samplewort]);
  folders.push(made);
  more(made);
  return checkCompendiumFiles(loadCompendium(made.root), { branch });
}

const TESTWORT_PATH = entryFilePath(TESTWORT);

describe('checkCompendiumFiles', () => {
  it('passes the fixture folder whole, on a feature branch and on the release branches', () => {
    expect(issuesWith()).toEqual([]);
    for (const branch of RELEASE_BRANCHES)
      expect(issuesWith(undefined, undefined, branch)).toEqual([]);
  });

  it("carries the loader's issues", () => {
    const issues = issuesWith(undefined, (made) => made.write('ingredients/stray.md', '# Stray\n'));
    expect(issues).toEqual([expect.stringContaining('ingredients/stray.md')]);
  });

  describe('the path', () => {
    it('refuses a file in the wrong folder, naming where it belongs', () => {
      const made = fixtureFolder([fileOf(SAMPLEWORT)]);
      folders.push(made);
      made.writeEntry(fileOf(TESTWORT), 'ingredients/mineral/testwort-fixtura-testalis.md');
      expect(checkCompendiumFiles(loadCompendium(made.root), { branch: null })).toEqual([
        expect.stringContaining(`belongs at ${TESTWORT_PATH}`),
      ]);
    });

    it('refuses a file whose name is not the slug of its name and formal name', () => {
      const made = fixtureFolder([fileOf(SAMPLEWORT)]);
      folders.push(made);
      made.writeEntry(fileOf(TESTWORT), 'ingredients/botanical/testwort.md');
      expect(checkCompendiumFiles(loadCompendium(made.root), { branch: null })).toEqual([
        expect.stringContaining(`ingredients/botanical/testwort.md disagrees`),
      ]);
    });
  });

  describe('seedUpdate', () => {
    it("refuses a seedUpdate that is not the file's hash, and takes one that is", () => {
      const stale = issuesWith((testwort) => (testwort.seedUpdate = 'c'.repeat(64)));
      expect(stale).toEqual([expect.stringContaining('stale seedUpdate')]);

      const made = fixtureFolder();
      folders.push(made);
      const { hash } = fileFor(loadCompendium(made.root).files, TESTWORT);
      made.writeEntry(fileOf(TESTWORT, (file) => (file.seedUpdate = hash)));
      expect(checkCompendiumFiles(loadCompendium(made.root), { branch: null })).toEqual([]);
    });

    it('refuses overwriteEditor with no seedUpdate beside it', () => {
      expect(issuesWith((testwort) => (testwort.overwriteEditor = true))).toEqual([
        expect.stringContaining('overwriteEditor with no seedUpdate'),
      ]);
    });
  });

  describe('nameBasis', () => {
    it('refuses a citation with none on an entry that has a formal name', () => {
      const issues = issuesWith((testwort) => delete testwort.entry.references[0].nameBasis);
      expect(issues).toEqual([expect.stringContaining('with no nameBasis')]);
    });

    it("refuses one on a form's citation too", () => {
      const issues = issuesWith(
        (testwort) => delete testwort.entry.variants[0].references[0].nameBasis,
      );
      expect(issues).toEqual([expect.stringContaining(`cites "fixture-herbal" with no nameBasis`)]);
    });

    it('asks nothing of an entry with no formal name', () => {
      const nameless: RenderableEntryFile = fileOf({
        name: 'Plainwort',
        nomenclature: 'none',
        description: wordsOf(100),
        references: [{ source: 'fixture-page', supports: ['description'] }],
        variants: [{ form: 'Water', references: [{ source: 'fixture-page', supports: ['form'] }] }],
      });
      const made = fixtureFolder([fileOf(TESTWORT), fileOf(SAMPLEWORT), nameless]);
      folders.push(made);
      expect(checkCompendiumFiles(loadCompendium(made.root), { branch: null })).toEqual([]);
    });

    it('takes resolved with a heading and another registered source, and refuses each part missing', () => {
      const resolved = (edit: (citation: { headedAs?: string; resolvedBy?: string }) => void) =>
        issuesWith((testwort) => {
          const citation = testwort.entry.references[0];
          citation.nameBasis = 'resolved';
          citation.headedAs = 'Testwort';
          citation.resolvedBy = 'fixture-page';
          edit(citation);
        });
      expect(resolved(() => {})).toEqual([]);
      expect(resolved((c) => delete c.headedAs)).toEqual([expect.stringContaining('no headedAs')]);
      expect(resolved((c) => delete c.resolvedBy)).toEqual([
        expect.stringContaining('no resolvedBy'),
      ]);
      expect(resolved((c) => (c.resolvedBy = 'fixture-herbal'))).toEqual([
        expect.stringContaining('resolved by itself'),
      ]);
      expect(resolved((c) => (c.resolvedBy = 'nowhere'))).toEqual([
        expect.stringContaining('"nowhere", which no work or source file declares'),
      ]);
    });

    it('takes a shared work as the resolving source', () => {
      expect(
        issuesWith((testwort) => {
          const citation = testwort.entry.references[0];
          citation.nameBasis = 'resolved';
          citation.headedAs = 'Testwort';
          citation.resolvedBy = 'kynes-plants';
        }),
      ).toEqual([]);
    });

    it('refuses headedAs or resolvedBy on a citation that is not resolved', () => {
      expect(
        issuesWith((testwort) => (testwort.entry.references[0].headedAs = 'Testwort')),
      ).toEqual([expect.stringContaining('only a resolved citation carries')]);
    });

    it('refuses unresolved on an approved file, and takes it on a needs-review one', () => {
      const unresolved = (status: 'approved' | 'needs-review') =>
        issuesWith((testwort) => {
          testwort.status = status;
          testwort.sections.questions = 'Which Fixtura?';
          testwort.entry.references[0].nameBasis = 'unresolved';
        });
      expect(unresolved('approved')).toEqual([
        expect.stringContaining('as unresolved, which an approved file may not'),
      ]);
      expect(unresolved('needs-review')).toEqual([]);
    });
  });

  describe('the legacy list', () => {
    const unaudited = (listed: boolean) =>
      issuesWith(
        (testwort) => (testwort.entry.references[0].nameBasis = 'unaudited'),
        (made) => {
          if (listed) made.write('unaudited.txt', `${TESTWORT_PATH}\n`);
        },
      );

    it('refuses an unaudited citation in a file the list does not name, and takes one it does', () => {
      expect(unaudited(false)).toEqual([
        expect.stringContaining('unaudited.txt does not list the file'),
      ]);
      expect(unaudited(true)).toEqual([]);
    });

    it('refuses a listed file that carries no unaudited citation as a stale line', () => {
      const issues = issuesWith(undefined, (made) =>
        made.write('unaudited.txt', `${TESTWORT_PATH}\n`),
      );
      expect(issues).toEqual([
        expect.stringContaining(
          `unaudited.txt lists ${TESTWORT_PATH}, which carries no unaudited citation`,
        ),
      ]);
    });
  });

  describe('the sections', () => {
    it('requires a needs-review file to ask something', () => {
      const silent = issuesWith((testwort) => (testwort.status = 'needs-review'));
      expect(silent).toEqual([
        expect.stringContaining('needs-review with no "Questions for the Curator"'),
      ]);
      const asking = issuesWith((testwort) => {
        testwort.status = 'needs-review';
        testwort.sections.questions = 'Is the oil the whole plant?';
      });
      expect(asking).toEqual([]);
    });
  });

  describe('the status gate', () => {
    it('fails a draft on staging and on main, and passes it on a feature branch or locally', () => {
      const draft = (branch: string | null) =>
        issuesWith((testwort) => (testwort.status = 'draft'), undefined, branch);
      expect(draft('staging')).toEqual([
        expect.stringContaining('is a draft, which staging does not take'),
      ]);
      expect(draft('main')).toEqual([
        expect.stringContaining('is a draft, which main does not take'),
      ]);
      expect(draft('feature/seeding')).toEqual([]);
      expect(draft(null)).toEqual([]);
    });

    it('takes a needs-review file on every branch', () => {
      for (const branch of ['staging', 'main', 'feature/seeding', null]) {
        expect(
          issuesWith(
            (testwort) => {
              testwort.status = 'needs-review';
              testwort.sections.questions = 'Which?';
            },
            undefined,
            branch,
          ),
        ).toEqual([]);
      }
    });

    it('holds an approved file to every content rule, and a needs-review file to none of them', () => {
      const short = (status: 'approved' | 'needs-review') =>
        issuesWith((testwort) => {
          testwort.status = status;
          testwort.sections.questions = 'Is it long enough?';
          testwort.entry.description = wordsOf(10);
        });
      expect(short('approved')).toEqual([
        expect.stringContaining(`${TESTWORT_PATH}'s description is 10 words`),
      ]);
      expect(short('needs-review')).toEqual([]);
    });

    it('still holds a needs-review file to its identity, slug and path', () => {
      const twin = fileOf(TESTWORT, (file) => {
        file.status = 'needs-review';
        file.sections.questions = 'Twin?';
        file.entry.name = 'Testwort Twin';
      });
      const made = fixtureFolder([fileOf(TESTWORT), fileOf(SAMPLEWORT), twin]);
      folders.push(made);
      const issues = checkCompendiumFiles(loadCompendium(made.root), { branch: null });
      expect(issues).toEqual([expect.stringContaining('shares its identity "fixtura testalis"')]);
    });
  });

  describe('substitutes', () => {
    it('resolve against the files in any order: Samplewort links Testwort, which sorts after it', () => {
      const made = fixtureFolder();
      folders.push(made);
      const loaded = loadCompendium(made.root);
      expect(loaded.files[0].entry.name).toBe('Samplewort');
      expect(checkCompendiumFiles(loaded, { branch: null })).toEqual([]);
    });

    it('refuse an identity no file carries', () => {
      const issues = issuesWith(
        (_, samplewort) => (samplewort.entry.substitutes = [{ identity: 'fixtura absentis' }]),
      );
      expect(issues).toEqual([
        expect.stringContaining('"fixtura absentis" is no identity an entry carries'),
      ]);
    });

    it('refuse a typed name where a file carries that identity', () => {
      const issues = issuesWith(
        (_, samplewort) => (samplewort.entry.substitutes = [{ name: 'Fixtura testalis' }]),
      );
      expect(issues).toEqual([
        expect.stringContaining('typed as a name, but an entry has that identity'),
      ]);
    });
  });

  it('names an entry by its path, so two files sharing a label are told apart', () => {
    const issues = issuesWith((testwort) => (testwort.entry.description = wordsOf(10)));
    expect(issues[0].startsWith(`${TESTWORT_PATH}'s description`)).toBe(true);
    // The literals' guard keeps naming an entry by its shard and label.
    const made = fixtureFolder();
    folders.push(made);
    const loaded = loadCompendium(made.root);
    loaded.shards[0].entries[1].description = wordsOf(10);
    expect(checkCompendium(loaded.shards)[0].startsWith('compendium: Testwort')).toBe(true);
  });
});

describe('releaseBranch', () => {
  it('reads the base branch of a pull request first, then the pushed branch, else nothing', () => {
    expect(releaseBranch({ GITHUB_BASE_REF: 'staging', GITHUB_REF: 'refs/heads/feature/x' })).toBe(
      'staging',
    );
    expect(releaseBranch({ GITHUB_BASE_REF: '', GITHUB_REF: 'refs/heads/main' })).toBe('main');
    expect(releaseBranch({ GITHUB_REF: 'refs/pull/12/merge' })).toBeNull();
    expect(releaseBranch({})).toBeNull();
  });
});
