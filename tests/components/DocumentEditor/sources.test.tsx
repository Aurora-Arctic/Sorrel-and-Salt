import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { warmImport } from '../../support/warm-import';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/keepers/documents/disclaimer',
}));

const { default: DocumentEditor } = await import('@/components/DocumentEditor');

// The editor is a lazy chunk: its first import is slow under coverage and would overrun findByRole's 1 s wait.
warmImport(() => import('@/components/DocumentEditor/editor'));

async function renderEditor(body: string) {
  render(
    <DocumentEditor
      documentId="d1"
      documentKey="disclaimer"
      title="Disclaimer"
      lede="What the site does not promise."
      body={body}
      publishedBody={body}
      revision={null}
      nextNumber={2}
    />,
  );
  await screen.findByRole('textbox', { name: 'Document Text' });
}

describe('the editor’s Sources heading', () => {
  it('heads the footnotes once, however many there are', async () => {
    await renderEditor(
      'Fixturewort grows here.[^1] Testwort grows there.[^2]\n\n[^1]: A cited source.\n\n[^2]: Another source.',
    );

    expect(screen.getAllByRole('heading', { name: 'Sources' })).toHaveLength(1);
  });

  it('is absent from a document with no footnotes', async () => {
    await renderEditor('Fixturewort grows here.');

    expect(screen.queryByRole('heading', { name: 'Sources' })).toBeNull();
  });
});
