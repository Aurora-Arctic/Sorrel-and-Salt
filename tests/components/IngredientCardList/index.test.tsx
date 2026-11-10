import type { Route } from 'next';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IngredientCard from '@/components/IngredientCard';
import IngredientCardList from '@/components/IngredientCardList';

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
