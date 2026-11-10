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

async function renderEditor(documentKey: string) {
  render(
    <DocumentEditor
      documentId="d1"
      documentKey={documentKey}
      title="Fixture Document"
      lede="What the fixture says."
      body="Fixturewort grows here."
      publishedBody="Fixturewort grows here."
      revision={null}
      nextNumber={2}
    />,
  );
  await screen.findByRole('textbox', { name: 'Document Text' });
}

describe('the editor’s version line', () => {
  it('says which version is showing for a document with public versions', async () => {
    await renderEditor('disclaimer');

    expect(screen.getByText('Showing version 1.')).toBeTruthy();
  });

  it('says nothing of a version for About Us, which has no public version pages', async () => {
    await renderEditor('about');

    // Precondition: the editor drew, with its save controls beside where the line would be.
    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeTruthy();
    expect(screen.queryByText(/showing version/i)).toBeNull();
  });
});
