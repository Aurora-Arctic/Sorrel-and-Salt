import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

// What tests/support/setup-dom.ts declares about the environment, so a change
// of DOM library or a stray edit cannot quietly alter what every dom test sees.
describe('the dom project environment', () => {
  it('names an element across its inline parts as a browser does, with no space inside a word run', () => {
    render(
      <dialog open aria-labelledby="a b">
        <p id="a">
          <span>Edit</span> <span>Ingredient</span>
        </p>
        <h2 id="b">
          <em>Test</em>
          <strong>wort</strong>
        </h2>
      </dialog>,
    );

    expect(screen.getByRole('dialog', { name: 'Edit Ingredient Testwort' })).toBeInTheDocument();
  });

  it('reports reduced motion, the preference that says not to wait for a transition', () => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    expect(window.matchMedia('(min-width: 1px)').matches).toBe(false);
  });
});
