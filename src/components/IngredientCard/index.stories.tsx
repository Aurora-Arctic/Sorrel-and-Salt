import type { Story } from '@ladle/react';
import { Jars } from './story-jars';
import IngredientCard from '.';
import type { SafetyVariant } from '../SafetyNote/types';
import DetailsLink from '../IngredientEntry/details-link';
import { detailsHeading } from '../IngredientEntry/details';

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

// The public compendium: no cupboard mark, no jar lines. The oil form carries notes and
// the Toxic flag, so Toxic shows alone: it wins over Caution.
export const Compendium: Story = () => <IngredientCard {...BASE} kind="compendium" />;

// A coven's own entry, with the jar lines M9.6 will fill the slot with.
export const OwnWithJars: Story = () => (
  <IngredientCard {...BASE} kind="own">
    <Jars />
  </IngredientCard>
);

// Caution alone: notes on the entry, no form flagged.
export const Caution: Story = () => (
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

// A compendium entry the cupboard holds, under its own label: the card shows neither Compendium
// nor Annotated, which the entry page shows (the owner's call, 2026-10-20).
export const InCupboard: Story = () => (
  <IngredientCard {...BASE} kind="cupboard" label="Our Testwort">
    <Jars />
  </IngredientCard>
);

export const Retired: Story = () => <IngredientCard {...BASE} kind="cupboard" retired />;

// Many forms, so the forms line wraps in a narrow column: no dot leads or ends a line.
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

export const ManyForms: Story = () => (
  <IngredientCard {...BASE} kind="own" variants={MANY_FORMS}>
    <Jars />
  </IngredientCard>
);

// The coven's card: no forms line (the jar lines name each form held, and the pencil edits them).
export const NoFormsLine: Story = () => (
  <IngredientCard {...BASE} kind="own" forms={false}>
    <Jars />
  </IngredientCard>
);

// Retired under the formal name and Toxic beside the name, Toxic winning over Caution.
export const RetiredCaution: Story = () => (
  <IngredientCard {...BASE} kind="cupboard" retired safetyNotes="Keep away from open flame.">
    <Jars />
  </IngredientCard>
);

// A long name and a long formal name: the name wraps with the safety badge still beside
// its first word, and Retired sits under the formal name.
export const LongName: Story = () => (
  <IngredientCard
    {...BASE}
    kind="cupboard"
    retired
    label="Testwort Longer Nameicanicusmus"
    formalName="Fixtura testalis longissimanicusmus"
    safetyNotes="Keep away from open flame."
  >
    <Jars />
  </IngredientCard>
);

// A name of one long word: the safety badge stays beside it while the word fits, and
// drops below it, after the row under the formal name, once it would break.
export const OneLongWord: Story = () => (
  <IngredientCard {...BASE} kind="own" label="Testwortnameicanicusmuslongus">
    <Jars />
  </IngredientCard>
);

// No formal name: the label stands alone.
export const NoFormalName: Story = () => (
  <IngredientCard {...BASE} kind="own" formalName={undefined} nomenclature="none">
    <Jars />
  </IngredientCard>
);

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

// The coven's Quick Look eye in the start slot, at the foot's bottom left, with the
// other actions kept at its right (M12.5). In a story the eye is a plain link.
export const WithStartActions: Story = () => (
  <IngredientCard
    {...BASE}
    kind="own"
    startActions={
      <DetailsLink
        opens={{
          href: '/coven/fixture/ingredients?entry=testwort',
          heading: detailsHeading({
            name: BASE.label,
            canonicalName: BASE.formalName,
            nomenclature: BASE.nomenclature,
          }),
        }}
        name={`${BASE.label}, ${BASE.formalName}`}
      />
    }
    actions={
      <button type="button" className="btn btn--small">
        Restock
      </button>
    }
  >
    <Jars />
  </IngredientCard>
);

// More categories than the card's chip limit: the first two show and the rest sit behind +N,
// at the card's narrowest width (20rem). Hover, focus or click the button to see the panel.
export const ManyCategories: Story = () => (
  <div style={{ inlineSize: '20rem' }}>
    <IngredientCard
      {...BASE}
      categories={['Binding', 'Clarity', 'Healing', 'Protection', 'Sleep', 'Strength'].map(
        (name, index) => ({
          category: { id: name, name },
          group: CATEGORIES[index % CATEGORIES.length].group,
        }),
      )}
    />
  </div>
);

// The compact look, which the coven's Ingredients page can choose (M9.6). The card has no
// density prop: an ancestor's `data-density` switches it, as `IngredientCardList` sets it.
export const Compact: Story = () => (
  <div data-density="compact">
    <IngredientCard {...BASE} kind="own">
      <Jars />
    </IngredientCard>
  </div>
);

export const CompactLongName: Story = () => (
  <div data-density="compact">
    <IngredientCard
      {...BASE}
      kind="cupboard"
      retired
      label="Testwort Longer Nameicanicusmus"
      formalName="Fixtura testalis longissimanicusmus"
      safetyNotes="Keep away from open flame."
    >
      <Jars />
    </IngredientCard>
  </div>
);

export const NewEntry: Story = () => <IngredientCard {...BASE} kind="compendium" recency="new" />;

export const UpdatedEntry: Story = () => (
  <IngredientCard {...BASE} kind="compendium" recency="updated" />
);

// New or Updated sits just left of the safety badge in the card's top-right corner, and the
// safety badge keeps the very corner (the owner's call, 2026-10-20). NewEntry shows both; these
// show the mark alone in the corner, and both beside a long name that wraps.
export const NewWithoutSafety: Story = () => (
  <IngredientCard
    {...BASE}
    kind="compendium"
    recency="new"
    variants={VARIANTS.map((v) => ({ ...v, toxic: false, safetyNotes: '' }))}
  />
);

export const NewLongName: Story = () => (
  <IngredientCard
    {...BASE}
    kind="cupboard"
    retired
    recency="updated"
    label="Testwort Longer Nameicanicusmus"
    formalName="Fixtura testalis longissimanicusmus"
  >
    <Jars />
  </IngredientCard>
);

// The newest edit across the ingredient's jars (M6.18): who, and when, under the jar lines.
export const LastEdited: Story = () => (
  <IngredientCard
    {...BASE}
    kind="own"
    forms={false}
    lastEdit={{ by: 'Fixture A', at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() }}
  >
    <Jars />
  </IngredientCard>
);
