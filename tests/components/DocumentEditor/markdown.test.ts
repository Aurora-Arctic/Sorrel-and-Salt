import { describe, expect, it } from 'vitest';
import { editorValueToMarkdown, markdownToEditorValue } from '@/components/DocumentEditor/markdown';
import { loadDocuments } from '@/db/seed/documents';
import { fromRoot } from '../../support/paths';

// The document editor holds a document as the editor's own value and stores it as markdown, so opening a document and saving it
// unedited must store the markdown it opened: otherwise every save would rewrite text nobody changed, and every published version
// would differ from the last in ways no admin made. Proved over the four shipped documents, which use every construct the
// editor is given: headings, lists, links, emphasis and footnotes.

const documents = loadDocuments(fromRoot('documents'));

/** Every node of the editor value, depth first. */
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
  // Precondition: the four documents, so a pass is not a loop over nothing.
  it('is proved over the four documents', () => {
    expect(documents.map((document) => document.key).sort()).toEqual([
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
});
