import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import SafetyNote, { ToxicMark } from '.';
import type { SafetyVariant } from './types';

// Render-only; what shows and when is asserted in tests/components/SafetyNote.
const meta = {
  title: 'Ingredients / Safety Note',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const NOTES = 'Keep away from pets. Not for use while pregnant.';
const VARIANTS: SafetyVariant[] = [
  {
    form: 'dried leaf',
    formChoice: { group: { icon: 'botanical' } },
    safetyNotes: 'Dust irritates the eyes; burn somewhere aired.',
    toxic: false,
  },
  {
    form: 'oil',
    formChoice: { group: { icon: 'fluid' } },
    safetyNotes: 'Dilute before it touches skin.\nNever take by mouth.',
    toxic: true,
  },
  { form: 'whole root', safetyNotes: '', toxic: false },
];

// With Forms: the ingredient's notes, then each shown form's under its name; the root has none.
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="20rem"
      states={{
        'Notes Only': <SafetyNote safetyNotes={NOTES} />,
        'With Forms': <SafetyNote safetyNotes={NOTES} variants={VARIANTS} />,
        Toxic: <ToxicMark toxic />,
      }}
    />
  ),
};
