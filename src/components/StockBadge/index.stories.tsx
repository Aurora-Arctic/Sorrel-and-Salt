import type { Story } from '@ladle/react';
import { CardStockBadge, StockBadge } from '.';

// Render-only; which state shows when is asserted in tests/components/StockBadge.
// The tips open on hover, tap or focus: point at a badge to see its tip.
export default {
  title: 'Surfaces / Stock Badge',
};

export const Low: Story = () => (
  <div style={{ paddingBlockStart: '3rem' }}>
    <StockBadge quantity={6} threshold={10} unit="g" />
  </div>
);

export const Out: Story = () => <StockBadge quantity={0} threshold={10} unit="g" />;

/** A coven card's one badge: the worst of its jars, naming the forms in that state. */
export const CardLow: Story = () => (
  <div style={{ paddingBlockStart: '3rem' }}>
    <CardStockBadge
      jars={[
        { form: 'flower', quantity: 6, threshold: 10 },
        { form: 'oil', quantity: 40, threshold: 10 },
      ]}
    />
  </div>
);

export const CardOut: Story = () => (
  <div style={{ paddingBlockStart: '3rem' }}>
    <CardStockBadge
      jars={[
        { form: 'flower', quantity: 6, threshold: 10 },
        { form: 'oil', quantity: 0, threshold: 10 },
        { form: 'tea', quantity: 0, threshold: null },
      ]}
    />
  </div>
);

// Both shapes in a column, as a phone shows them.
const Both = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '0.75rem',
      paddingBlockStart: '3rem',
    }}
  >
    <StockBadge quantity={6} threshold={10} unit="g" />
    <StockBadge quantity={0} threshold={10} unit="g" />
    <CardStockBadge jars={[{ form: 'oil', quantity: 0, threshold: 10 }]} />
  </div>
);

export const PhoneDark: Story = () => <Both />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Both />;
PhoneLight.meta = { theme: 'light', width: 375 };
