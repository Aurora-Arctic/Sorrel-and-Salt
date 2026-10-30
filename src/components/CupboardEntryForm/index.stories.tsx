import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { Reopenable } from '../../../.storybook/reopenable';
import Modal from '../Modal';
import CupboardEntryForm from '.';
import type { CompendiumValues, CupboardOverrides } from './types';

// Render-only; behaviour is asserted in tests/components/CupboardEntryForm.
// The workshop has no API, so a save answers with the form's generic error.
// Shown in the modal Annotate This Entry opens it in. Every name is invented.
const meta = {
  title: 'Ingredients / Cupboard Entry Form',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const COMPENDIUM: CompendiumValues = {
  name: 'Testwort',
  description: 'A plant the fixtures grow.',
  safetyNotes: 'Fixture caution: not for eating.',
  elements: ['water'],
  celestialBodies: ['Moon'],
  zodiacSigns: ['Cancer'],
  colors: ['green'],
};

const NONE: CupboardOverrides = {
  label: null,
  description: null,
  safetyNotes: null,
  elements: null,
  celestialBodies: null,
  zodiacSigns: null,
  colors: null,
};

const IDS = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  ingredientId: '00000000-0000-4000-8000-000000000002',
};

const done = () => {};

const Shown = ({ overrides }: { overrides: CupboardOverrides }) => (
  <Reopenable>
    {(close) => (
      <Modal title="Annotate This Entry" onClose={close}>
        <CupboardEntryForm {...IDS} compendium={COMPENDIUM} overrides={overrides} onDone={done} />
      </Modal>
    )}
  </Reopenable>
);

// Nothing annotated yet: every field shows the Compendium's value, and no
// Restore Original control.
const defaultNode = <Shown overrides={NONE} />;

// The coven's own label and description, and its celestial bodies cleared on purpose:
// each changed field shows the Restore Original icon button at its label's end.
const annotatedNode = (
  <Shown
    overrides={{
      ...NONE,
      label: 'Hedgewort',
      description: 'What our coven makes of it.',
      celestialBodies: [],
    }}
  />
);

const STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  Annotated: annotatedNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
