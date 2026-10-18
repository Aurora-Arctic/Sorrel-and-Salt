import type { Story } from '@ladle/react';
import { StockBadge } from '../StockBadge';
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

const BASE = {
  href: '/compendium/ingredients/testwort-testalis' as const,
  label: 'Testwort',
  formalName: 'Fixtura testalis',
  variants: VARIANTS,
};

const Jars = () => (
  <ul style={{ margin: 0, paddingInlineStart: 0, listStyle: 'none' }}>
    <li>
      Dried leaf, 6 g <StockBadge quantity={6} threshold={10} unit="g" />
    </li>
    <li>
      Oil, 0 ml <StockBadge quantity={0} threshold={10} unit="ml" />
    </li>
  </ul>
);

// The public compendium: no cupboard mark, no jar lines.
export const Compendium: Story = () => <IngredientCard {...BASE} kind="compendium" />;

// A coven's own entry, with the jar lines M9.6 will fill the slot with.
export const OwnWithJars: Story = () => (
  <IngredientCard {...BASE} kind="own" safetyNotes="Keep away from pets.">
    <Jars />
  </IngredientCard>
);

export const InCupboardAnnotated: Story = () => (
  <IngredientCard {...BASE} kind="cupboard" annotated label="Our Testwort">
    <Jars />
  </IngredientCard>
);

export const Retired: Story = () => <IngredientCard {...BASE} kind="cupboard" retired />;

export const PhoneDark: Story = () => (
  <IngredientCard {...BASE} kind="own" safetyNotes="Keep away from pets.">
    <Jars />
  </IngredientCard>
);
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => (
  <IngredientCard {...BASE} kind="own" safetyNotes="Keep away from pets.">
    <Jars />
  </IngredientCard>
);
PhoneLight.meta = { theme: 'light', width: 375 };
