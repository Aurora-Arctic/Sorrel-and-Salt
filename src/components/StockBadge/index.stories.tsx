import type { Story } from '@ladle/react';
import { StockBadge, ThresholdReadout } from '.';

// Render-only; which state shows when is asserted in tests/components/StockBadge.
export default {
  title: 'Surfaces / Stock Badge',
};

export const Low: Story = () => <StockBadge quantity={6} threshold={10} />;

export const Out: Story = () => <StockBadge quantity={0} threshold={10} />;

// Nothing renders for a jar above its threshold, so this story is empty on purpose.
export const Fine: Story = () => <StockBadge quantity={40} threshold={10} />;

export const Readout: Story = () => <ThresholdReadout threshold={10} unit="g" />;

export const ReadoutOff: Story = () => <ThresholdReadout threshold={0} unit="g" />;

// A jar line as a card sets it: the badge, then the threshold.
const JarLines = () => (
  <div
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}
  >
    <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <StockBadge quantity={6} threshold={10} />
      <ThresholdReadout threshold={10} unit="g" />
    </span>
    <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
      <StockBadge quantity={0} threshold={10} />
      <ThresholdReadout threshold={10} unit="g" />
    </span>
  </div>
);

export const PhoneDark: Story = () => <JarLines />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <JarLines />;
PhoneLight.meta = { theme: 'light', width: 375 };
