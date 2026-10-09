import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import picomatch from 'picomatch';
import { describe, expect, inject, it } from 'vitest';
import { parse } from 'yaml';

import { REPO_ROOT } from '../support/paths';

// CLAUDE.md is loaded on every turn; a `.claude/rules/*.md` file only once a
// file its `paths:` globs match has been read with the Read tool. A rule file
// whose globs match nothing never loads, and one with no `paths:` loads on
// every turn — CLAUDE.md's cost again, under another name. See
// claude-docs/agent-skills.md, "Rule files".

const RULES_DIR = '.claude/rules';
const RULE_FILES = ['components', 'database', 'graphql', 'task-tracking', 'testing'];
/** 20 KB, counted in bytes: the ceiling MB.144 set for what every turn carries. */
const CLAUDE_MD_MAX_BYTES = 20_000;

/** The unit project's shared listing (MB.184), the whole repo or one directory of it. */
const listed = (directory?: string) =>
  inject('repoFiles').filter((file) => directory === undefined || file.startsWith(`${directory}/`));

const read = (file: string) => readFileSync(join(REPO_ROOT, file), 'utf8');

/** The `paths:` list of a rule file's frontmatter, or whatever stands in its place. */
function pathsOf(file: string): unknown {
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(read(file));
  return frontmatter ? (parse(frontmatter[1]) as { paths?: unknown } | null)?.paths : undefined;
}

const ruleFiles = listed(RULES_DIR).filter((file) => file.endsWith('.md'));
const nameOf = (file: string) => basename(file, '.md');
const matcherFor = (name: string) =>
  picomatch(pathsOf(`${RULES_DIR}/${name}.md`) as string[], { dot: true });

describe('MB.144: every rule file is path-scoped', () => {
  // Precondition: an empty directory satisfies every per-file check below.
  it('finds the five rule files', () => {
    expect(ruleFiles.map(nameOf)).toEqual(expect.arrayContaining(RULE_FILES));
  });

  it('gives each a non-empty `paths:` list of globs', () => {
    const unscoped = ruleFiles.filter((file) => {
      const paths = pathsOf(file);
      return (
        !Array.isArray(paths) ||
        paths.length === 0 ||
        paths.some((glob) => typeof glob !== 'string' || glob.length === 0)
      );
    });

    expect(unscoped).toEqual([]);
  });

  // A glob that matches no file is a rule that can never load.
  it('matches at least one file with every glob', () => {
    const files = listed();
    const dead = ruleFiles.flatMap((file) =>
      (pathsOf(file) as string[])
        .filter((glob) => {
          const matches = picomatch(glob, { dot: true });
          return !files.some((path) => matches(path));
        })
        .map((glob) => `${file}: ${glob}`),
    );

    expect(files.length).toBeGreaterThan(500);
    expect(dead).toEqual([]);
  });

  // The acceptance criterion, stated as the matcher sees it.
  it('loads the database rule for src/db/ and not for src/components/', () => {
    const database = matcherFor('database');
    const components = matcherFor('components');

    expect(database('src/db/repository/write.ts')).toBe(true);
    expect(database('src/components/AdminNav/index.tsx')).toBe(false);
    expect(components('src/components/AdminNav/index.tsx')).toBe(true);
    expect(components('src/db/repository/write.ts')).toBe(false);
  });
});

describe('MB.144: CLAUDE.md stays the summary', () => {
  const claudeMd = read('CLAUDE.md');

  it('fits in 20 KB', () => {
    expect(Buffer.byteLength(claudeMd, 'utf8')).toBeLessThanOrEqual(CLAUDE_MD_MAX_BYTES);
  });

  // A session that reads through the shell triggers no rule file, so the
  // summary is the one place it learns the long form exists.
  it('names every rule file', () => {
    const unnamed = ruleFiles.filter((file) => !claudeMd.includes(file));

    expect(ruleFiles.length).toBeGreaterThan(0);
    expect(unnamed).toEqual([]);
  });

  // Code cites the rules by number (`CLAUDE.md rule 4`), each for a clause of
  // its own. The phrases are those clauses: a renumbering, or a cut that drops
  // one, leaves those citations naming something else.
  const RULE_PINS: Record<number, string[]> = {
    1: ['Authorization lives in', '/api/graphql', '/api/auth/*', 'server actions'],
    2: ['src/db/repository/', 'database client'],
    3: ['withAudit', 'app.current_user_id', 'identity bootstraps'],
    4: ['Soft-delete filtering', 'partial', 'drizzle-orm'],
    5: ['assertMembership', 'Membership'],
    6: ['cache'],
    7: ['Filter in SQL'],
    8: ['paginates', 't.pagedConnection'],
    9: ['DataLoader', 'dataloader'],
    10: ['expand/contract', 'Destructive DDL'],
  };

  const section = /^## Non-negotiable architecture rules\n([\s\S]*?)(?=^## )/m.exec(claudeMd)?.[1];
  const rules = new Map(
    [...(section ?? '').matchAll(/^\*\*(\d+)\. ([\s\S]*?)(?=^\*\*\d+\. |$(?![\s\S]))/gm)].map(
      ([, number, text]) => [Number(number), text],
    ),
  );

  it('keeps the ten architecture rules, numbered 1 to 10', () => {
    expect(section).toBeDefined();
    expect([...rules.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('keeps in each rule the clause its citations rely on', () => {
    const missing = Object.entries(RULE_PINS).flatMap(([number, phrases]) =>
      phrases
        .filter((phrase) => !rules.get(Number(number))?.includes(phrase))
        .map((phrase) => `rule ${number}: ${phrase}`),
    );

    expect(missing).toEqual([]);
  });
});
