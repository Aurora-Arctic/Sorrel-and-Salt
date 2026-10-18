import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EntryMarks from '@/components/EntryMarks';

// The cupboard's three kinds and what each shows (M8.14;
// claude-docs/components/entry-marks.md). Each mark is asserted by its
// presence in the state that shows it and its absence otherwise: the `output`
// badges by their status role, the Local badge (a plain span) by the count of
// elements in the container.

const statuses = () => screen.queryAllByRole('status');

describe('EntryMarks', () => {
  it("marks a coven's own entry, with no status badge", () => {
    const { container } = render(<EntryMarks kind="own" />);

    expect(container.querySelectorAll('.badge')).toHaveLength(1);
    expect(statuses()).toHaveLength(0);
  });

  it('marks a compendium entry the cupboard holds, one status', () => {
    const { container } = render(<EntryMarks kind="cupboard" />);

    expect(statuses()).toHaveLength(1);
    expect(container.querySelectorAll('.badge')).toHaveLength(1);
  });

  it('adds a second status once the cupboard row overrides a field', () => {
    render(<EntryMarks kind="cupboard" annotated />);

    expect(statuses()).toHaveLength(2);
  });

  it('shows the retired mark in place of the held one, and Annotated beside it', () => {
    const plain = render(<EntryMarks kind="cupboard" retired />);
    expect(statuses()).toHaveLength(1);
    expect(plain.container.querySelector('.badge--retired')).not.toBeNull();
    expect(plain.container.querySelector('.badge--low-stock')).toBeNull();
    plain.unmount();

    const annotated = render(<EntryMarks kind="cupboard" retired annotated />);
    expect(statuses()).toHaveLength(2);
    expect(annotated.container.querySelector('.badge--retired')).not.toBeNull();
  });

  it('shows nothing for a compendium entry the cupboard does not hold', () => {
    const { container } = render(<EntryMarks kind="compendium" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('ignores Annotated outside the cupboard', () => {
    const own = render(<EntryMarks kind="own" annotated />);
    expect(statuses()).toHaveLength(0);
    own.unmount();

    const bare = render(<EntryMarks kind="compendium" annotated />);
    expect(bare.container).toBeEmptyDOMElement();
  });
});
