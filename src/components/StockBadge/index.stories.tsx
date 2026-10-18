import type { Story } from '@ladle/react';
import { StockBadge } from '.';

// Render-only; which state shows when is asserted in tests/components/StockBadge.
// The Low badge's tip opens on hover, tap or focus: point at it to see it.
export default {
  title: 'Surfaces / Stock Badge',
};

export const Low: Story = () => (
  <div style={{ paddingBlockStart: '3rem' }}>
    <StockBadge quantity={6} threshold={10} unit="g" />
  </div>
);

export const Out: Story = () => <StockBadge quantity={0} threshold={10} unit="g" />;

// A jar line as a card sets it: a badge per jar.
const JarLines = () => (
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
  </div>
);

export const PhoneDark: Story = () => <JarLines />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <JarLines />;
PhoneLight.meta = { theme: 'light', width: 375 };
