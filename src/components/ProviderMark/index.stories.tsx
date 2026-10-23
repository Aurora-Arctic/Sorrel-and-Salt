import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import ProviderMark from '.';
import { ProviderUnavailableNote } from './unavailable-note';
import { SOCIAL_PROVIDERS } from '../../lib/social-providers';

// Render-only, and presentation alone: the marks are checked by eye here and
// by axe on the pages that show them.
const meta = {
  title: 'Sign In / Provider Mark',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

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

// Facebook Chip: Facebook's mark as a brand button draws it, on its blue chip.
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="24rem"
      states={{
        Marks: <Marks />,
        'Facebook Chip': <ProviderMark id="facebook" chip />,
        'Unavailable Note': <ProviderUnavailableNote id="provider-mark-story-note" />,
      }}
    />
  ),
};
