import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import { usePressOnMount } from '../../../.storybook/press';
import InfoTip from '.';

// Render-only; behaviour is asserted in tests/components/InfoTip. Each story
// opens its tip itself, as a tap on the ⓘ would; hover, focus or a tap opens it
// again once it closes. The tip places itself above its nearest positioned
// ancestor, a form field's `.field__label-row`, so the story gives it one,
// with room above for the tip to open into.
const meta = {
  title: 'Forms / Info Tip',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Field = (): ReactElement => {
  usePressOnMount('About Classification');
  return (
    <div className="field" style={{ maxWidth: '32rem', marginTop: '5rem' }}>
      <div className="field__label-row">
        <label className="field__label" htmlFor="story-control">
          Classification
        </label>
        <InfoTip id="story-tip" label="Classification">
          Botanical for a plant, mineral for a stone, and so on. &ldquo;Unknown&rdquo; if you are
          not sure which, with or without a formal name. &ldquo;None&rdquo; takes no formal name.
        </InfoTip>
      </div>
      <input id="story-control" className="input" aria-describedby="story-tip" />
    </div>
  );
};

export const Default: Story = { render: () => <Field /> };
