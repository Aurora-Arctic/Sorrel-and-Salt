import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import SafetyNote, { CautionMark, SafetyMark, ToxicMark } from '.';
import type { SafetyVariant } from './types';

const meta = {
  title: 'Feedback / Safety Note',
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

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="20rem"
      states={{
        'Notes Only': <SafetyNote safetyNotes={NOTES} />,
        'With Forms': <SafetyNote safetyNotes={NOTES} variants={VARIANTS} />,
        Toxic: <ToxicMark toxic />,
        Compact: <SafetyNote safetyNotes={NOTES} compact />,
        'With Footnote': (
          <SafetyNote
            safetyNotes={NOTES}
            footnote="The oil and the dried leaf carry notes of their own."
          />
        ),
        'Footnote Only': <SafetyNote footnote="The oil carries notes of its own." />,
        'Caution Mark': <CautionMark safetyNotes={NOTES} />,
        'Safety Mark, Notes': <SafetyMark safetyNotes={NOTES} />,
        'Safety Mark, Toxic Form': <SafetyMark safetyNotes={NOTES} variants={VARIANTS} />,
      }}
    />
  ),
};
