import type { Story } from '@ladle/react';
import Notice from '.';

// Render-only; the role each kind takes is asserted in tests/components/Notice.
export default {
  title: 'Surfaces / Notice',
};

export const Failure: Story = () => (
  <Notice kind="error">That link has expired. Send a new one below.</Notice>
);

export const Warning: Story = () => (
  <Notice kind="warn">
    Close to the dark theme colour of “Testwort Wards”, so their chips may be hard to tell apart.
  </Notice>
);

export const Success: Story = () => <Notice kind="success">Your name was saved.</Notice>;

export const Plain: Story = () => (
  <Notice kind="plain">Nothing has changed since you last saved.</Notice>
);

// All four at a phone's width, in each theme.
const AllKinds = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    <Failure />
    <Warning />
    <Success />
    <Plain />
  </div>
);

export const PhoneDark: Story = () => <AllKinds />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <AllKinds />;
PhoneLight.meta = { theme: 'light', width: 375 };
