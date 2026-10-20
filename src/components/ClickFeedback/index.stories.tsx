import type { Story } from '@ladle/react';
import type { CSSProperties, ReactElement } from 'react';
import { usePressOnMount } from '../../../.ladle/press';
import { useClickFeedback } from '.';

// Render-only; the opening, closing and focus are asserted in
// tests/components/ClickFeedback, and the placement, layout and axe in
// tests/e2e/workshop/click-feedback.spec.ts. Each button stands for a page's action
// whose service refuses it.
export default {
  title: 'Surfaces / Click Feedback',
};

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

// Press any button for its refusal; the badge then brings it back.
export const Default: Story = () => <Row />;

// A bordered button refused: the badge on its corner, the callout below it.
export const Bordered: Story = () => <Pressed name="Remove" />;

// A borderless button refused: no corner to sit on, so the badge goes beside it.
export const Borderless: Story = () => <Pressed name="Annotate" />;

// Near the right edge: no room for the callout's start under the control's,
// so its end goes under the control's end.
export const NearRightEdge: Story = () => (
  <Pressed name="Annotate" style={{ justifyContent: 'flex-end' }} />
);

// In a box too narrow for either alignment: the callout pinned inside it, its
// arrow still under the control.
export const Pinned: Story = () => {
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

export const PhoneDark: Story = () => <Pressed name="Remove" />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Pressed name="Remove" />;
PhoneLight.meta = { theme: 'light', width: 375 };

// Refused, then a later try that succeeds: the badge and the callout both go,
// fading out, which the workshop spec samples.
export const ThenSucceeds: Story = () => {
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
};
