import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SwitchField } from '@/components/Field';

// A native checkbox flips on Space alone, and Enter only submits the form
// around it, so a keyboard user pressing Enter on a switch got nothing
// (MB.261). Every SwitchField turns on Enter as a click does.

function renderSwitch(onChange = vi.fn(), onSubmit = vi.fn()) {
  render(
    <form onSubmit={onSubmit}>
      <SwitchField label="No Refs" name="withoutReferences" value="1" onChange={onChange} />
    </form>,
  );
  return { onChange, onSubmit, toggle: screen.getByRole('switch', { name: 'No Refs' }) };
}

describe('SwitchField', () => {
  it('turns on when Enter is pressed on it, and off on the next press', () => {
    const { onChange, toggle } = renderSwitch();

    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(toggle).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith(true);

    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(toggle).not.toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('keeps Enter from also submitting the form around it', () => {
    const { toggle } = renderSwitch();

    // `fireEvent` returns false when the page cancelled the key's default,
    // which is what the browser would otherwise turn into a form submit.
    expect(fireEvent.keyDown(toggle, { key: 'Enter' })).toBe(false);
  });

  it('leaves other keys to the platform', () => {
    const { onChange, toggle } = renderSwitch();

    expect(fireEvent.keyDown(toggle, { key: ' ' })).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('is described by its hint, when it has one, and by nothing when it has none', () => {
    render(
      <>
        <SwitchField
          label="Toxic"
          name="toxic"
          value="1"
          onChange={vi.fn()}
          hint="What it is for."
        />
        <SwitchField label="No Refs" name="x" value="1" onChange={vi.fn()} />
      </>,
    );

    expect(screen.getByRole('switch', { name: 'Toxic' })).toHaveAccessibleDescription();
    expect(screen.getByRole('switch', { name: 'No Refs' })).not.toHaveAccessibleDescription();
  });

  // A note is a line under the toggle saying what its state means (M10.13), read with it.
  it('is described by its note, which shows under it', () => {
    render(
      <SwitchField
        label="Share With the Coven"
        name="x"
        value="1"
        onChange={vi.fn()}
        note="Only you can see it."
      />,
    );

    expect(screen.getByText('Only you can see it.')).toBeVisible();
    expect(
      screen.getByRole('switch', { name: 'Share With the Coven' }),
    ).toHaveAccessibleDescription('Only you can see it.');
  });

  it('does not turn while disabled', () => {
    const onChange = vi.fn();
    render(<SwitchField label="No Refs" name="x" value="1" onChange={onChange} disabled />);

    fireEvent.keyDown(screen.getByRole('switch'), { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });
});
