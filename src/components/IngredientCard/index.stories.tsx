import type { Story } from '@ladle/react';
import { Jars } from './story-jars';
import IngredientCard from '.';
import type { SafetyVariant } from '../SafetyNote/types';

// Render-only; what shows and when is asserted in tests/components/IngredientCard.
export default {
  title: 'Surfaces / Ingredient Card',
};

const VARIANTS: SafetyVariant[] = [
  { form: 'dried leaf', formChoice: { group: { icon: 'botanical' } }, safetyNotes: '' },
  {
    form: 'oil',
    formChoice: { group: { icon: 'fluid' } },
    safetyNotes: 'Dilute before it touches skin.',
    toxic: true,
  },
  { form: 'whole root', safetyNotes: '' },
];

const CATEGORIES = [
  {
    category: { id: 'c1', name: 'Protection' },
    group: { colorDark: '#7aa7d9', colorLight: '#1f4f8a' },
  },
  {
    category: { id: 'c2', name: 'Clarity' },
    group: { colorDark: '#c9a3e0', colorLight: '#6b2f8a' },
  },
];

const BASE = {
  href: '/compendium/ingredients/testwort-testalis' as const,
  label: 'Testwort',
  formalName: 'Fixtura testalis',
  nomenclature: 'botanical' as const,
  categories: CATEGORIES,
  variants: VARIANTS,
};

// The public compendium: no cupboard mark, no jar lines.
export const Compendium: Story = () => <IngredientCard {...BASE} kind="compendium" />;

// A coven's own entry, with the jar lines M9.6 will fill the slot with.
export const OwnWithJars: Story = () => (
  <IngredientCard {...BASE} kind="own">
    <Jars />
  </IngredientCard>
);

// Caution and Toxic together: the oil form carries notes and the flag.
export const CautionAndToxic: Story = () => <IngredientCard {...BASE} kind="compendium" />;

// Caution alone: notes on the entry, no form flagged.
export const CautionAlone: Story = () => (
  <IngredientCard
    {...BASE}
    kind="compendium"
    variants={VARIANTS.filter((v) => !v.toxic)}
    safetyNotes="Keep away from open flame."
  />
);

// A mineral’s formal name is upright, not italic.
export const MineralName: Story = () => (
  <IngredientCard
    {...BASE}
    kind="compendium"
    label="Testite"
    formalName="Fixtura testite"
    nomenclature="mineral"
  />
);

export const InCupboardAnnotated: Story = () => (
  <IngredientCard {...BASE} kind="cupboard" annotated label="Our Testwort">
    <Jars />
  </IngredientCard>
);

export const Retired: Story = () => <IngredientCard {...BASE} kind="cupboard" retired />;

export const PhoneDark: Story = () => (
  <IngredientCard {...BASE} kind="own">
    <Jars />
  </IngredientCard>
);
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => (
  <IngredientCard {...BASE} kind="own">
    <Jars />
  </IngredientCard>
);
PhoneLight.meta = { theme: 'light', width: 375 };

// Many forms in a narrow column, so the forms line wraps: no dot leads or ends a line.
const MANY_FORMS = [
  'dried leaf',
  'fresh leaf',
  'whole root',
  'powdered root',
  'oil',
  'tincture',
  'flower',
  'seed',
  'bark',
].map((form, at) => ({
  form,
  formChoice: { group: { icon: at % 2 ? ('fluid' as const) : ('botanical' as const) } },
  safetyNotes: '',
}));

export const ManyFormsNarrow: Story = () => (
  <IngredientCard {...BASE} kind="own" variants={MANY_FORMS}>
    <Jars />
  </IngredientCard>
);
ManyFormsNarrow.meta = { theme: 'dark', width: 280 };

export const ManyFormsPhone: Story = () => (
  <IngredientCard {...BASE} kind="own" variants={MANY_FORMS}>
    <Jars />
  </IngredientCard>
);
ManyFormsPhone.meta = { theme: 'light', width: 375 };

// Retired, Annotated, Caution and Toxic together: the badges wrap and every row
// hugs the right edge.
export const AllMarks: Story = () => (
  <IngredientCard
    {...BASE}
    kind="cupboard"
    annotated
    retired
    safetyNotes="Keep away from open flame."
  >
    <Jars />
  </IngredientCard>
);
AllMarks.meta = { theme: 'dark', width: 300 };

// A long name and a long formal name with all four top badges: the name block
// and the badges cannot sit side by side, so the badges wrap beneath.
export const LongName: Story = () => (
  <IngredientCard
    {...BASE}
    kind="cupboard"
    annotated
    retired
    label="Testwort Longer Nameicanicusmus"
    formalName="Fixtura testalis longissimanicusmus"
    safetyNotes="Keep away from open flame."
  >
    <Jars />
  </IngredientCard>
);
LongName.meta = { theme: 'dark', width: 300 };

// Two buttons in the foot, right-aligned beneath the jar lines (M9.9, M9.10). Each
// sits above the card's link, so pressing one never opens the entry page.
export const WithActions: Story = () => (
  <IngredientCard
    {...BASE}
    kind="own"
    actions={
      <>
        <button type="button" className="btn btn--small">
          Use
        </button>
        <button type="button" className="btn btn--small">
          Restock
        </button>
      </>
    }
  >
    <Jars />
  </IngredientCard>
);
