import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SpellCardFrame } from '@/components/SpellCard/frame';

describe('SpellCardFrame', () => {
  it('holds what it is given in a card, with no link or heading of its own', () => {
    render(
      <SpellCardFrame>
        <p>Placeholder</p>
      </SpellCardFrame>,
    );
    expect(screen.getByRole('article')).toHaveTextContent('Placeholder');
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('names the card by the heading it is told', () => {
    render(
      <SpellCardFrame labelledBy="t">
        <h2 id="t">Testing Charm</h2>
      </SpellCardFrame>,
    );
    expect(screen.getByRole('article', { name: 'Testing Charm' })).toBeInTheDocument();
  });
});
