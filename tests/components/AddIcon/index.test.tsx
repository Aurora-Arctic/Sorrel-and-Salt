import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import AddIcon from '@/components/AddIcon';
import { HeldMark } from '@/components/CompendiumCards/held-mark';
import { StatusRegionProvider } from '@/components/ClickFeedback/status-region';
import { makeQueryClient } from '@/lib/graphql-client';

// The plus and the held check carry the entry's name in their accessible names (MB.120), so a
// screen reader's list of buttons tells one card's plus from the next, as the pencil and the
// three dots beside them already do. The tip a sighted viewer reads stays short, and begins the
// name, so the words on screen are the words to say (WCAG 2.5.3, Label in Name).
// claude-docs/components/add-icon.md, "Its name".

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const ONE = { id: '00000000-0000-4000-8000-000000000001', name: 'Fixture Coven One' };
const TWO = { id: '00000000-0000-4000-8000-000000000002', name: 'Fixture Coven Two' };
const NAME = 'Testwort, Formalis testis';

const Plus = ({ covens }: { covens: (typeof ONE)[] }): ReactElement => (
  <StatusRegionProvider>
    <QueryClientProvider client={makeQueryClient()}>
      <AddIcon
        name={NAME}
        workspaceId={ONE.id}
        ingredientId="fixture-testwort-id"
        covens={covens}
        heldIn={[TWO.id]}
      />
    </QueryClientProvider>
  </StatusRegionProvider>
);

/** The tip opened at the control's focus: in the page, kept from the accessibility tree. */
function tipOf(control: HTMLElement): string | null {
  fireEvent.focus(control);
  return screen.queryByRole('tooltip', { hidden: true })?.textContent ?? null;
}

describe('the plus names its entry', () => {
  it('names and tips the lone plus by its entry', () => {
    render(<Plus covens={[ONE]} />);
    const plus = screen.getByRole('button', { name: `Add to My Ingredients: ${NAME}` });
    expect(tipOf(plus)).toBe(`Add to My Ingredients: ${NAME}`);
  });

  it("names and tips the menu's plus by its entry", () => {
    render(<Plus covens={[ONE, TWO]} />);
    const plus = screen.getByRole('button', { name: `Add to My Ingredients: ${NAME}` });
    expect(tipOf(plus)).toBe(`Add to My Ingredients: ${NAME}`);
  });

  it('names its menu by the entry, and marks a held coven in its cupboard', () => {
    render(<Plus covens={[ONE, TWO]} />);
    fireEvent.click(screen.getByRole('button', { name: `Add to My Ingredients: ${NAME}` }));
    const menu = screen.getByRole('menu', { name: `Add to My Ingredients: ${NAME}` });
    expect(
      within(menu).getByRole('menuitem', { name: `${TWO.name}, in its cupboard` }),
    ).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('the held check names its entry', () => {
  it('is named and tipped In Every Cupboard and the entry', () => {
    render(<HeldMark name={NAME} />);
    const check = screen.getByRole('button', { name: `In Every Cupboard: ${NAME}` });
    expect(tipOf(check)).toBe(`In Every Cupboard: ${NAME}`);
  });
});
