import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, useState } from 'react';
import { CollapsibleSection } from '.';

// Render-only; behaviour is asserted in tests/components/CollapsibleSection.
// Three sections in a form's column: one open, one closed showing its line,
// and one holding an error. Each heading opens and shuts its own.
const meta = {
  title: 'Forms / Collapsible Section',
} satisfies Meta;
export default meta;
type Story = StoryObj;

function Section({
  title,
  summary,
  open: startOpen,
  invalid = false,
}: {
  title: string;
  summary: string;
  open: boolean;
  invalid?: boolean;
}): ReactElement {
  const [open, setOpen] = useState(startOpen);
  return (
    <CollapsibleSection
      title={title}
      summary={summary}
      fold={{ open, invalid, onToggle: () => setOpen((was) => !was) }}
    >
      <div className="field">
        <label className="field__label" htmlFor={`story-${title}`}>
          {title} Notes
        </label>
        <input id={`story-${title}`} className="input" aria-invalid={invalid || undefined} />
      </div>
    </CollapsibleSection>
  );
}

export const States: Story = {
  render: () => (
    <form className="form" style={{ maxWidth: '32rem' }}>
      <Section title="When to Work It" summary="Full Moon · Friday" open />
      <Section title="Details & Care" summary="A calming leaf · Toxic" open={false} />
      <Section title="Relations" summary="1 category · No substitutes" open={false} invalid />
    </form>
  ),
};
