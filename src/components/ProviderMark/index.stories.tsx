import type { Story } from '@ladle/react';
import ProviderMark from '.';
import { ProviderUnavailableNote } from './unavailable-note';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';

// Render-only, and presentation alone: the marks are checked by eye here and
// by axe on the pages that show them.
export default {
  title: 'Surfaces / Provider Mark',
};

const Marks = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem' }}>
    {SOCIAL_PROVIDERS.map((provider) => (
      <span key={provider.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <ProviderMark id={provider.id} />
        {provider.label}
      </span>
    ))}
  </div>
);

export const Default: Story = () => <Marks />;

export const Light: Story = () => <Marks />;
Light.meta = { theme: 'light' };

// Facebook's mark as a brand button draws it, on its blue chip.
export const FacebookChip: Story = () => <ProviderMark id="facebook" chip />;

export const UnavailableNote: Story = () => (
  <ProviderUnavailableNote id="provider-mark-story-note" />
);
