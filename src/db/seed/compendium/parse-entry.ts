import { parse as parseYaml } from 'yaml';
import { contentHash } from './content-hash';
import { frontmatterSchema, toEntry, withoutBlanks } from './file-schema';
import { ingredientSlug } from '../../../lib/slugify';
import type { CompendiumFileSections, SeedCompendiumEntry, SeedCompendiumFile } from '../types';

// One entry file to the entry the seed writes: frontmatter between the `---` lines (a duplicate key is refused), then one `# Name` heading, the description
// up to the first `####`, and two optional trailing sections (claude-docs/db/compendium-seed/README.md, "An entry, field by field"). A file with an issue yields no entry.

/** The two trailing sections, in the one order they may appear. */
export const SECTION_HEADINGS = {
  questions: 'Questions for the Curator',
  editNotes: 'Edit Notes for Claude',
} as const;

export interface ParsedEntryFile {
  /** The file, when it parsed clean; absent when `issues` holds anything. */
  file?: SeedCompendiumFile;
  issues: string[];
}

/** The path an entry's file must have, relative to the compendium root: its folder is the nomenclature, its name the slug. */
export function entryFilePath(
  entry: Pick<SeedCompendiumEntry, 'name' | 'canonicalName' | 'nomenclature'>,
): string {
  return `ingredients/${entry.nomenclature}/${ingredientSlug(entry.name, entry.canonicalName)}.md`;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

/** Splits `text` into the frontmatter's YAML and the body, or reports why it cannot. */
function splitFrontmatter(text: string, issues: string[]): { yaml: string; body: string } | null {
  const match = FRONTMATTER.exec(text);
  if (!match) {
    issues.push('has no frontmatter: the file opens with a `---` line and closes it with another.');
    return null;
  }
  return { yaml: match[1], body: text.slice(match[0].length) };
}

function readFrontmatter(yaml: string, issues: string[]): Record<string, unknown> | null {
  let raw: unknown;
  try {
    raw = parseYaml(yaml, { uniqueKeys: true });
  } catch (error) {
    issues.push(`frontmatter: ${(error as Error).message.split('\n')[0]}`);
    return null;
  }
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    issues.push('frontmatter is not a map of keys to values.');
    return null;
  }
  return raw as Record<string, unknown>;
}

interface Body {
  name: string;
  description: string | undefined;
  sections: CompendiumFileSections;
}

/**
 * The body: the one `# Name`, the description's paragraphs, and the
 * sections. Paragraphs split on a blank line and a line break inside one
 * folds to a space, so a file wrapped at eighty columns reads as prose.
 */
function readBody(body: string, issues: string[]): Body | null {
  const lines = body.split(/\r?\n/);
  let name: string | null = null;
  const description: string[] = [];
  const sections: CompendiumFileSections = {};
  const seen: string[] = [];
  let current: keyof CompendiumFileSections | null = null;
  let currentLines: string[] = [];

  const closeSection = () => {
    if (current !== null) sections[current] = currentLines.join('\n').trim();
    currentLines = [];
  };

  for (const line of lines) {
    const heading = HEADING.exec(line);
    if (heading) {
      const [, hashes, title] = heading;
      if (hashes.length === 1 && name === null && current === null) {
        name = title;
        continue;
      }
      if (hashes.length !== 4) {
        issues.push(
          `has the heading "${line.trim()}": a file has one \`#\` heading, its name, and only the two \`####\` sections after the description.`,
        );
        return null;
      }
      const key = (Object.keys(SECTION_HEADINGS) as (keyof typeof SECTION_HEADINGS)[]).find(
        (candidate) => SECTION_HEADINGS[candidate] === title,
      );
      if (key === undefined) {
        issues.push(
          `has the section "${title}": only "${SECTION_HEADINGS.questions}" and "${SECTION_HEADINGS.editNotes}" may follow the description.`,
        );
        return null;
      }
      if (seen.includes(key)) {
        issues.push(`has two "${title}" sections.`);
        return null;
      }
      if (key === 'questions' && seen.includes('editNotes')) {
        issues.push(
          `puts "${SECTION_HEADINGS.questions}" after "${SECTION_HEADINGS.editNotes}": the questions come first.`,
        );
        return null;
      }
      closeSection();
      seen.push(key);
      current = key;
      continue;
    }
    if (current !== null) currentLines.push(line);
    else description.push(line);
  }
  closeSection();

  if (name === null) {
    issues.push("has no `# Name` heading, which is the entry's name.");
    return null;
  }
  if (name.trim() === '') {
    issues.push('has an empty `#` heading: the name is what follows it.');
    return null;
  }

  const paragraphs = description
    .join('\n')
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter((paragraph) => paragraph !== '');
  return {
    name: name.trim(),
    description: paragraphs.length === 0 ? undefined : paragraphs.join('\n\n'),
    sections,
  };
}

/** A zod issue as one line: the key path, then what is wrong with it. */
function describeIssue(issue: {
  code: string;
  path: PropertyKey[];
  message: string;
  keys?: string[];
}) {
  const at = issue.path.length === 0 ? 'frontmatter' : issue.path.map(String).join('.');
  if (issue.code === 'unrecognized_keys') {
    return `${at}: unknown key${issue.keys && issue.keys.length > 1 ? 's' : ''} ${(issue.keys ?? [])
      .map((key) => `"${key}"`)
      .join(', ')}.`;
  }
  return `${at}: ${issue.message}.`;
}

/**
 * Parses one entry file. `path` is relative to the compendium root and is
 * what every issue opens with; the loader checks it against the entry
 * (`entryFilePath`), since only the loader knows where the file sat.
 */
export function parseEntryFile(path: string, text: string): ParsedEntryFile {
  const found: string[] = [];
  const split = splitFrontmatter(text, found);
  const raw = split === null ? null : readFrontmatter(split.yaml, found);
  const body = split === null ? null : readBody(split.body, found);

  let file: SeedCompendiumFile | undefined;
  if (raw !== null && body !== null) {
    // The key is required even when its list is all blanks, so a file
    // without citations has said so rather than forgotten them.
    if (!('references' in raw)) found.push('frontmatter: has no `references` key.');
    const normalised = withoutBlanks(raw) ?? {};
    const parsed = frontmatterSchema.safeParse(normalised);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) found.push(describeIssue(issue));
    } else if (found.length === 0) {
      const entry = toEntry(parsed.data, body.name, body.description);
      file = {
        path,
        status: parsed.data.status,
        ...(parsed.data.seedUpdate === undefined ? {} : { seedUpdate: parsed.data.seedUpdate }),
        ...(parsed.data.overwriteEditor === undefined ? {} : { overwriteEditor: true as const }),
        entry,
        hash: contentHash(entry),
        sections: body.sections,
      };
    }
  }

  return {
    ...(file === undefined ? {} : { file }),
    issues: found.map((issue) => `${path} ${issue}`),
  };
}
