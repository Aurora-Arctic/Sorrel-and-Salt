import { describe, expect, it } from 'vitest';
import { editorValueToMarkdown, markdownToEditorValue } from '@/components/RichTextEditor/markdown';
import { loadDocuments } from '@/db/seed/documents';
import { loadHelpArticles } from '@/db/seed/help';
import { fromRoot } from '../../support/paths';

// Opening and saving a document or a help entry unedited must store the markdown it opened, or every save rewrites text nobody changed.

const documents = loadDocuments(fromRoot('documents'));

function nodesOf(value: unknown): { type?: unknown; text?: unknown }[] {
  const found: { type?: unknown; text?: unknown }[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    found.push(node as { type?: unknown; text?: unknown });
    walk((node as { children?: unknown }).children);
  };
  walk(value);
  return found;
}

describe('the document editor’s markdown', () => {
  // Precondition: the five documents, so a pass is not a loop over nothing.
  it('is proved over the five documents', () => {
    expect(documents.map((document) => document.key).sort()).toEqual([
      'about',
      'code-of-ethics',
      'disclaimer',
      'privacy',
      'terms',
    ]);
  });

  it.each(documents.map((document) => [document.key, document.body] as const))(
    'reads %s into the editor and writes it back unchanged',
    (_key, body) => {
      const value = markdownToEditorValue(body);

      expect(editorValueToMarkdown(value)).toBe(body);
    },
  );

  // Structure, not a passthrough: a value holding the markdown as one run of text would also write it back unchanged.
  it.each(documents.map((document) => [document.key, document.body] as const))(
    'reads each heading of %s as a heading, and no markdown syntax as text',
    (_key, body) => {
      const nodes = nodesOf(markdownToEditorValue(body));
      const headings = body.match(/^#{2,6} /gm) ?? [];

      expect(headings.length).toBeGreaterThan(0);
      expect(nodes.filter((node) => /^h[2-6]$/.test(String(node.type)))).toHaveLength(
        headings.length,
      );
      for (const { text } of nodes) {
        if (typeof text === 'string') expect(text).not.toMatch(/^#{1,6} |^- /m);
      }
    },
  );

  // A table the toolbar inserts, and a footnote it adds, start empty: the markdown must hold nothing invisible in them.
  it('writes an empty table cell and an empty footnote definition with no zero-width space', () => {
    const value = markdownToEditorValue(
      'Text.[^1]\n\n| A | B |\n| - | - |\n| x | y |\n\n[^1]: note',
    );
    const emptied = JSON.parse(JSON.stringify(value).replace('"note"', '""').replace('"x"', '""'));

    const markdown = editorValueToMarkdown(emptied);

    expect(markdown).not.toContain('\u200B');
    expect(markdown).toMatch(/^\[\^1\]:$/m);
  });
});

// A help body carries what a document does not: callouts (`> **Note:**`), a `::widget[name]` line, `[[Term]]` marks and links
// to /help addresses. The marks and tags are checked on save against the raw text, so they must come back with no escapes.
describe('the editor’s markdown for help entries', () => {
  const entries = loadHelpArticles();
  const bodies = entries.map((entry) => entry.body);

  // Precondition: the seeded list holds each form, so a pass is not a loop over bodies without them.
  it('is proved over seeded bodies holding every help-only form', () => {
    expect(bodies.some((body) => /^> \*\*(Note|Tip|Take Care):\*\*/m.test(body))).toBe(true);
    expect(bodies.some((body) => /^::widget\[[^\]]+\]$/m.test(body))).toBe(true);
    expect(bodies.some((body) => body.includes('[['))).toBe(true);
    expect(bodies.some((body) => body.includes('](/help'))).toBe(true);
  });

  it.each(entries.map((entry) => [entry.seedKey, entry.body] as const))(
    'reads %s into the editor and writes it back unchanged',
    (_key, body) => {
      expect(editorValueToMarkdown(markdownToEditorValue(body))).toBe(body);
    },
  );

  // Structure, not a passthrough: each form is read as what it is, so the editor shows it and not its syntax as one run of text.
  it('reads a callout as a quote, a widget tag as a paragraph of its own and a /help link as a link', () => {
    const nodes = nodesOf(
      markdownToEditorValue(
        '> **Note:** Testwort is a fixture.\n\n::widget[unit-converter]\n\nSee [the glossary](/help/glossary#testwort).',
      ),
    ) as { type?: unknown; text?: unknown; url?: unknown; children?: { text?: unknown }[] }[];

    expect(nodes.filter((node) => node.type === 'blockquote')).toHaveLength(1);
    expect(
      nodes.some(
        (node) =>
          node.type === 'p' &&
          node.children?.length === 1 &&
          node.children[0].text === '::widget[unit-converter]',
      ),
    ).toBe(true);
    expect(nodes.find((node) => node.type === 'a')?.url).toBe('/help/glossary#testwort');
  });

  // A keeper typing a mark or a tag into the editor writes text the serialiser would otherwise escape.
  it('writes a typed term mark and widget tag with no escaped brackets', () => {
    const typed = [
      { type: 'p', children: [{ text: 'The [[Testwort]] and the [[Testwort|testworts]].' }] },
      { type: 'p', children: [{ text: '::widget[unit-converter]' }] },
    ];

    const markdown = editorValueToMarkdown(typed as never);

    expect(markdown).toBe(
      'The [[Testwort]] and the [[Testwort|testworts]].\n\n::widget[unit-converter]',
    );
  });
});
