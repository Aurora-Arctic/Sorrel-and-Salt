import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PrintButton from '@/components/SpellRecipe/print-button';
import { press } from '../../support/interact';

// Print Spell on the recipe page: a labelled button that opens the print dialog.

describe('PrintButton', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('opens the print dialog when pressed', () => {
    // jsdom has no `window.print`.
    const print = vi.fn();
    vi.stubGlobal('print', print);
    render(<PrintButton />);
    expect(print).not.toHaveBeenCalled();
    press(screen.getByRole('button', { name: 'Print Spell' }));
    expect(print).toHaveBeenCalledTimes(1);
  });
});
