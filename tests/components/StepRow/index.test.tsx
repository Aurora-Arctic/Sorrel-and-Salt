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

  describe('as an open or closed card', () => {
    const card = (open: boolean) => (
      <ol>
        <StepRow
          position={1}
          name="Testwort"
          open={open}
          fieldsId="fields"
          summary="2 tsp · Crush it first"
          badge={<span>One-Off</span>}
          edit={<button aria-label="Edit Testwort">Edit</button>}
          aside={<span>Goes in this jar only</span>}
          quantityField={<input aria-label="Quantity" />}
        />
      </ol>
    );

    it('closed, draws the name, badge, summary and pencil, and none of the fields', () => {
      render(card(false));

      expect(row()).toHaveTextContent('Testwort');
      expect(row()).toHaveTextContent('One-Off');
      expect(row()).toHaveTextContent('2 tsp');
      expect(row()).toHaveTextContent('Crush it first');
      expect(within(row()).getByRole('button', { name: 'Edit Testwort' })).toBeInTheDocument();
      expect(within(row()).queryByRole('textbox', { name: 'Quantity' })).toBeNull();
      expect(row()).not.toHaveTextContent('Goes in this jar only');
    });

    it('open, draws the fields and the aside line under the id the pencil controls', () => {
      render(card(true));

      expect(within(row()).getByRole('textbox', { name: 'Quantity' })).toBeInTheDocument();
      expect(row()).toHaveTextContent('Goes in this jar only');
      expect(row().querySelector('#fields')).not.toBeNull();
    });
  });
});
