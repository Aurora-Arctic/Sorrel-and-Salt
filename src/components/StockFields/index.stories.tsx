import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import StockFields, { EMPTY_STOCK, type StockFormValues, stockFormValues } from '.';

// Render-only; behaviour is asserted in tests/components/StockFields. The
// fields only mean something inside a form, so each story gives them one.
const meta = {
  title: 'Ingredients / Stock Fields',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const Form = ({ start }: { start: StockFormValues }): ReactElement => {
  const methods = useForm<StockFormValues>({ defaultValues: start });
  return (
    <FormProvider {...methods}>
      <form className="form" noValidate>
        <StockFields />
      </form>
    </FormProvider>
  );
};

/** A jar with an amount, a unit and a threshold, as the edit dialog opens on it. */
const defaultNode = <Form start={stockFormValues({ quantity: 250, unit: 'g', threshold: 30 })} />;

/** A jar held but never weighed: quantity, unit and threshold empty. */
const unmeasuredNode = <Form start={EMPTY_STOCK} />;

/** Out of stock: a quantity of zero is an amount, not an empty box. */
const outOfStockNode = <Form start={stockFormValues({ quantity: 0, unit: 'ml', threshold: 15 })} />;

interface Jars {
  jars: StockFormValues[];
}

const RowsForm = (): ReactElement => {
  const methods = useForm<Jars>({
    defaultValues: {
      jars: [
        stockFormValues({ quantity: 250, unit: 'g', threshold: 30 }),
        stockFormValues({ quantity: 0, unit: 'ml', threshold: 15 }),
      ],
    },
  });
  return (
    <FormProvider {...methods}>
      <form className="form" noValidate>
        <StockFields<Jars> prefix="jars.0" form="Flower" />
        <StockFields<Jars> prefix="jars.1" form="Oil" />
      </form>
    </FormProvider>
  );
};

/** Two jars in one form, each field named for its form. */
export const Rows: Story = { render: () => <RowsForm /> };

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  Unmeasured: unmeasuredNode,
  'Out Of Stock': outOfStockNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
