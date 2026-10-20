import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EntryMarks, { RecencyMark } from '@/components/EntryMarks';

// The cupboard's three kinds and what each shows (M8.14;
// claude-docs/components/entry-marks.md). Each mark is found by its exact
// text and asserted by presence or absence; the `output` badges also by the
// count of `status` roles. What the words say is never asserted.

const statuses = () => screen.queryAllByRole('status');
const local = () => screen.queryByText('Local', { exact: true });
const held = () => screen.queryByText('Compendium', { exact: true });
const annotated = () => screen.queryByRole('button', { name: 'Annotated' });
const retired = () => screen.queryByRole('button', { name: 'Retired' });

describe('EntryMarks', () => {
  it("marks a coven's own entry, with no status badge", () => {
    render(<EntryMarks kind="own" />);

    expect(local()).toBeInTheDocument();
    expect(statuses()).toHaveLength(0);
  });

  it('marks a compendium entry the cupboard holds, one status', () => {
    render(<EntryMarks kind="cupboard" />);

    expect(held()).toBeInTheDocument();
    expect(statuses()).toHaveLength(1);
    expect(local()).toBeNull();
    expect(annotated()).toBeNull();
  });

  it('shows Annotated beside Compendium once the cupboard row overrides a field', () => {
    render(<EntryMarks kind="cupboard" annotated />);

    expect(annotated()).toBeInTheDocument();
    expect(held()).toBeInTheDocument();
    expect(statuses()).toHaveLength(1);
  });

  it('marks a compendium entry the cupboard does not hold when read in a coven', () => {
    render(<EntryMarks kind="compendium" inCoven />);

    expect(held()).toBeInTheDocument();
    expect(statuses()).toHaveLength(1);
    expect(annotated()).toBeNull();
  });

  it('shows the retired mark in place of the held one, and Annotated beside it, each a button', () => {
    const plain = render(<EntryMarks kind="cupboard" retired />);
    expect(statuses()).toHaveLength(0);
    expect(retired()).toBeInTheDocument();
    expect(held()).toBeNull();
    plain.unmount();

    render(<EntryMarks kind="cupboard" retired annotated />);
    expect(statuses()).toHaveLength(0);
    expect(held()).toBeNull();
    expect(retired()).toBeInTheDocument();
    expect(annotated()).toBeInTheDocument();
  });

  it.each([
    ['Retired', { retired: true }],
    ['Annotated', { annotated: true }],
  ])(
    'opens the %s tip on focus, describes the button by it, and closes it on blur',
    (name, flags) => {
      render(<EntryMarks kind="cupboard" {...flags} />);
      const button = screen.getByRole('button', { name });
      expect(screen.queryByRole('tooltip')).toBeNull();

      fireEvent.focus(button);
      const tip = screen.getByRole('tooltip');
      expect(button).toHaveAccessibleDescription(tip.textContent ?? '');

      fireEvent.blur(button);
      expect(screen.queryByRole('tooltip')).toBeNull();
    },
  );

  // The card's switch (the owner's call, 2026-10-20): Compendium and Annotated
  // say where a held entry came from, which the entry page says and a card does not.
  it('leaves Compendium and Annotated off without provenance, keeping Local and Retired', () => {
    const card = render(<EntryMarks kind="cupboard" annotated provenance={false} />);
    expect(held()).toBeNull();
    expect(annotated()).toBeNull();
    expect(card.container).toBeEmptyDOMElement();
    card.unmount();

    const retiredCard = render(<EntryMarks kind="cupboard" retired annotated provenance={false} />);
    expect(retired()).toBeInTheDocument();
    expect(annotated()).toBeNull();
    retiredCard.unmount();

    render(<EntryMarks kind="own" provenance={false} />);
    expect(local()).toBeInTheDocument();
  });

  it('shows nothing for a compendium entry the cupboard does not hold', () => {
    const { container } = render(<EntryMarks kind="compendium" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('ignores Annotated outside the cupboard', () => {
    const own = render(<EntryMarks kind="own" annotated />);
    expect(statuses()).toHaveLength(0);
    expect(annotated()).toBeNull();
    own.unmount();

    const bare = render(<EntryMarks kind="compendium" annotated />);
    expect(bare.container).toBeEmptyDOMElement();
  });
});

describe('RecencyMark (MB.106)', () => {
  it.each([
    ['new', 'New', 'Updated'],
    ['updated', 'Updated', 'New'],
  ] as const)('shows %s as text, and not the other', (recency, shown, other) => {
    render(<RecencyMark recency={recency} />);

    expect(screen.getByText(shown, { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(other, { exact: true })).toBeNull();
  });

  it('hides its drawing from assistive technology', () => {
    const { container } = render(<RecencyMark recency="new" />);

    for (const drawing of container.querySelectorAll('svg')) {
      expect(drawing).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('shows neither once the 30 days have passed', () => {
    const { container } = render(<RecencyMark recency={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});

it('EntryMarks no longer draws New or Updated: the marker is its own component', () => {
  render(<EntryMarks kind="cupboard" />);

  expect(screen.queryByText('New', { exact: true })).toBeNull();
  expect(screen.queryByText('Updated', { exact: true })).toBeNull();
});
