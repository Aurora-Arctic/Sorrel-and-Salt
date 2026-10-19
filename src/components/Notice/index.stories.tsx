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
    This is close to &quot;Testwort Wards&quot;&apos;s dark theme colour, so their chips may be hard
    to tell apart. You can still save it.
  </Notice>
);

export const QuietWarning: Story = () => (
  <Notice kind="warn" quiet>
    This address is unverified, so approving vouches for it as a sign-in would.
  </Notice>
);

export const Caution: Story = () => (
  <Notice kind="caution">
    Testwort is out of stock, so this spell cannot be made from the cupboard as it stands.
  </Notice>
);

export const Success: Story = () => <Notice kind="success">Your name was saved.</Notice>;

export const Plain: Story = () => (
  <Notice kind="plain">Nothing has changed since you last saved.</Notice>
);

// All five at a phone's width, in each theme.
const AllKinds = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    <Failure />
    <Warning />
    <Caution />
    <Success />
    <Plain />
  </div>
);

export const PhoneDark: Story = () => <AllKinds />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <AllKinds />;
PhoneLight.meta = { theme: 'light', width: 375 };
