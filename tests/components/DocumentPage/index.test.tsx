import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DocumentPage from '@/components/DocumentPage';

// The public document page (claude-docs/components/document-page.md): a heading, the date the text was
// last changed, and the document's own sections beneath, with nothing read from a session.

describe('DocumentPage', () => {
  it('heads the document with its title and says when it was last updated, as a dated time', () => {
    render(
      <DocumentPage title="Fixture Policy" updatedOn={new Date('2026-03-04T00:00:00Z')}>
        <h2>Fixture Section</h2>
      </DocumentPage>,
    );
    const article = screen.getByRole('article', { name: 'Fixture Policy' });
    expect(within(article).getByRole('heading', { level: 1, name: 'Fixture Policy' })).toBeTruthy();
    const updated = within(article).getByText(/last updated/i);
    const time = within(updated).getByText('4 March 2026');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', '2026-03-04');
    expect(
      within(article).getByRole('heading', { level: 2, name: 'Fixture Section' }),
    ).toBeTruthy();
  });

  it('shows the lede under the heading when the document has one', () => {
    render(
      <DocumentPage
        title="Fixture Policy"
        lede="What the fixture keeps."
        updatedOn={new Date('2026-03-04T00:00:00Z')}
      >
        <p>Body.</p>
      </DocumentPage>,
    );
    expect(screen.getByText('What the fixture keeps.')).toBeTruthy();
  });
});
