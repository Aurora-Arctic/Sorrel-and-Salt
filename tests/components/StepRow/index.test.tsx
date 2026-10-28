import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StepRow from '@/components/StepRow';

// What a step row draws from what it is given (M13.3). The editing controls
// the spell builder passes in are tests/components/SpellBuilder's.

const row = () => within(screen.getByRole('list')).getByRole('listitem');

describe('StepRow', () => {
  it('draws an instruction-only step as its position and text', () => {
    render(
      <ol>
        <StepRow position={1} name={null} body="Light the candle" />
      </ol>,
    );

    expect(row()).toHaveTextContent('1.');
    expect(row()).toHaveTextContent('Light the candle');
  });

  it('draws a name given as markup, so a read-only caller can link the ingredient', () => {
    render(
      <ol>
        <StepRow position={1} name={<a href="/ingredients/a">Testwort (Dried Leaf)</a>} />
      </ol>,
    );

    expect(within(row()).getByRole('link', { name: 'Testwort (Dried Leaf)' })).toHaveAttribute(
      'href',
      '/ingredients/a',
    );
  });

  it('draws an ingredient step with its amount and its text', () => {
    render(
      <ol>
        <StepRow position={2} name="Testwort" quantity="2" unit="tsp" body="Crush it first" />
      </ol>,
    );

    expect(row()).toHaveTextContent('Testwort');
    expect(row()).toHaveTextContent('2 tsp');
    expect(row()).toHaveTextContent('Crush it first');
  });

  it('draws no amount for a step that has none', () => {
    render(
      <ol>
        <StepRow position={1} name="Testwort" />
      </ol>,
    );

    expect(row()).toHaveTextContent(/^1\.\s*Testwort$/);
  });

  it('puts the editing controls it is given in place of the plain text', () => {
    render(
      <ol>
        <StepRow
          position={1}
          name="Testwort"
          quantity="2"
          body="Plain"
          bodyField={<input aria-label="Instruction" />}
          quantityField={<input aria-label="Quantity" />}
        />
      </ol>,
    );

    expect(within(row()).getByRole('textbox', { name: 'Instruction' })).toBeInTheDocument();
    expect(within(row()).getByRole('textbox', { name: 'Quantity' })).toBeInTheDocument();
    expect(row()).not.toHaveTextContent('Plain');
  });
  it('shows an amount with only the decimals that carry information', () => {
    render(
      <ol>
        <StepRow position={1} name="Testwort" quantity="1.000" unit="tbsp" />
        <StepRow position={2} name="Testwort" quantity="2.500" unit="tsp" />
        <StepRow position={3} name="Testwort" quantity="10" unit="g" />
      </ol>,
    );

    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('1 tbsp');
    expect(rows[0]).not.toHaveTextContent('1.000');
    expect(rows[1]).toHaveTextContent('2.5 tsp');
    expect(rows[2]).toHaveTextContent('10 g');
  });
});
