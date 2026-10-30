import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { usePressOnMount } from '../../../.storybook/press';
import { useClickFeedback } from '.';

// Render-only; opening, closing and focus are asserted in tests/components/ClickFeedback,
// placement and axe in tests/e2e/workshop/click-feedback.spec.ts. Each button
// stands for an action whose service refuses it.
const meta = {
  title: 'Surfaces / Click Feedback',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const REFUSED = 'Testwort is in a spell, so it cannot be removed.';

const Action = ({
  label,
  className = 'btn',
  style,
}: {
  label: string;
  className?: string;
  style?: CSSProperties;
}): ReactElement => {
  const { anchorRef, report, feedback } = useClickFeedback({ name: label });
  return (
    <>
      <button
        type="button"
        className={className}
        style={style}
        ref={anchorRef}
        onClick={() => report(`${label}: ${REFUSED}`)}
      >
        {label}
      </button>
      {feedback}
    </>
  );
};

const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '0.5rem',
};

// A text button, as a menu item or a fold toggle is: no border, so no corner
// for the badge. Every `.btn` has a border, `.btn--quiet` included.
const borderless: CSSProperties = {
  border: 0,
  padding: 0,
  background: 'none',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
};

// Three bordered buttons, and a borderless one last, with room to its right
// for the badge that goes beside it.
const Row = ({ style }: { style?: CSSProperties }) => (
  <div style={{ ...row, ...style }}>
    <Action label="Leave Coven" />
    <Action label="Remove" className="btn btn--destructive" />
    <Action label="Edit" className="btn btn--quiet" />
    <Action label="Annotate" className="" style={borderless} />
  </div>
);

const Pressed = ({ name, style }: { name: string; style?: CSSProperties }) => {
  usePressOnMount(name);
  return <Row style={style} />;
};

// Pinned: in a box too narrow for either alignment, the callout pinned inside
// it, its arrow still under the control.
const PinnedView = () => {
  usePressOnMount('Remove');
  return (
    <div
      data-tip-boundary
      style={{ inlineSize: '24rem', display: 'flex', justifyContent: 'center' }}
    >
      <Action label="Remove" className="btn btn--destructive" />
    </div>
  );
};

// Every placement the badge and callout take. Each state but Resting presses its
// button once drawn, so it opens on the refusal. Bordered: badge on the corner.
// Borderless: badge beside the button. Near Right Edge: callout's end under the
// control's end. Pinned: see PinnedView.
const STATES: Record<string, ReactNode> = {
  Resting: <Row />,
  Bordered: <Pressed name="Remove" />,
  Borderless: <Pressed name="Annotate" />,
  'Near Right Edge': <Pressed name="Annotate" style={{ justifyContent: 'flex-end' }} />,
  Pinned: <PinnedView />,
};

export const States: Story = {
  args: { state: 'Resting' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};

// Refused, then a later try that succeeds: the badge and the callout both go,
// fading out, which the workshop spec samples.
export const ThenSucceeds: Story = {
  render: () => {
    const { anchorRef, report, feedback } = useClickFeedback({ name: 'Remove' });
    return (
      <div style={row}>
        <button
          type="button"
          className="btn btn--destructive"
          ref={anchorRef}
          onClick={() => report(`Remove: ${REFUSED}`)}
        >
          Remove
        </button>
        {feedback}
        <button type="button" className="btn" onClick={() => report(undefined)}>
          Succeed
        </button>
      </div>
    );
  },
};
