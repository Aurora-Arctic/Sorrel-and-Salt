import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { usePressOnMount } from '../../../.storybook/press';
import { useClickFeedback } from '.';

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

const borderless: CSSProperties = {
  border: 0,
  padding: 0,
  background: 'none',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
};

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
  render: ({ state }) => <div>{state}</div>,
};

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
