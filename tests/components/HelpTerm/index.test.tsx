import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HelpTerm from '@/components/HelpTerm';

// claude-docs/components/help-pages.md, "Glossary marks"

function renderTerm() {
  render(
    <p>
      A{' '}
      <HelpTerm
        slug="steward"
        title="Steward"
        definition="Runs a fixture coven."
        shown="Stewards"
      />{' '}
      meet.
    </p>,
  );
  return screen.getByRole('link', { name: 'Stewards' });
}

describe('HelpTerm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('links the shown text to the term in the glossary', () => {
    expect(renderTerm()).toHaveAttribute('href', '/help/glossary#steward');
  });

  it('starts closed, its tooltip describing the link', () => {
    const link = renderTerm();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(link).toHaveAccessibleDescription('Steward Runs a fixture coven.');
  });

  it('opens on hover only after 300ms, and shows the title and definition', () => {
    const link = renderTerm();

    fireEvent.mouseEnter(link);
    act(() => vi.advanceTimersByTime(299));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));

    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Steward');
    expect(tip).toHaveTextContent('Runs a fixture coven.');
  });

  it('stays open while the pointer moves onto the tooltip, and closes once it leaves', () => {
    const link = renderTerm();
    fireEvent.mouseEnter(link);
    act(() => vi.advanceTimersByTime(300));

    fireEvent.mouseLeave(link);
    fireEvent.mouseEnter(screen.getByRole('tooltip'));
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByRole('tooltip'));
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('opens at once on focus and on a tap, and closes on blur', () => {
    const link = renderTerm();

    act(() => link.focus());
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    act(() => link.blur());
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.click(link);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const link = renderTerm();
    act(() => link.focus());
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
