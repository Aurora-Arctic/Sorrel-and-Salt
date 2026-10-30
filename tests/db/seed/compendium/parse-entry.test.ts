import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { entryFilePath, parseEntryFile } from '@/db/seed/compendium/parse-entry';
import { renderEntryFile } from '@/db/seed/compendium/render-entry';
import { wordsOf } from '../compendium-fixture';
import { fileOf, TESTWORT } from './files-fixture';

// One entry file to the entry the seed writes. The fixture file is
// rendered from the invented Testwort and read back; every other case is a
// hand-written file breaking one rule, so the issue found is the one written.

const PATH = entryFilePath(TESTWORT);

/** The rendered fixture file with its frontmatter's top-level keys in reverse order. */
function withReversedKeys(text: string): string {
  const [, frontmatter, body] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text) as RegExpExecArray;
  const reversed = Object.fromEntries(Object.entries(parse(frontmatter)).reverse());
  return `---\n${stringify(reversed, { lineWidth: 0 })}---\n${body}`;
}

/** A `none` entry's file from hand-written frontmatter lines, sourced, with one form. */
function plainwort(frontmatter: string, body = `# Plainwort\n\n${wordsOf(100)}\n`): string {
  return `---\nstatus: approved\nnomenclature: none\n${frontmatter}\nvariants:\n  - form: Water\n    references:\n      - source: fixture-page\n        supports: [form]\n---\n\n${body}`;
}

const SOURCED = 'references:\n  - source: fixture-page\n    supports: [description]';

describe('parseEntryFile', () => {
  it('reads the rendered fixture back as the entry it was rendered from', () => {
    const text = renderEntryFile(fileOf(TESTWORT, (file) => (file.sections.editNotes = 'A note.')));
    const parsed = parseEntryFile(PATH, text);
    expect(parsed.issues).toEqual([]);
    expect(parsed.file?.entry).toEqual(TESTWORT);
    expect(parsed.file?.status).toBe('approved');
    expect(parsed.file?.path).toBe(PATH);
    expect(parsed.file?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(parsed.file?.sections).toEqual({ editNotes: 'A note.' });
    expect(parsed.file?.seedUpdate).toBeUndefined();
  });

  it('reads the frontmatter whatever its key order, to the same entry and hash', () => {
    const text = renderEntryFile(fileOf(TESTWORT));
    const straight = parseEntryFile(PATH, text);
    const reversed = parseEntryFile(PATH, withReversedKeys(text));
    expect(reversed.issues).toEqual([]);
    expect(reversed.file?.entry).toEqual(straight.file?.entry);
    expect(reversed.file?.hash).toBe(straight.file?.hash);
  });

  it('reads seedUpdate and overwriteEditor off the file, and never into the entry', () => {
    const hash = 'a'.repeat(64);
    const text = renderEntryFile(
      fileOf(TESTWORT, (file) => {
        file.seedUpdate = hash;
        file.overwriteEditor = true;
      }),
    );
    const { file, issues } = parseEntryFile(PATH, text);
    expect(issues).toEqual([]);
    expect(file?.seedUpdate).toBe(hash);
    expect(file?.overwriteEditor).toBe(true);
    expect(file?.entry).toEqual(TESTWORT);
  });

  it('writes the file\'s "colours" as the column\'s "colors", as a key and in supports', () => {
    const { file, issues } = parseEntryFile(
      PATH,
      plainwort(
        `colours:\n  - green\nreferences:\n  - source: fixture-page\n    supports: [description, colours]`,
      ),
    );
    expect(issues).toEqual([]);
    expect(file?.entry.colors).toEqual(['green']);
    expect(file?.entry).not.toHaveProperty('colours');
    expect(file?.entry.references[0].supports).toEqual(['description', 'colors']);
  });

  describe('blank values', () => {
    it('reads a blank scalar, an empty list item, [null] and [""] as absent', () => {
      const { file, issues } = parseEntryFile(
        PATH,
        plainwort(
          `safetyNotes:\ndeities:\n  -\ncolours: [null]\nfolkNames: [""]\ncategories:\n${SOURCED}`,
        ),
      );
      expect(issues).toEqual([]);
      for (const key of ['safetyNotes', 'deities', 'colors', 'folkNames', 'categories'] as const) {
        expect(file?.entry).not.toHaveProperty(key);
      }
    });

    it('reads a references key of blanks as no citations, and requires the key', () => {
      const blank = parseEntryFile(PATH, plainwort('references:\n  - source:\n    locator:'));
      expect(blank.issues).toEqual([]);
      expect(blank.file?.entry.references).toEqual([]);

      const missing = parseEntryFile(PATH, plainwort('toxic: true'));
      expect(missing.file).toBeUndefined();
      expect(missing.issues).toEqual([expect.stringContaining('no `references` key')]);
    });
  });

  describe('the body', () => {
    it('takes the # heading as the name and the text before the first #### as the description', () => {
      const body = `# Plainwort\n\n${wordsOf(60)}\nwrapped onto a second line\n\n${wordsOf(50)}\n\n#### Questions for the Curator\n\nIs it?\n\n#### Edit Notes for Claude\n\nCheck the name.\n`;
      const { file, issues } = parseEntryFile(PATH, plainwort(SOURCED, body));
      expect(issues).toEqual([]);
      expect(file?.entry.name).toBe('Plainwort');
      expect(file?.entry.description).toBe(
        `${wordsOf(60)} wrapped onto a second line\n\n${wordsOf(50)}`,
      );
      expect(file?.sections).toEqual({ questions: 'Is it?', editNotes: 'Check the name.' });
    });

    it('keeps the two sections out of the description and the hash', () => {
      const bare = parseEntryFile(PATH, plainwort(SOURCED));
      const noted = parseEntryFile(
        PATH,
        plainwort(
          SOURCED,
          `# Plainwort\n\n${wordsOf(100)}\n\n#### Questions for the Curator\n\nWhich?\n\n#### Edit Notes for Claude\n\nLater.\n`,
        ),
      );
      expect(noted.file?.entry).toEqual(bare.file?.entry);
      expect(noted.file?.hash).toBe(bare.file?.hash);
    });

    it('reads a file with no description as an entry without one', () => {
      const { file, issues } = parseEntryFile(PATH, plainwort('references: []', '# Plainwort\n'));
      expect(issues).toEqual([]);
      expect(file?.entry).not.toHaveProperty('description');
    });

    it.each([
      [
        'a second-level heading',
        `# Plainwort\n\n## Lore\n\n${wordsOf(100)}\n`,
        'heading "## Lore"',
      ],
      ['a second # heading', `# Plainwort\n\n# Again\n\n${wordsOf(100)}\n`, 'heading "# Again"'],
      ['no # heading', `${wordsOf(100)}\n`, 'no `# Name` heading'],
      [
        'a section it does not know',
        `# Plainwort\n\n${wordsOf(100)}\n\n#### Sources\n\nSome.\n`,
        'section "Sources"',
      ],
      [
        'the sections out of order',
        `# Plainwort\n\n${wordsOf(100)}\n\n#### Edit Notes for Claude\n\nA.\n\n#### Questions for the Curator\n\nB.\n`,
        'the questions come first',
      ],
      [
        'a section twice',
        `# Plainwort\n\n${wordsOf(100)}\n\n#### Edit Notes for Claude\n\nA.\n\n#### Edit Notes for Claude\n\nB.\n`,
        'two "Edit Notes for Claude" sections',
      ],
    ])('refuses %s', (_case, body, issue) => {
      const parsed = parseEntryFile(PATH, plainwort(SOURCED, body));
      expect(parsed.file).toBeUndefined();
      expect(parsed.issues).toEqual([expect.stringContaining(issue)]);
    });
  });

  describe('the frontmatter', () => {
    it('refuses an unknown key, naming it', () => {
      const parsed = parseEntryFile(PATH, plainwort(`colour: green\n${SOURCED}`));
      expect(parsed.file).toBeUndefined();
      expect(parsed.issues).toEqual([expect.stringContaining('unknown key "colour"')]);
    });

    it('refuses an unknown key on a citation or a form', () => {
      const onCitation = parseEntryFile(
        PATH,
        plainwort(
          `references:\n  - source: fixture-page\n    page: 12\n    supports: [description]`,
        ),
      );
      expect(onCitation.issues).toEqual([expect.stringContaining('unknown key "page"')]);
      const onForm = parseEntryFile(
        PATH,
        `---\nstatus: approved\nnomenclature: none\n${SOURCED}\nvariants:\n  - form: Water\n    note: x\n    references:\n      - source: fixture-page\n        supports: [form]\n---\n\n# Plainwort\n\n${wordsOf(100)}\n`,
      );
      expect(onForm.issues).toEqual([expect.stringContaining('unknown key "note"')]);
    });

    it('refuses a duplicate key', () => {
      const parsed = parseEntryFile(PATH, plainwort(`${SOURCED}\nstatus: draft`));
      expect(parsed.file).toBeUndefined();
      expect(parsed.issues).toHaveLength(1);
      expect(parsed.issues[0]).toMatch(/duplicate|unique/i);
    });

    it('refuses a written toxic: false, which would claim safety', () => {
      const parsed = parseEntryFile(PATH, plainwort(`toxic: false\n${SOURCED}`));
      expect(parsed.file).toBeUndefined();
      expect(parsed.issues).toEqual([expect.stringContaining('toxic')]);
    });

    it('refuses a status, a nomenclature or a nameBasis off its list', () => {
      for (const [was, off] of [
        ['status: approved', 'status: ready'],
        ['nomenclature: none', 'nomenclature: herbal'],
      ]) {
        const text = plainwort(SOURCED).replace(was, off);
        expect(parseEntryFile(PATH, text).issues).toEqual([
          expect.stringContaining(off.split(':')[0]),
        ]);
      }
      const basis = parseEntryFile(
        PATH,
        plainwort(
          `references:\n  - source: fixture-page\n    nameBasis: guessed\n    supports: [description]`,
        ),
      );
      expect(basis.issues).toEqual([expect.stringContaining('nameBasis')]);
    });

    it('refuses a seedUpdate that is not 64 hex characters', () => {
      const parsed = parseEntryFile(PATH, plainwort(`seedUpdate: abc\n${SOURCED}`));
      expect(parsed.issues).toEqual([expect.stringContaining('seedUpdate')]);
    });

    it('refuses a file with no frontmatter', () => {
      const parsed = parseEntryFile(PATH, `# Plainwort\n\n${wordsOf(100)}\n`);
      expect(parsed.file).toBeUndefined();
      expect(parsed.issues).toEqual([expect.stringContaining('no frontmatter')]);
    });
  });

  it('opens every issue with the path it was given', () => {
    const parsed = parseEntryFile('ingredients/none/plainwort.md', plainwort('colour: green'));
    expect(parsed.issues.length).toBeGreaterThan(0);
    for (const issue of parsed.issues)
      expect(issue.startsWith('ingredients/none/plainwort.md ')).toBe(true);
  });
});
