import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import StockFields, { EMPTY_STOCK, type StockFormValues, stockFormValues } from '.';

// Render-only; behaviour is asserted in tests/components/StockFields. The
// fields only mean something inside a form, so each story gives them one.
export default {
  title: 'Ingredients / Stock Fields',
};

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
export const Measured: Story = () => (
  <Form start={stockFormValues({ quantity: 250, unit: 'g', threshold: 30 })} />
);

/** A jar held but never weighed: quantity, unit and threshold empty. */
export const Unmeasured: Story = () => <Form start={EMPTY_STOCK} />;

/** Out of stock: a quantity of zero is an amount, not an empty box. */
export const OutOfStock: Story = () => (
  <Form start={stockFormValues({ quantity: 0, unit: 'ml', threshold: 15 })} />
);

export const MeasuredPhoneDark: Story = () => (
  <Form start={stockFormValues({ quantity: 250, unit: 'g', threshold: 30 })} />
);
export const MeasuredPhoneLight: Story = () => (
  <Form start={stockFormValues({ quantity: 250, unit: 'g', threshold: 30 })} />
);

MeasuredPhoneDark.meta = { theme: 'dark', width: 375 };
MeasuredPhoneLight.meta = { theme: 'light', width: 375 };

interface Jars {
  jars: StockFormValues[];
}

/** Two jars in one form, as the stock dialog lays its rows: each field named for its form. */
export const Rows: Story = () => {
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
