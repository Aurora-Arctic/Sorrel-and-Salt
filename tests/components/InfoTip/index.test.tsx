import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InfoTip from '@/components/InfoTip';

// A field's hint, tucked behind an ⓘ beside its label: shown on hover, focus
// or a tap, and dismissible with Escape (WCAG 1.4.13)
// (claude-docs/components/info-tip.md).

const TEXT = 'What this coven calls it.';

function renderTip() {
  render(
    <>
      <InfoTip id="name-tip" label="Name">
        {TEXT}
      </InfoTip>
      <input id="name-control" aria-label="Name" aria-describedby="name-tip" />
    </>,
  );
  return screen.getByRole('button', { name: 'About Name' });
}

describe('InfoTip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts closed, its text still describing the button and the field that names it', () => {
    const button = renderTip();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(button).toHaveAccessibleDescription(TEXT);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription(TEXT);
  });

  it('opens on hover and closes a moment after the pointer leaves', () => {
    const button = renderTip();

    fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent(TEXT);

    fireEvent.mouseLeave(button);
    // Long enough to cross from the button onto the tip without it closing.
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('stays open while the pointer is over the tip itself', () => {
    const button = renderTip();

    fireEvent.mouseEnter(button);
    const tip = screen.getByRole('tooltip');
    fireEvent.mouseLeave(button);
    fireEvent.mouseEnter(tip);
    act(() => vi.advanceTimersByTime(200));

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('opens on focus and closes on blur', () => {
    const button = renderTip();

    act(() => button.focus());
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    act(() => button.blur());
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('stays shut while the field it describes has focus', () => {
    renderTip();
    const field = screen.getByRole('textbox', { name: 'Name' });

    act(() => field.focus());

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(field).toHaveAccessibleDescription(TEXT);
  });

  it('opens on a tap, and a second tap leaves it open', () => {
    const button = renderTip();

    fireEvent.click(button);
    fireEvent.click(button);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('closes on Escape, wherever the focus is', () => {
    const button = renderTip();

    fireEvent.mouseEnter(button);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
