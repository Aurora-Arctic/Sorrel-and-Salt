import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EntryMarks, { RecencyMark } from '@/components/EntryMarks';

// The cupboard's three kinds and what each shows (
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

  // Annotated wins: it already says the entry is the
  // Compendium's, so the two never show together. The test above is the precondition:
  // held and unannotated, the same entry shows Compendium.
  it('shows Annotated alone, without Compendium, once the cupboard row overrides a field', () => {
    render(<EntryMarks kind="cupboard" annotated />);

    expect(annotated()).toBeInTheDocument();
    expect(held()).toBeNull();
    expect(statuses()).toHaveLength(0);
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

  // The card's switch: Compendium and Annotated
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

// Green first, red last, on every badge row:
// EntryMarks draws the whole row, the safety mark included, so the order
// holds in one place. Asserted by document order, never by class or copy.
describe('EntryMarks badge order', () => {
  const precedes = (first: Element | null, second: Element | null): boolean =>
    first !== null &&
    second !== null &&
    Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
  const caution = () => screen.queryByText('Caution', { exact: true });
  const toxic = () => screen.queryByText('Toxic', { exact: true });

  it('draws a green mark first, ahead of a neutral one built before it', () => {
    render(<EntryMarks kind="cupboard" retired annotated />);

    expect(precedes(annotated(), retired())).toBe(true);
  });

  it('draws Local ahead of the safety mark', () => {
    render(<EntryMarks kind="own" toxic />);
    expect(precedes(local(), toxic())).toBe(true);
  });

  it('draws the safety mark last', () => {
    render(<EntryMarks kind="cupboard" retired annotated safetyNotes="Fixture caution." />);

    for (const mark of [annotated(), retired()]) {
      expect(precedes(mark, caution())).toBe(true);
    }
  });

  it('leaves the safety mark to its caller when told to', () => {
    render(<EntryMarks kind="own" safety={false} toxic safetyNotes="Fixture caution." />);

    expect(local()).toBeInTheDocument();
    expect(toxic()).toBeNull();
    expect(caution()).toBeNull();
  });

  // New or Updated comes before every badge, in reading order and on screen,
  // whichever row it shares with them.
  it('draws New or Updated ahead of every badge', () => {
    render(
      <EntryMarks kind="own" retired recency="updated" safetyNotes="Fixture entry caution." />,
    );
    const updated = screen.getByText('Updated', { exact: true });

    for (const badge of [local(), retired(), caution()]) {
      expect(precedes(updated, badge)).toBe(true);
    }
  });

  it('draws no recency mark without one', () => {
    render(<EntryMarks kind="own" />);

    expect(screen.queryByText(/^(New|Updated)$/)).toBeNull();
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

// The curators' review mark, shown to everyone: the
// date for a reviewed entry, Needs Review for one not; never who reviewed it, which the
// component is not given. A coven's own entry has none; nobody reviews those.
describe('the review mark', () => {
  const AT = '2026-10-01T09:30:00.000Z';
  const reviewed = () => screen.queryByText(/Reviewed By Curator/);
  const needsReview = () => screen.queryByText('Needs Review', { exact: true });

  it('says a reviewed compendium entry is, and on what day', () => {
    render(<EntryMarks kind="compendium" reviewedAt={AT} />);

    expect(reviewed()?.querySelector('time')).toHaveAttribute('datetime', AT);
    expect(needsReview()).toBeNull();
  });

  it('says an unreviewed compendium entry needs review', () => {
    render(<EntryMarks kind="compendium" reviewedAt={null} />);

    expect(needsReview()).toBeInTheDocument();
    expect(reviewed()).toBeNull();
  });

  it('is drawn on an entry a cupboard holds, beside Compendium', () => {
    render(<EntryMarks kind="cupboard" reviewedAt={AT} />);

    expect(reviewed()).toBeInTheDocument();
    expect(held()).toBeInTheDocument();
  });

  it("is never drawn on a coven's own entry, even handed a date", () => {
    render(<EntryMarks kind="own" reviewedAt={AT} />);

    expect(local()).toBeInTheDocument();
    expect(reviewed()).toBeNull();
    expect(needsReview()).toBeNull();
  });

  it('is left out when the caller does not say', () => {
    render(<EntryMarks kind="compendium" />);

    expect(statuses()).toHaveLength(0);
  });
});
