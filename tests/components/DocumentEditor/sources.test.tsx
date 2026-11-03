import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/keepers/documents/disclaimer',
}));

const { default: DocumentEditor } = await import('@/components/DocumentEditor');

// The public page heads its footnotes with a Sources heading the markdown does not hold, so the editor draws the same heading.

async function renderEditor(body: string) {
  render(
    <DocumentEditor
      documentId="d1"
      documentKey="disclaimer"
      title="Disclaimer"
      lede="What the site does not promise."
      body={body}
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
