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

// MB.120's proposal for the note's bar (the MB.120 plan). The recommendation
// is built into the component: the bar at `$safety-bar-width` (the heavy rule,
// 3px). As built, the bar was a raw 4px, restored here over the component so
// the two stand side by side. The heading's stroke is not in question: the
// owner kept it (2026-10-20). The owner settles the bar at sign-off, and the
// losing stories are deleted then.
const AS_BUILT = `
  .proposal-safety-as-built .safety-note { border-inline-start-width: 4px; }
`;

const AsBuilt = () => (
  <div className="proposal-safety-as-built">
    <style>{AS_BUILT}</style>
    <SafetyNote safetyNotes={NOTES} variants={VARIANTS} />
  </div>
);

const Proposed = () => <SafetyNote safetyNotes={NOTES} variants={VARIANTS} />;

export const ProposalSafetyBarAsBuilt: Story = () => <AsBuilt />;

export const ProposalSafetyBar: Story = () => <Proposed />;

export const ProposalSafetyBarAsBuiltPhoneDark: Story = () => <AsBuilt />;
ProposalSafetyBarAsBuiltPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalSafetyBarPhoneDark: Story = () => <Proposed />;
ProposalSafetyBarPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalSafetyBarAsBuiltPhoneLight: Story = () => <AsBuilt />;
ProposalSafetyBarAsBuiltPhoneLight.meta = { theme: 'light', width: 375 };

export const ProposalSafetyBarPhoneLight: Story = () => <Proposed />;
ProposalSafetyBarPhoneLight.meta = { theme: 'light', width: 375 };
