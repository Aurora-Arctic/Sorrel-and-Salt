import type { Root, RootContent } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { slugify } from './slugify';
import { fold } from './text';

// The marks a help body carries: `[[Term]]` and `[[Term|shown text]]`, matched against the glossary by title or slug
// (claude-docs/components/help-pages.md, "Glossary marks").

/** One mark inside a single run of text: group 1 the term, group 2 the shown text if it has one. */
export const MARK = /\[\[([^[\]|\n]+?)(?:\|([^[\]\n]+?))?\]\]/g;

/** A glossary row, as far as a mark needs it. */
export interface HelpTermSource {
  slug: string;
  title: string;
  /** Markdown. */
  body: string;
}

/** What a tooltip shows for a term. */
interface HelpTermEntry {
  slug: string;
  title: string;
  /** The term's body as plain text. */
  definition: string;
}

export interface HelpTerms {
  /** The term a mark names, by title in any case or by the slug the name makes; undefined when none. */
  find: (name: string) => HelpTermEntry | undefined;
  /** Whether a marked term opens a tooltip; the glossary itself only links. */
  tooltips: boolean;
}

/** The text a mark shows. */
export const shownText = (term: string, shown: string | undefined): string =>
  (shown ?? term).trim();

/** The text with each mark replaced by what it shows. */
export function stripMarks(text: string): string {
  return text.replace(MARK, (_all, term: string, shown?: string) => shownText(term, shown));
}

const parser = unified().use(remarkParse).use(remarkGfm);

function textNodes(node: Root | RootContent, found: string[]): void {
  // Code is shown as written, so a body can say how a mark is typed.
  if (node.type === 'code' || node.type === 'inlineCode') return;
  if (node.type === 'text' || node.type === 'html') found.push(node.value);
  if ('children' in node) for (const child of node.children) textNodes(child, found);
}

/** Each run of text in a Markdown body, in order, leaving out code, which is shown as written. */
export function textRuns(body: string): string[] {
  const runs: string[] = [];
  textNodes(parser.parse(body), runs);
  return runs;
}

/** The term each mark in a Markdown body names, in order; marks in code are not marks. */
export function marksInMarkdown(body: string): string[] {
  return textRuns(body).flatMap((run) => [...run.matchAll(MARK)].map((match) => match[1].trim()));
}

const PHRASING = new Set([
  'text',
  'emphasis',
  'strong',
  'delete',
  'link',
  'inlineCode',
  'break',
  'linkReference',
  'footnoteReference',
  'html',
]);

function plain(node: Root | RootContent): string {
  if (node.type === 'text') return stripMarks(node.value);
  if (node.type === 'inlineCode' || node.type === 'code' || node.type === 'html') return node.value;
  if (node.type === 'break') return ' ';
  if (node.type === 'image') return node.alt ?? '';
  if (!('children' in node)) return '';
  const inline = node.children.every((child) => PHRASING.has(child.type));
  return node.children.map(plain).join(inline ? '' : ' ');
}

/** A Markdown body as one line of plain text, each mark shown as its text. */
function plainText(body: string): string {
  return plain(parser.parse(body)).replace(/\s+/g, ' ').trim();
}

export function helpTerms(sources: readonly HelpTermSource[], { tooltips = true } = {}): HelpTerms {
  const byTitle = new Map(sources.map((source) => [fold(source.title), source]));
  const bySlug = new Map(sources.map((source) => [source.slug, source]));
  const entries = new Map<string, HelpTermEntry>();
  const find = (name: string): HelpTermEntry | undefined => {
    const source = byTitle.get(fold(name)) ?? bySlug.get(slugify(name));
    if (!source) return undefined;
    let entry = entries.get(source.slug);
    if (!entry) {
      entry = { slug: source.slug, title: source.title, definition: plainText(source.body) };
      entries.set(source.slug, entry);
    }
    return entry;
  };
  return { find, tooltips };
}
