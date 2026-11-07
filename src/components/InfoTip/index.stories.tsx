import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement, ReactNode } from 'react';
import { usePressOnMount } from '../../../.storybook/press';
import InfoTip from '.';

const meta = {
  title: 'Forms / Info Tip',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const HINT =
  'Botanical for a plant, mineral for a stone, and so on. "Unknown" if you are not sure which, with or without a formal name. "None" takes no formal name.';
const LONG = [HINT, HINT, HINT].join(' ');

const Field = ({
  open = true,
  children,
}: {
  open?: boolean;
  children?: ReactNode;
}): ReactElement => {
  usePressOnMount(open ? 'About Classification' : 'Nothing To Press');
  return (
    <div className="field" style={{ maxWidth: '32rem', marginTop: '5rem' }}>
      <div className="field__label-row">
        <label className="field__label" htmlFor="story-control">
          Classification
        </label>
        <InfoTip id="story-tip" label="Classification">
          {children}
        </InfoTip>
      </div>
      <input id="story-control" className="input" aria-describedby="story-tip" />
    </div>
  );
};

const INFO_STATES: Record<string, ReactNode> = {
  Open: <Field>{HINT}</Field>,
  Closed: <Field open={false}>{HINT}</Field>,
  'Long Text': <Field>{LONG}</Field>,
};

export const States: Story = {
  args: { state: 'Open' },
  argTypes: {
    state: { control: 'select', options: Object.keys(INFO_STATES), mapping: INFO_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
