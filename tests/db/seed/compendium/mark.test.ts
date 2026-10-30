import { describe, expect, it } from 'vitest';
import { markFile } from '@/db/seed/compendium/mark';
import { entryFilePath, parseEntryFile } from '@/db/seed/compendium/parse-entry';
import { renderEntryFile } from '@/db/seed/compendium/render-entry';
import { fileOf, TESTWORT } from './files-fixture';

// `seed:mark` is the one move that lets the seed update a present entry. It writes the file's own hash
// into `seedUpdate`, and nothing else about the file may move.

const PATH = entryFilePath(TESTWORT);
const STALE = 'a'.repeat(64);

/** The frontmatter lines and the body of `text`, split at the closing fence. */
function split(text: string): { frontmatter: string; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error('no frontmatter');
  return { frontmatter: match[1], body: match[2] };
}

/** The result's text and hash, or a thrown issue, so a case reads straight on. */
function marked(text: string): { text: string; hash: string } {
  const result = markFile(PATH, text);
  if ('issue' in result) throw new Error(result.issue);
  return result;
}

/** Testwort's rendered file with `line` added to its frontmatter just after the `status` line. */
function withLine(line: string): string {
  return renderEntryFile(fileOf(TESTWORT)).replace(/^(---\nstatus: .*\n)/, `$1${line}\n`);
}

describe('markFile', () => {
  it("writes seedUpdate equal to the file's own hash", () => {
    const text = renderEntryFile(fileOf(TESTWORT));

    const result = marked(text);

    const parsed = parseEntryFile(PATH, result.text);
    expect(parsed.issues).toEqual([]);
    expect(parsed.file?.seedUpdate).toBe(parsed.file?.hash);
    expect(result.hash).toBe(parsed.file?.hash);
    // Precondition: the unmarked file carried no mark, so the write is the mark's.
    expect(parseEntryFile(PATH, text).file?.seedUpdate).toBeUndefined();
  });

  it('leaves the entry unchanged, so the mark is for the content that was read', () => {
    const text = renderEntryFile(fileOf(TESTWORT));

    const before = parseEntryFile(PATH, text).file;
    const after = parseEntryFile(PATH, marked(text).text).file;

    expect(after?.entry).toEqual(before?.entry);
    expect(after?.hash).toBe(before?.hash);
  });

  it('keeps a comment the owner wrote and the order of the frontmatter keys', () => {
    const text = withLine('# keep me');
    // Precondition: the comment is in the frontmatter the mark starts from.
    expect(split(text).frontmatter).toContain('# keep me');

    const result = marked(text);

    const { frontmatter } = split(result.text);
    expect(frontmatter).toContain('# keep me');
    const keys = (yaml: string) => yaml.match(/^[A-Za-z]+(?=:)/gm) ?? [];
    expect(keys(frontmatter).filter((key) => key !== 'seedUpdate')).toEqual(
      keys(split(text).frontmatter),
    );
  });

  it('keeps the body byte for byte', () => {
    const text = renderEntryFile(
      fileOf(TESTWORT, (file) => {
        file.sections = { questions: 'Is the oil safe to name?', editNotes: 'Checked twice.' };
      }),
    );

    const result = marked(text);

    expect(split(result.text).body).toBe(split(text).body);
  });

  it('is idempotent: marking a marked file changes neither its text nor its hash', () => {
    const once = marked(renderEntryFile(fileOf(TESTWORT)));

    const twice = marked(once.text);

    expect(twice.text).toBe(once.text);
    expect(twice.hash).toBe(once.hash);
  });

  it('replaces a stale mark in place, so the key appears once and where it was', () => {
    const text = withLine(`seedUpdate: ${STALE}`);
    const position = (yaml: string) =>
      yaml.split('\n').findIndex((l) => l.startsWith('seedUpdate'));
    // Precondition: the mark is stale, so the replacement is what makes it right.
    expect(parseEntryFile(PATH, text).file?.seedUpdate).toBe(STALE);

    const result = marked(text);

    const { frontmatter } = split(result.text);
    expect(frontmatter.match(/^seedUpdate:/gm)).toHaveLength(1);
    expect(frontmatter).not.toContain(STALE);
    expect(position(frontmatter)).toBe(position(split(text).frontmatter));
    const parsed = parseEntryFile(PATH, result.text).file;
    expect(parsed?.seedUpdate).toBe(parsed?.hash);
  });

  it('returns an issue naming the status for a file that is not approved', () => {
    const text = renderEntryFile(
      fileOf(TESTWORT, (file) => {
        file.status = 'needs-review';
      }),
    );
    // Precondition: the file parses, so the refusal is the status's.
    expect(parseEntryFile(PATH, text).issues).toEqual([]);

    const result = markFile(PATH, text);

    expect(result).toEqual({ issue: expect.stringContaining('needs-review') });
  });

  it('returns an issue for text that does not parse, writing nothing', () => {
    const result = markFile(PATH, 'no frontmatter here\n');

    expect(result).toEqual({ issue: expect.any(String) });
    expect('text' in result).toBe(false);
  });
});
