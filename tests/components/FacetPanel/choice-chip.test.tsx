import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChoiceChip, type ChoiceChipProps } from '@/components/FacetPanel/choice-chip';

type Reach = 'wide' | 'middle' | 'narrow';

const OPTIONS: ChoiceChipProps<Reach>['options'] = [
  { value: 'wide', label: 'Wide' },
  { value: 'middle', label: 'Middle' },
  { value: 'narrow', label: 'Narrow' },
];

const renderChip = (more: Partial<ChoiceChipProps<Reach>> = {}) => {
  const onChange = vi.fn();
  render(
    <ChoiceChip<Reach>
      legend="Reach"
      name="reach"
      options={OPTIONS}
      value="wide"
      onChange={onChange}
      {...more}
    />,
  );
  return onChange;
};

const group = () => screen.getByRole('group', { name: 'Reach' });
const radio = (name: string) => within(group()).getByRole('radio', { name });

describe('ChoiceChip as a form field', () => {
  it('leaves a chip given none of the field props as it was: every option open, nothing invalid, no description', () => {
    const onChange = renderChip();
    for (const name of ['Wide', 'Middle', 'Narrow']) {
      expect(radio(name)).toBeEnabled();
      expect(radio(name)).not.toHaveAttribute('aria-invalid');
    }
    expect(group()).not.toHaveAttribute('aria-describedby');
    fireEvent.click(radio('Narrow'));
    expect(onChange).toHaveBeenLastCalledWith('narrow');
  });

  it('holds an option marked disabled, so it cannot be chosen, and leaves the others open', () => {
    const onChange = renderChip({
      options: OPTIONS.map((option) => ({ ...option, disabled: option.value === 'narrow' })),
    });
    // Precondition: the open options still choose, so a silent chip would not pass.
    fireEvent.click(radio('Middle'));
    expect(onChange).toHaveBeenLastCalledWith('middle');
    onChange.mockClear();

    expect(radio('Narrow')).toBeDisabled();
    expect(radio('Wide')).toBeEnabled();
    fireEvent.click(radio('Narrow'));
    expect(onChange).not.toHaveBeenCalled();
    expect(radio('Narrow')).not.toBeChecked();
  });

  it('shows a note and describes the group with it', () => {
    renderChip({ note: 'Who reaches it.' });
    expect(group()).toHaveAccessibleDescription('Who reaches it.');
    for (const name of ['Wide', 'Middle', 'Narrow']) {
      expect(radio(name)).not.toHaveAttribute('aria-invalid');
    }
  });

  it('shows an error, describes the group with it and marks the choices invalid', () => {
    renderChip({ error: 'Too wide for its guide.' });
    expect(group()).toHaveAccessibleDescription('Error: Too wide for its guide.');
    expect(group()).toHaveAttribute('aria-invalid', 'true');
    for (const name of ['Wide', 'Middle', 'Narrow']) {
      expect(radio(name)).toHaveAttribute('aria-invalid', 'true');
    }
  });

  it('describes the group with the note and the error together', () => {
    renderChip({ note: 'Who reaches it.', error: 'Too wide for its guide.' });
    expect(group()).toHaveAccessibleDescription('Who reaches it. Error: Too wide for its guide.');
  });

  it('keeps the note and the error on a held chip, which offers no choice', () => {
    renderChip({ disabled: true, note: 'Who reaches it.', error: 'Too wide for its guide.' });
    expect(within(group()).queryAllByRole('radio')).toHaveLength(0);
    expect(group()).toHaveAccessibleDescription('Who reaches it. Error: Too wide for its guide.');
    expect(group()).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('ChoiceChip without a spacer', () => {
  // The spacer is an empty line that stands in for a neighbouring field's label.
  const SPACER = '​';

  it('draws the spacer line by default, so the chip starts level with a labelled field beside it', () => {
    renderChip();
    expect(screen.getByText(SPACER)).toHaveAttribute('aria-hidden', 'true');
  });

  it('leaves the spacer out when asked, and the group keeps its name and its choices', () => {
    const onChange = renderChip({ spacer: false });
    expect(screen.queryByText(SPACER)).not.toBeInTheDocument();
    fireEvent.click(radio('Narrow'));
    expect(onChange).toHaveBeenLastCalledWith('narrow');
  });
});
