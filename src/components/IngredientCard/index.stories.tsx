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

// A stand-in for M9.6’s jar lines, to the card’s contract: one `li` per jar,
// the form and quantity first and the stock badge last. The dot is hidden from
// assistive technology, as on the forms line.
const Jars = () => (
  <ul>
    <li>
      <span>
        Dried leaf <span aria-hidden="true">·</span> 6 g
      </span>
      <StockBadge quantity={6} threshold={10} unit="g" />
    </li>
    <li>
      <span>
        Oil <span aria-hidden="true">·</span> 0 ml
      </span>
      <StockBadge quantity={0} threshold={10} unit="ml" />
    </li>
  </ul>
);

// The public compendium: no cupboard mark, no jar lines.
export const Compendium: Story = () => <IngredientCard {...BASE} kind="compendium" />;

// A coven's own entry, with the jar lines M9.6 will fill the slot with.
export const OwnWithJars: Story = () => (
  <IngredientCard {...BASE} kind="own">
    <Jars />
  </IngredientCard>
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
