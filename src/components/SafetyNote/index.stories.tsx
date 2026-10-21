import type { Meta, StoryObj } from '@storybook/nextjs-vite';
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

export const Default: Story = { render: () => <SafetyNote safetyNotes={NOTES} /> };

// The ingredient's notes, then each shown form's under its name; the root has none.
export const WithForms: Story = {
  render: () => <SafetyNote safetyNotes={NOTES} variants={VARIANTS} />,
};

export const Toxic: Story = { render: () => <ToxicMark toxic /> };
