import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EntryMarks from '@/components/EntryMarks';

// The cupboard's three kinds and what each shows (M8.14;
// claude-docs/components/entry-marks.md). Each mark is found by its exact
// text and asserted by presence or absence; the `output` badges also by the
// count of `status` roles. What the words say is never asserted.

const statuses = () => screen.queryAllByRole('status');
const local = () => screen.queryByText('Local', { exact: true });
const held = () => screen.queryByText('From the Compendium', { exact: true });
const annotated = () => screen.queryByText('Annotated', { exact: true });
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

  it('adds a second status once the cupboard row overrides a field', () => {
    render(<EntryMarks kind="cupboard" annotated />);

    expect(held()).toBeInTheDocument();
    expect(annotated()).toBeInTheDocument();
    expect(statuses()).toHaveLength(2);
  });

  it('shows the retired mark in place of the held one, and Annotated beside it', () => {
    const plain = render(<EntryMarks kind="cupboard" retired />);
    expect(statuses()).toHaveLength(0);
    expect(retired()).toBeInTheDocument();
    expect(held()).toBeNull();
    plain.unmount();

    render(<EntryMarks kind="cupboard" retired annotated />);
    expect(statuses()).toHaveLength(1);
    expect(retired()).toBeInTheDocument();
    expect(annotated()).toBeInTheDocument();
  });

  it('opens its tip on focus, describes the button by it, and closes it on blur', () => {
    render(<EntryMarks kind="cupboard" retired />);
    const button = retired() as HTMLElement;
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.focus(button);
    const tip = screen.getByRole('tooltip');
    expect(button).toHaveAccessibleDescription(tip.textContent ?? '');

    fireEvent.blur(button);
    expect(screen.queryByRole('tooltip')).toBeNull();
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
