import { act, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import StockFields, {
  EMPTY_STOCK,
  type StockFormValues,
  UNIT_OPTIONS,
  stockAmountsOf,
  stockFormValues,
} from '@/components/StockFields';
import { UNITS } from '@/modules/ingredients/schema/units';
import { choose, typeIn } from '../../support/interact';

// A jar's three amounts, drawn for whichever form holds a jar (M9.9, and
// M9.12's add dialog). The fields hand their values to the form that draws
// them; changing the unit never converts the numbers
// (claude-docs/components/stock-fields.md).

/** What the form holds now, read from the form itself. */
let held: StockFormValues;

function Harness({ start }: { start: StockFormValues }) {
  const methods = useForm<StockFormValues>({ defaultValues: start });
  held = methods.watch();
  return (
    <FormProvider {...methods}>
      <form>
        <StockFields />
      </form>
    </FormProvider>
  );
}

const quantity = () => screen.getByRole('spinbutton', { name: 'Quantity' });
const threshold = () => screen.getByRole('spinbutton', { name: 'Low-Stock Threshold' });
const unit = () => screen.getByRole('combobox', { name: 'Unit' });

describe('StockFields', () => {
  it('shows a held jar as it is: the amounts typed, the unit chosen', () => {
    render(<Harness start={stockFormValues({ quantity: 250, unit: 'g', threshold: 30 })} />);

    expect(quantity()).toHaveValue(250);
    expect(threshold()).toHaveValue(30);
    expect(unit()).toHaveTextContent('g');
  });

  it('shows an unmeasured jar with the quantity and threshold empty and no unit', () => {
    render(<Harness start={stockFormValues({ quantity: null, unit: null, threshold: null })} />);

    expect(quantity()).toHaveValue(null);
    expect(threshold()).toHaveValue(null);
  });

  it('keeps zero as zero, not as nothing', () => {
    render(<Harness start={stockFormValues({ quantity: 0, unit: 'g', threshold: 0 })} />);

    expect(quantity()).toHaveValue(0);
    expect(threshold()).toHaveValue(0);
  });

  it('hands what is typed to the form', () => {
    render(<Harness start={EMPTY_STOCK} />);

    typeIn(quantity(), '12.5');
    typeIn(threshold(), '2');

    expect(held).toMatchObject({ quantityOnHand: '12.5', lowStockThreshold: '2' });
  });

  it('takes any decimal, which a number box with the default step would refuse', () => {
    render(<Harness start={EMPTY_STOCK} />);

    expect(quantity()).toHaveAttribute('step', 'any');
    expect(threshold()).toHaveAttribute('step', 'any');
  });

  it('leaves the numbers as typed when the unit changes: nothing converts', () => {
    render(<Harness start={stockFormValues({ quantity: 250, unit: 'g', threshold: 30 })} />);

    choose('Unit', 'kg');

    expect(held).toEqual({ quantityOnHand: '250', unit: 'kg', lowStockThreshold: '30' });
    expect(quantity()).toHaveValue(250);
    expect(threshold()).toHaveValue(30);
  });

  it('can clear the unit with None', () => {
    render(<Harness start={stockFormValues({ quantity: 3, unit: 'piece', threshold: null })} />);

    choose('Unit', 'None');

    expect(held.unit).toBe('');
  });

  it('offers every unit of the vocabulary once, and None first', () => {
    expect(UNIT_OPTIONS[0]).toEqual({ value: '', label: 'None' });
    expect(UNIT_OPTIONS.slice(1).map((option) => option.value)).toEqual([...UNITS]);
    const labels = UNIT_OPTIONS.map((option) => option.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('reaches the unit by keyboard alone', () => {
    render(<Harness start={EMPTY_STOCK} />);

    act(() => unit().focus());
    fireEvent.keyDown(unit(), { key: 'ArrowDown' });
    fireEvent.keyDown(unit(), { key: 'ArrowDown' });
    fireEvent.keyDown(unit(), { key: 'Enter' });

    expect(held.unit).toBe('mg');
  });
});

describe('stockAmountsOf', () => {
  it('reads the text as numbers, and empty as nothing', () => {
    expect(stockAmountsOf({ quantityOnHand: '0.25', unit: 'kg', lowStockThreshold: '' })).toEqual({
      quantityOnHand: 0.25,
      unit: 'kg',
      lowStockThreshold: null,
    });
  });

  it('keeps a typed zero, which is out of stock, apart from an empty box', () => {
    expect(stockAmountsOf({ quantityOnHand: '0', unit: '', lowStockThreshold: '0' })).toEqual({
      quantityOnHand: 0,
      unit: null,
      lowStockThreshold: 0,
    });
  });

  it('reads an empty form as nothing at all', () => {
    expect(stockAmountsOf(EMPTY_STOCK)).toEqual({
      quantityOnHand: null,
      unit: null,
      lowStockThreshold: null,
    });
  });

  it('round-trips a held jar', () => {
    const jar = { quantity: 1.5, unit: 'fl_oz_uk', threshold: 0 };
    expect(stockAmountsOf(stockFormValues(jar))).toEqual({
      quantityOnHand: 1.5,
      unit: 'fl_oz_uk',
      lowStockThreshold: 0,
    });
  });
});
