import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactElement, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { CollapsibleSection } from '@/components/CollapsibleSection';

// The shared folding section (MB.115; shared since M10.12): the heading is the
// toggle, the closed line describes it, the fields stay in the page while
// hidden, and an error is flagged open or closed.

function Harness({
  open = false,
  invalid = false,
}: {
  open?: boolean;
  invalid?: boolean;
}): ReactElement {
  const [isOpen, setOpen] = useState(open);
  return (
    <CollapsibleSection
      title="When to Work It"
      summary="Full Moon · Friday"
      fold={{ open: isOpen, invalid, onToggle: () => setOpen((was) => !was) }}
    >
      <label>
        Moon Phase
        <input defaultValue="" />
      </label>
    </CollapsibleSection>
  );
}

const toggle = () => screen.getByRole('button', { name: 'When to Work It' });

describe('CollapsibleSection', () => {
  it('puts its toggle inside a heading at the level asked', () => {
    render(<Harness />);

    expect(screen.getByRole('heading', { level: 3, name: 'When to Work It' })).toContainElement(
      toggle(),
    );
  });

  it('closed, hides its fields and is described by its line', () => {
    render(<Harness />);

    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(toggle()).toHaveAccessibleDescription('Full Moon · Friday');
    expect(screen.queryByRole('textbox', { name: 'Moon Phase' })).toBeNull();
  });

  it('opens on its heading, showing the fields and keeping what was typed when shut again', () => {
    render(<Harness />);

    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.change(screen.getByRole('textbox', { name: 'Moon Phase' }), {
      target: { value: 'Full Moon' },
    });
    fireEvent.click(toggle());
    fireEvent.click(toggle());

    expect(screen.getByRole('textbox', { name: 'Moon Phase' })).toHaveValue('Full Moon');
  });

  it('flags an error beneath its heading while closed', () => {
    render(<Harness invalid />);

    expect(toggle()).toHaveAccessibleDescription('Full Moon · Friday Has an error to fix');
  });
});
