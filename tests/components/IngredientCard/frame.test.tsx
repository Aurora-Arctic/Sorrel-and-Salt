import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IngredientCardFrame } from '@/components/IngredientCard/frame';

describe('IngredientCardFrame', () => {
  it('holds what it is given in a card, with no link or heading of its own', () => {
    render(
      <IngredientCardFrame>
        <p>Placeholder</p>
      </IngredientCardFrame>,
    );
    expect(screen.getByRole('article')).toHaveTextContent('Placeholder');
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
