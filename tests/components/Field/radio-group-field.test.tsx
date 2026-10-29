import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it("keeps the group's note as its description", () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'Icon' })).toHaveAccessibleDescription();
  });

  // Each segment's name, shown above it on hover and on its radio's focus,
  // for a sighted person who cannot tell the icons apart.
  // Decoration: the radio's own name already says it, so the tip
  // is kept out of the accessibility tree, and found with `hidden`.
  it('opens the name tip of the segment pointed at, and no other', async () => {
    render(<Harness />);
    const tip = () => screen.queryByRole('tooltip', { hidden: true });
    const segment = (name: string) => screen.getByRole('radio', { name }).closest('label')!;
    expect(tip()).toBeNull();

    fireEvent.mouseEnter(segment('Mineral'));
    await waitFor(() => expect(tip()).not.toBeNull());
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

// The text layout: Match and Toxic on the compendium filter. The same
// native radios, each segment its name in text and, where the caller knows
// it, how many entries choosing it would leave.
describe('RadioGroupField, segmented', () => {
  function Segmented({ counts = true }: { counts?: boolean }) {
    const [value, setValue] = useState('any');
    return (
      <RadioGroupField<string>
        legend="Toxic"
        name="toxic"
        layout="segmented"
        value={value}
        onChange={setValue}
        options={[
          { value: 'any', label: 'Any' },
          { value: 'toxic', label: 'Toxic', count: counts ? 4 : undefined },
          { value: 'not-toxic', label: 'Not Toxic', count: counts ? 8 : undefined },
        ]}
      />
    );
  }

  it('offers native radios named by their text, the count read with the name', () => {
    render(<Segmented />);

    const group = screen.getByRole('group', { name: 'Toxic' });
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
    expect(within(group).getByRole('radio', { name: 'Any' })).toBeChecked();
    expect(within(group).getByRole('radio', { name: 'Toxic 4' })).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: 'Not Toxic 8' })).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: 'Any' })).toHaveAttribute('name', 'toxic');
  });

  it('names a segment by its label alone when it has no count', () => {
    render(<Segmented counts={false} />);

    expect(screen.getByRole('radio', { name: 'Toxic' })).toBeInTheDocument();
  });
});
