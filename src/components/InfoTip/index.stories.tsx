import type { Story } from '@ladle/react';
import type { ReactElement } from 'react';
import { usePressOnMount } from '../../../.ladle/press';
import InfoTip from '.';

// Render-only; behaviour is asserted in tests/components/InfoTip. Each story
// opens its tip itself, as a tap on the ⓘ would; hover, focus or a tap opens it
// again once it closes. The tip places itself above its nearest positioned
// ancestor, a form field's `.field__label-row`, so the story gives it one,
// with room above for the tip to open into.
export default {
  title: 'Forms / Info Tip',
};

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

export const BesideALabel: Story = () => <Field />;

// A phone's width, in each theme: the tip capped at the window.
export const PhoneDark: Story = () => <Field />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Field />;
PhoneLight.meta = { theme: 'light', width: 375 };
