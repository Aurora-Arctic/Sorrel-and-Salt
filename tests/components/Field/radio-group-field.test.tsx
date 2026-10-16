import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { RadioGroupField } from '@/components/Field';
import FormIcon from '@/components/FormIcon';

// The strip layout of the radio group: the same native radios, drawn as one bar of icons.

function Harness() {
  const [value, setValue] = useState('');
  return (
    <RadioGroupField<string>
      legend="Icon"
      name="icon"
      layout="strip"
      value={value}
      onChange={setValue}
      note="Drawn beside each form."
      options={[
        { value: 'mineral', label: 'Mineral', icon: <FormIcon name="mineral" /> },
        { value: '', label: 'None', icon: <FormIcon name={null} /> },
      ]}
    />
  );
}

describe('RadioGroupField, strip', () => {
  it('offers native radios by name, the chosen one checked, and changes on a click', () => {
    render(<Harness />);

    const group = screen.getByRole('group', { name: 'Icon' });
    expect(within(group).getAllByRole('radio')).toHaveLength(2);
    expect(within(group).getByRole('radio', { name: 'None' })).toBeChecked();

    fireEvent.click(within(group).getByRole('radio', { name: 'Mineral' }));

    expect(within(group).getByRole('radio', { name: 'Mineral' })).toBeChecked();
    expect(within(group).getByRole('radio', { name: 'None' })).not.toBeChecked();
  });

  it("draws each segment's icon, outside the radio's name, and keeps the group's note", () => {
    render(<Harness />);

    const mark = screen
      .getByRole('radio', { name: 'Mineral' })
      .closest('label')!
      .querySelector('svg')!;
    expect(mark.innerHTML).toBe(
      render(<FormIcon name="mineral" />).container.querySelector('svg')!.innerHTML,
    );
    expect(screen.getByRole('group', { name: 'Icon' })).toHaveAccessibleDescription();
  });

  it('prints the chosen name beneath the bar, following the choice', () => {
    const { container } = render(<Harness />);
    const chosen = () => container.querySelector('.radio-strip__chosen')?.textContent;

    expect(chosen()).toBe('None');
    fireEvent.click(screen.getByRole('radio', { name: 'Mineral' }));
    expect(chosen()).toBe('Mineral');
  });

  // Each segment's name, shown above it on hover and on its radio's focus,
  // for a sighted person who cannot tell the icons apart (the owner's call,
  // 2026-10-16). Decoration: the radio's own name already says it, so the tip
  // is kept out of the accessibility tree, and found with `hidden`.
  it('opens the name tip of the segment pointed at, and no other', () => {
    render(<Harness />);
    const tip = () => screen.queryByRole('tooltip', { hidden: true });
    const segment = (name: string) => screen.getByRole('radio', { name }).closest('label')!;
    expect(tip()).toBeNull();

    fireEvent.mouseEnter(segment('Mineral'));
    expect(segment('Mineral').parentElement).toContainElement(tip());
    expect(segment('None').parentElement).not.toContainElement(tip());
  });

  it("opens the focused segment's tip and keeps the radio's own name", () => {
    render(<Harness />);
    const none = screen.getByRole('radio', { name: 'None' });

    act(() => none.focus());

    expect(none.closest('label')!.parentElement).toContainElement(
      screen.getByRole('tooltip', { hidden: true }),
    );
    expect(none).toHaveAccessibleName('None');
  });
});
