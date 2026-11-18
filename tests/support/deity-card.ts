import { act, screen, within } from '@testing-library/react';
import { expect } from 'vitest';
import type { DeityDetail } from '@/modules/ingredients';
import { expectBefore } from './interact';

// Every name is invented (CLAUDE.md, Testing).

/** A deity with a tradition and other names: the one an ingredient's Deities row draws as a control. */
export const NAMED_DEITY: DeityDetail = {
  name: 'Fixtura',
  tradition: 'Fixture Pantheon',
  otherNames: ['Fixtra', 'Testura'],
};

/** The Deities row's value. */
export function deitiesRow(): HTMLElement {
  const term = screen.getAllByRole('term').find((found) => found.textContent === 'Deities')!;
  const definition = term.nextElementSibling as HTMLElement;
  expect(definition).toHaveRole('definition');
  return definition;
}

/** Its control, named by its name and tradition alone. */
export const namedDeityButton = (): HTMLElement =>
  screen.getByRole('button', { name: 'Fixtura (Fixture Pantheon)' });

/** Opens the deity's card and checks it holds the tradition, the name and each other name, and no Given By. */
export function expectNamedDeityCard(): void {
  const control = namedDeityButton();
  expect(screen.queryByRole('tooltip')).toBeNull();

  act(() => control.focus());

  const tip = screen.getByRole('tooltip');
  expectBefore(within(tip).getByText('Fixture Pantheon'), within(tip).getByText('Fixtura'));
  expect(
    within(within(tip).getByRole('list', { name: 'Also Called' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent),
  ).toEqual(['Fixtra', 'Testura']);
  expect(within(tip).queryByRole('list', { name: 'Given By' })).toBeNull();
}
