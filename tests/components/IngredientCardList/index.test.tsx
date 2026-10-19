import type { Route } from 'next';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import IngredientCard from '@/components/IngredientCard';
import IngredientCardList from '@/components/IngredientCardList';
import ListFrame, { ListBody, ListNavigationContext } from '@/components/ListFrame';

// The frame reads the App Router; Vitest hoists the mock above the imports.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// M8.14: the grid of cards the compendium and the Ingredients page share. Layout
// is the stylesheet's; this holds what a reader gets: a named list, a card per item.

const card = (label: string, slug: string) => (
  <IngredientCard
    key={slug}
    href={`/compendium/ingredients/${slug}` as Route}
    label={label}
    kind="compendium"
  />
);

describe('IngredientCardList', () => {
  it('is a named list holding one card per item', () => {
    render(
      <IngredientCardList label="Ingredients">
        {card('Fixture Testwort', 'testwort')}
        {card('Fixture Testroot', 'testroot')}
      </IngredientCardList>,
    );
    const list = screen.getByRole('list', { name: 'Ingredients' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByRole('link', { name: 'Fixture Testwort' })).toBeTruthy();
    expect(within(items[1]!).getByRole('link', { name: 'Fixture Testroot' })).toBeTruthy();
  });

  it('draws no items for no cards', () => {
    render(<IngredientCardList label="Ingredients">{[]}</IngredientCardList>);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});

describe('IngredientCardList density', () => {
  it('states the regular density unless told compact', () => {
    const { rerender } = render(
      <IngredientCardList label="Ingredients">
        {card('Fixture Testwort', 'testwort')}
      </IngredientCardList>,
    );
    expect(screen.getByRole('list', { name: 'Ingredients' }).getAttribute('data-density')).toBe(
      'regular',
    );

    rerender(
      <IngredientCardList label="Ingredients" density="compact">
        {card('Fixture Testwort', 'testwort')}
      </IngredientCardList>,
    );
    expect(screen.getByRole('list', { name: 'Ingredients' }).getAttribute('data-density')).toBe(
      'compact',
    );
  });
});

describe('ListBody with the cards shape', () => {
  it('shows the loading status, and not the content, while a page is on its way', () => {
    render(
      <ListNavigationContext.Provider value={{ pending: true, go: () => undefined }}>
        <ListFrame>
          <ListBody shape="cards">
            <p>Fixture content</p>
          </ListBody>
        </ListFrame>
      </ListNavigationContext.Provider>,
    );
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByText('Fixture content')).toBeNull();
  });
});
