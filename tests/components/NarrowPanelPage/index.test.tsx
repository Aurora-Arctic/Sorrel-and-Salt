import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NarrowPanelPage from '@/components/NarrowPanelPage';

// A page of one form on a panel in the narrow frame, under the page's own heading: what Create Coven and the paused
// coven page draw, and their skeletons draw too, so a skeleton's heading lands where the page's does.

describe('NarrowPanelPage', () => {
  it('is the page’s main landmark, holding its level-one heading and its body', () => {
    render(
      <NarrowPanelPage title="Create Coven" lede="Start a coven of your own.">
        <p>Form</p>
      </NarrowPanelPage>,
    );
    const main = screen.getByRole('main');
    expect(
      within(main).getByRole('heading', { level: 1, name: 'Create Coven' }),
    ).toBeInTheDocument();
    expect(within(main).getByText('Start a coven of your own.')).toBeInTheDocument();
    expect(within(main).getByText('Form')).toBeInTheDocument();
  });

  it('adds no landmark of its own where a layout already holds the main one', () => {
    render(
      <NarrowPanelPage as="div" title="Create Coven">
        <p>Form</p>
      </NarrowPanelPage>,
    );
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Create Coven' })).toBeInTheDocument();
  });

  it('draws the context row above the page, outside its frame, when given one', () => {
    render(
      <NarrowPanelPage title="Create Coven" contextRow={<nav aria-label="Covens" />}>
        <p>Form</p>
      </NarrowPanelPage>,
    );
    const row = screen.getByRole('navigation', { name: 'Covens' });
    expect(screen.getByRole('main')).not.toContainElement(row);
    expect(row.compareDocumentPosition(screen.getByRole('main'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('draws no context row when given none', () => {
    render(
      <NarrowPanelPage title="Create Coven">
        <p>Form</p>
      </NarrowPanelPage>,
    );
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
