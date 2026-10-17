import type { Story } from '@ladle/react';
import SafetyNote, { ToxicMark } from '.';
import type { SafetyVariant } from './types';

// Render-only; what shows and when is asserted in tests/components/SafetyNote.
export default {
  title: 'Surfaces / Safety Note',
};

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

export const Note: Story = () => <SafetyNote safetyNotes={NOTES} />;

// The ingredient's notes, then each shown form's under its name; the root has none.
export const WithForms: Story = () => <SafetyNote safetyNotes={NOTES} variants={VARIANTS} />;

export const Toxic: Story = () => <ToxicMark toxic />;

// As a consumer sets them side by side: the mark, then the note.
const Together = () => (
  <div
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}
  >
    <ToxicMark variants={VARIANTS} />
    <SafetyNote safetyNotes={NOTES} variants={VARIANTS} />
  </div>
);

export const PhoneDark: Story = () => <Together />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Together />;
PhoneLight.meta = { theme: 'light', width: 375 };
