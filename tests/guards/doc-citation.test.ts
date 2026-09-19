import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// A comment defers its argument to claude-docs/, so a citation that does not
// resolve costs the reader the argument — and fails silently, because nothing
// reads a comment.

// Assembled so this file does not match its own assertions and report itself.
const DOCS = 'claude-docs';
const CITATION = new RegExp(`${DOCS}/[\\w./-]*\\.md`, 'g');
// A citation left hanging on a line break, the rest on the next comment line.
// A filename splits as readily as a directory does, and either form is
// invisible to the resolve check, which reads one line at a time. Only a
// fragment running to end-of-line counts: naming the directory mid-sentence
// is ordinary prose, and trailing sentence punctuation is not part of the path.
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
const SECTION = new RegExp(`([\\w.-]+\\.md)['"]?,?s? "([^"]+)"`, 'g');

function unwrap(section: string): string {
  return section.replace(/\s*\n\s*(?:\/\/|\*|#)?\s*/g, ' ').trim();
}

/**
 * Tracked files plus untracked ones git would not ignore, so a citation is
 * caught in the diff that adds it. `src/db/migrations/` is excluded: drizzle
 * hashes each migration's content, so fixing a comment there is not the
 * harmless edit it looks like.
 */
function citingFiles(): string[] {
  const args = ['-c', 'safe.directory=*', 'ls-files', '--cached', '--others', '--exclude-standard'];
  const globs = ['*.ts', '*.tsx', '*.mts', '*.mjs', '*.scss', '*.yml', '*.yaml', 'makefile'];
  return execFileSync('git', [...args, ...globs], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((file) => !file.startsWith(`${DOCS}/`) && !file.startsWith('src/db/migrations/'));
}

function read(file: string): string {
  return readFileSync(join(REPO_ROOT, file), 'utf8');
}

/** Every `claude-docs/….md` a file names, in source order, with duplicates dropped. */
function citationsIn(file: string): string[] {
  return [...new Set(read(file).match(CITATION) ?? [])];
}

const FILES = citingFiles();
const CITED = FILES.flatMap((file) => citationsIn(file).map((path) => ({ file, path })));

describe('every claude-docs citation resolves', () => {
  // Precondition: an empty listing would satisfy every `toEqual([])` below
  // with nothing checked.
  it('is scanning files that actually cite the docs', () => {
    expect(FILES.length).toBeGreaterThan(50);
    expect(CITED.length).toBeGreaterThan(10);
    expect(CITED.map(({ file }) => file)).toContain('src/db/repository.ts');
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
    const dangling = FILES.flatMap((file) => {
      const cited = citationsIn(file);
      return [...read(file).matchAll(SECTION)].flatMap(([, doc, quoted]) => {
        const path = cited.find((candidate) => candidate.endsWith(`/${doc}`));
        if (!path || !existsSync(join(REPO_ROOT, path))) return [];

        const section = unwrap(quoted);
        const headings = [...read(path).matchAll(/^#+\s+(.*)$/gm)].map(([, text]) =>
          text.replace(/`/g, ''),
        );
        return headings.some((heading) => heading.startsWith(section)) ? [] : [{ file, section }];
      });
    });

    expect(dangling).toEqual([]);
  });
});
