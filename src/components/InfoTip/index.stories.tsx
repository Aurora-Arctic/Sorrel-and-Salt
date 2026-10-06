import type { Story } from '@ladle/react';
import InfoTip from '.';

// Render-only; behaviour is asserted in tests/components/InfoTip. Hover, focus
// or tap the ⓘ to open it. The tip places itself above
// its nearest positioned ancestor, as a form field's label row is, so the
// story gives it one, with room above for the tip to open into.
export default {
  title: 'Forms / Info Tip',
};

export const BesideALabel: Story = () => (
  <div className="field" style={{ maxWidth: '32rem', marginTop: '5rem' }}>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <label className="field__label" htmlFor="story-control">
        Classification
      </label>
      <InfoTip id="story-tip" label="Classification">
        Botanical for a plant, mineral for a stone, and so on. &ldquo;Unknown&rdquo; and
        &ldquo;None&rdquo; take no formal name.
      </InfoTip>
    </div>
    <input id="story-control" className="input" aria-describedby="story-tip" />
  </div>
);
