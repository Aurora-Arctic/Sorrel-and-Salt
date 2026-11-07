import type { Element, ElementContent, Root, RootContent } from 'hast';
import type { Root as MarkdownRoot, RootContent as MarkdownContent } from 'mdast';
import type { ReactNode } from 'react';
import * as runtime from 'react/jsx-runtime';
import rehypeReact from 'rehype-react';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { MARK, shownText, type HelpTerms } from '../../lib/help-marks';
import { slugify } from '../../lib/slugify';
import HelpTerm from '../HelpTerm';
import type { PageNavEntry } from '../PageNav/types';
import type { DocumentPlaceholders } from './types';

// Raw HTML in a body becomes text, never an element (there is no rehype-raw); a link is kept
// only for an address the site opens.
const OPENABLE_ADDRESS = /^(\/(?!\/)|#|\?|https:|mailto:)/i;

/**
 * An address in the account pages, which robots.txt blocks and which send a signed-out visitor to
 * sign-in, so a crawler is asked not to follow a link to one.
 */
const ACCOUNT_ADDRESS = /^\/account(?:[/?#]|$)/;

const FLOW_PARENTS = new Set(['root', 'blockquote', 'listItem', 'footnoteDefinition']);

function htmlAsText() {
  return (tree: MarkdownRoot): void => {
    const visit = (parent: { type: string; children?: MarkdownContent[] }): void => {
      const { children } = parent;
      if (!children) return;
      children.forEach((child, index) => {
        if (child.type === 'html') {
          const text = { type: 'text' as const, value: child.value };
          children[index] = FLOW_PARENTS.has(parent.type)
            ? { type: 'paragraph', children: [text] }
            : text;
        } else {
          visit(child as { type: string; children?: MarkdownContent[] });
        }
      });
    };
    visit(tree);
  };
}

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(htmlAsText)
  .use(remarkRehype, {
    footnoteLabel: 'Sources',
    footnoteLabelProperties: {},
  });

/** The tag a placeholder paragraph becomes, so the React step can swap it for the node the page mapped. */
const PLACEHOLDER_TAG = 'document-placeholder';

const PLACEHOLDER_TEXT = /^\{([^{}\s]+)\}$/;

function markPlaceholders(
  children: ElementContent[],
  placeholders: DocumentPlaceholders,
): ElementContent[] {
  return children.map((child) => {
    if (!isElement(child) || child.tagName !== 'p') return child;
    const text = child.children.length === 1 ? textOf(child).trim() : '';
    const name = PLACEHOLDER_TEXT.exec(text)?.[1];
    if (name === undefined || !Object.prototype.hasOwnProperty.call(placeholders, name))
      return child;
    return { type: 'element', tagName: PLACEHOLDER_TAG, properties: { name }, children: [] };
  });
}

/** The tag a glossary mark becomes, so the React step can swap it for the tooltip component. */
const TERM_TAG = 'help-term';

const TEXT_ONLY = /^(?:h[1-6]|a|code|pre)$/;

function text(value: string): ElementContent {
  return { type: 'text', value };
}

/**
 * Swaps each `[[Term]]` mark in the text for a link to the term, or, where the term is not in the glossary or the
 * mark sits in a heading or a link, for the text it shows. A code span or block is left as written, so a body can
 * say how a mark is typed.
 */
function markTerms(children: ElementContent[], terms: HelpTerms, plain = false): ElementContent[] {
  return children.flatMap((child): ElementContent[] => {
    if (isElement(child)) {
      if (child.tagName === 'code' || child.tagName === 'pre') return [child];
      child.children = markTerms(child.children, terms, plain || TEXT_ONLY.test(child.tagName));
      return [child];
    }
    if (child.type !== 'text' || !child.value.includes('[[')) return [child];
    const parts: ElementContent[] = [];
    let last = 0;
    for (const match of child.value.matchAll(MARK)) {
      const shown = shownText(match[1], match[2]);
      if (match.index > last) parts.push(text(child.value.slice(last, match.index)));
      last = match.index + match[0].length;
      const term = plain ? undefined : terms.find(match[1]);
      if (!term) parts.push(text(shown));
      else if (terms.tooltips)
        parts.push({
          type: 'element',
          tagName: TERM_TAG,
          properties: { slug: term.slug, title: term.title, definition: term.definition, shown },
          children: [],
        });
      else
        parts.push({
          type: 'element',
          tagName: 'a',
          properties: { href: `#${term.slug}` },
          children: [text(shown)],
        });
    }
    if (last < child.value.length) parts.push(text(child.value.slice(last)));
    return parts;
  });
}

function reactProcessorFor(placeholders: DocumentPlaceholders) {
  return unified().use(rehypeReact, {
    Fragment: runtime.Fragment,
    jsx: runtime.jsx,
    jsxs: runtime.jsxs,
    components: {
      [PLACEHOLDER_TAG]: ({ name }: { name: string }) => placeholders[name],
      [TERM_TAG]: HelpTerm,
    },
  });
}

function textOf(node: RootContent | ElementContent | Root): string {
  if (node.type === 'text') return node.value;
  return 'children' in node ? (node.children as ElementContent[]).map(textOf).join('') : '';
}

function isElement(node: RootContent | ElementContent | Root): node is Element {
  return node.type === 'element';
}

function classes(node: Element, ...added: string[]): void {
  const existing = node.properties.className;
  node.properties.className = [...(Array.isArray(existing) ? existing.map(String) : []), ...added];
}

function shapeFootnotes(node: Element): void {
  if (node.tagName === 'a' && node.properties.dataFootnoteRef !== undefined) {
    const number = textOf(node);
    node.properties.ariaLabel = `Source ${number}`;
    delete node.properties.ariaDescribedBy;
    node.children = [{ type: 'text', value: `#${number}` }];
  }
  if (node.tagName === 'sup') classes(node, 'document-page__marks');
  if (node.tagName === 'section' && node.properties.dataFootnotes !== undefined) {
    for (const list of node.children.filter(isElement)) {
      if (list.tagName !== 'ol') continue;
      classes(list, 'document-page__sources');
      for (const item of list.children.filter(isElement)) {
        if (item.tagName !== 'li') continue;
        classes(item, 'document-page__source');
        const backs: Element[] = [];
        const collect = (parent: Element): void => {
          for (const child of parent.children.filter(isElement)) {
            if (child.tagName === 'a' && child.properties.dataFootnoteBackref !== undefined) {
              backs.push(child);
            } else collect(child);
          }
        };
        collect(item);
        backs.forEach((back, index) => {
          back.properties.className = ['document-page__return'];
          back.properties.ariaLabel =
            backs.length > 1 ? `Back to citation ${index + 1}` : 'Back to the text';
          back.children = [
            { type: 'element', tagName: 'wbr', properties: {}, children: [] },
            {
              type: 'element',
              tagName: 'span',
              properties: { ariaHidden: 'true' },
              children: [{ type: 'text', value: '↩' }],
            },
          ];
        });
      }
    }
  }
}

function openableLinks(children: ElementContent[]): ElementContent[] {
  return children.flatMap((child) => {
    if (!isElement(child)) return [child];
    child.children = openableLinks(child.children);
    if (child.tagName !== 'a') return [child];
    const href = child.properties.href;
    if (typeof href !== 'string' || !OPENABLE_ADDRESS.test(href)) return child.children;
    if (ACCOUNT_ADDRESS.test(href)) child.properties.rel = ['nofollow'];
    return [child];
  });
}

/**
 * Seats each table in the scrolling frame the page's styles give a wide table, so it never widens the page.
 * The frame takes focus and is named for the heading above it, so a keyboard can scroll it.
 */
function frameTables(children: ElementContent[]): ElementContent[] {
  let heading = '';
  const frame = (nodes: ElementContent[]): ElementContent[] =>
    nodes.map((child) => {
      if (!isElement(child)) return child;
      if (/^h[1-6]$/.test(child.tagName)) heading = textOf(child);
      if (child.tagName !== 'table') {
        child.children = frame(child.children);
        return child;
      }
      classes(child, 'data-table');
      return {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['data-table-frame'],
          role: 'region',
          tabIndex: 0,
          ...(heading ? { ariaLabel: heading } : {}),
        },
        children: [child],
      };
    });
  return frame(children);
}

function visitElements(node: Root | Element, visit: (element: Element) => void): void {
  for (const child of node.children) {
    if (!isElement(child)) continue;
    visit(child);
    visitElements(child, visit);
  }
}

function sectionsOf(tree: Root, reserved: readonly string[]): PageNavEntry[] {
  const headings: Element[] = [];
  visitElements(tree, (element) => {
    if (element.tagName === 'h2' || element.tagName === 'h3') headings.push(element);
  });
  const entries: PageNavEntry[] = [];
  // The page's own ids are taken first, so a body heading never claims one; a repeated text gets -2, -3 after the first.
  const taken = new Set(['document-title', 'document-history', ...reserved]);
  let group: string | null = null;
  headings.forEach((heading, index) => {
    const label = textOf(heading);
    const base = slugify(label);
    let id = base;
    for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
    taken.add(id);
    heading.properties.id = id;
    const href = `#${id}` as const;
    if (heading.tagName === 'h2') {
      const hasParts = headings[index + 1]?.tagName === 'h3';
      group = hasParts ? label : null;
      if (!hasParts) entries.push({ href, label });
    } else {
      entries.push({ href, label, ...(group === null ? {} : { group }) });
    }
  });
  return entries;
}

export function renderMarkdown(
  body: string,
  placeholders: DocumentPlaceholders = {},
  // Ids a heading must not take, for a page that anchors other elements by id.
  reserved: readonly string[] = [],
  // A body drawn beneath a page title of its own: every heading moves down a level (h2 becomes h3).
  lowerHeadings = false,
  // The glossary a help body marks its terms from; a caller that passes none leaves `[[…]]` as text (site documents).
  terms?: HelpTerms,
): { content: ReactNode; entries: PageNavEntry[] } {
  const tree = markdownProcessor.runSync(markdownProcessor.parse(body)) as Root;
  tree.children = openableLinks(tree.children as ElementContent[]) as RootContent[];
  if (terms) tree.children = markTerms(tree.children as ElementContent[], terms) as RootContent[];
  tree.children = markPlaceholders(
    tree.children as ElementContent[],
    placeholders,
  ) as RootContent[];
  tree.children = frameTables(tree.children as ElementContent[]) as RootContent[];
  visitElements(tree, shapeFootnotes);
  const entries = sectionsOf(tree, reserved);
  if (lowerHeadings) {
    visitElements(tree, (element) => {
      const level = /^h([1-5])$/.exec(element.tagName)?.[1];
      if (level) element.tagName = `h${Number(level) + 1}`;
    });
  }
  return { content: reactProcessorFor(placeholders).stringify(tree) as ReactNode, entries };
}
