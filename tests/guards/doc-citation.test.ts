import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DOCS,
  citationsIn,
  citingFiles,
  isSplitIndex,
  sectionCitesIn,
} from '../../scripts/doc-citations.mjs';
import { REPO_ROOT } from '../support/paths';

// A comment defers its argument to claude-docs/, so a citation that does not
// resolve costs the reader the argument — and fails silently, because nothing
// reads a comment. CLAUDE.md and the rule and skill files under .claude/ defer
// the same way, and are read by an agent that cannot tell a dead link from a
// missing rule. What counts as a citation is scripts/doc-citations.mjs's,
// shared with the repoint that follows a summary split.

// A citation left hanging on a line break, the rest on the next comment line.
// A filename splits as readily as a directory does, and either form is
// invisible to the resolve check, which reads one line at a time. Only a
// fragment running to end-of-line counts: naming the directory mid-sentence
// is ordinary prose, and trailing sentence punctuation is not part of the path.
// Assembled so this file does not match its own assertions and report itself.
const PATH_CHARS = new RegExp(`${DOCS}/[\\w./-]*`, 'g');

function wrappedCitation(text: string): boolean {
  return text.split('\n').some((line) =>
    [...line.matchAll(PATH_CHARS)].some((match) => {
      const rest = line.slice(match.index + match[0].length);
      if (!/^[.,;:)\]\s]*$/.test(rest)) return false;
      return !match[0].replace(/[./-]+$/, '').endsWith('.md');
    }),
  );
}

function read(file: string): string {
  return readFileSync(join(REPO_ROOT, file), 'utf8');
}

const FILES = citingFiles(REPO_ROOT);
const CITED = FILES.flatMap((file) => citationsIn(read(file)).map((path) => ({ file, path })));
const SECTION_CITES = FILES.flatMap((file) =>
  sectionCitesIn(read(file)).map((cite) => ({ file, ...cite })),
);

describe('every claude-docs citation resolves', () => {
  // Precondition: an empty listing would satisfy every `toEqual([])` below
  // with nothing checked.
  it('is scanning files that actually cite the docs', () => {
    expect(FILES.length).toBeGreaterThan(50);
    expect(CITED.length).toBeGreaterThan(10);
    expect(CITED.map(({ file }) => file)).toContain('src/db/repository/write.ts');
    expect(FILES).toContain('CLAUDE.md');
    expect(FILES).toContain('.claude/rules/database.md');
    // A section named on the line after its path is read too.
    expect(SECTION_CITES.map(({ file }) => file)).toContain('tests/db/seed/astrology.test.ts');
    // The index rule below has a split summary to bite on.
    expect(isSplitIndex(REPO_ROOT, `${DOCS}/db.md`)).toBe(true);
  });

  it('names a file that exists', () => {
    const missing = CITED.filter(({ path }) => !existsSync(join(REPO_ROOT, path)));

    expect(missing).toEqual([]);
  });

  // archive/ is write-once and never-read (claude-docs/README.md).
  it('never sends the reader into the archive', () => {
    const archived = CITED.filter(({ path }) => path.startsWith(`${DOCS}/archive/`));

    expect(archived).toEqual([]);
  });

  // The resolve check reads one line at a time, so a split path is checked by nothing.
  it('keeps each citation on one line', () => {
    const wrapped = FILES.filter((file) => wrappedCitation(read(file)));

    expect(wrapped).toEqual([]);
  });

  // A real file, a section never written. Headings carry a trailing task-ID
  // parenthetical, so the quoted name is matched as a prefix.
  it('names a section that exists, where it names one', () => {
    const dangling = SECTION_CITES.filter(({ path, section }) => {
      if (!existsSync(join(REPO_ROOT, path))) return false;
      const headings = [...read(path).matchAll(/^#+\s+(.*)$/gm)].map(([, text]) =>
        text.replace(/`/g, ''),
      );
      return !headings.some((heading) => heading.startsWith(section));
    }).map(({ file, section }) => ({ file, section }));

    expect(dangling).toEqual([]);
  });

  // The index resolves every heading, so a citation through it passes the check
  // above and still sends the reader through the index before the section.
  it("names the file a split summary's section lives in, not the index", () => {
    const throughIndex = SECTION_CITES.filter(({ path }) => isSplitIndex(REPO_ROOT, path)).map(
      ({ file, section }) => ({ file, section }),
    );

    expect(throughIndex).toEqual([]);
  });
});
