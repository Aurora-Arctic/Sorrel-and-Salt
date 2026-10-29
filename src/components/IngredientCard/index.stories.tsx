import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import { StatesGrid } from '../../../.storybook/states-grid';
import { Jars } from './story-jars';
import IngredientCard from '.';
import type { SafetyVariant } from '../SafetyNote/types';
import DetailsLink from '../IngredientEntry/details-link';
import { detailsHeading } from '../IngredientEntry/details';
import { route } from '../../../.storybook/route';

// Render-only; what shows and when is asserted in tests/components/IngredientCard.
const meta = {
  title: 'Ingredients / Ingredient Card',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ onUse: () => void; onRestock: () => void; lastPressed: string }>;

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
  href: route('/compendium/ingredients/testwort-testalis'),
  label: 'Testwort',
  formalName: 'Fixtura testalis',
  nomenclature: 'botanical' as const,
  categories: CATEGORIES,
  variants: VARIANTS,
};

// The public compendium: no cupboard mark, no jar lines. The oil form carries notes and
// the Toxic flag, so Toxic shows alone: it wins over Caution.
const defaultNode = <IngredientCard {...BASE} kind="compendium" />;

// A coven's own entry, with the jar lines in its slot.
const ownWithJarsNode = (
  <IngredientCard {...BASE} kind="own">
    <Jars />
  </IngredientCard>
);

// Caution alone: notes on the entry, no form flagged.
const cautionNode = (
  <IngredientCard
    {...BASE}
    kind="compendium"
    variants={VARIANTS.filter((v) => !v.toxic)}
    safetyNotes="Keep away from open flame."
  />
);

// A mineral’s formal name is upright, not italic.
const mineralNameNode = (
  <IngredientCard
    {...BASE}
    kind="compendium"
    label="Testite"
    formalName="Fixtura testite"
    nomenclature="mineral"
  />
);

// A compendium entry the cupboard holds, under its own label: the card shows neither Compendium
// nor Annotated, which the entry page shows.
const inCupboardNode = (
  <IngredientCard {...BASE} kind="cupboard" label="Our Testwort">
    <Jars />
  </IngredientCard>
);

const retiredNode = <IngredientCard {...BASE} kind="cupboard" retired />;

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

const manyFormsNode = (
  <IngredientCard {...BASE} kind="own" variants={MANY_FORMS}>
    <Jars />
  </IngredientCard>
);

// The coven's card: no forms line (the jar lines name each form held, and the pencil edits them).
const noFormsLineNode = (
  <IngredientCard {...BASE} kind="own" forms={false}>
    <Jars />
  </IngredientCard>
);

// A long name and a long formal name: the name wraps with the safety badge and the Updated mark
// still beside its first word, and Retired sits under the formal name.
const longNameNode = (
  <IngredientCard
    {...BASE}
    kind="cupboard"
    retired
    recency="updated"
    label="Testwort Longer Nameicanicusmus"
    formalName="Fixtura testalis longissimanicusmus"
    safetyNotes="Keep away from open flame."
  >
    <Jars />
  </IngredientCard>
);

// A name of one long word: the safety badge stays beside it while the word fits, and
// drops below it, after the row under the formal name, once it would break.
const oneLongWordNode = (
  <IngredientCard {...BASE} kind="own" label="Testwortnameicanicusmuslongus">
    <Jars />
  </IngredientCard>
);

// No formal name: the label stands alone.
const noFormalNameNode = (
  <IngredientCard {...BASE} kind="own" formalName={undefined} nomenclature="none">
    <Jars />
  </IngredientCard>
);

// Two buttons in the foot, right-aligned beneath the jar lines. Each
// sits above the card's link, so pressing one never opens the entry page. In the
// app each opens the stock dialog; here each calls the handler the story was
// given (logged in the Actions panel) and the line beneath the card names the
// last one pressed.
const withActionsNode = (
  onUse: () => void,
  onRestock: () => void,
  lastPressed: string,
): ReactNode => (
  <>
    <IngredientCard
      {...BASE}
      kind="own"
      actions={
        <>
          <button type="button" className="btn btn--small" onClick={onUse}>
            Use
          </button>
          <button type="button" className="btn btn--small" onClick={onRestock}>
            Restock
          </button>
        </>
      }
    >
      <Jars />
    </IngredientCard>
    <output>{lastPressed ? `${lastPressed} pressed` : 'Nothing pressed'}</output>
  </>
);

// The coven's Quick Look eye in the start slot, at the foot's bottom left, with the
// other actions kept at its right. In a story the eye is a plain link.
const withStartActionsNode = (onRestock: () => void): ReactNode => (
  <IngredientCard
    {...BASE}
    kind="own"
    startActions={
      <DetailsLink
        opens={{
          href: route('/coven/fixture/ingredients?entry=testwort'),
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
      <button type="button" className="btn btn--small" onClick={onRestock}>
        Restock
      </button>
    }
  >
    <Jars />
  </IngredientCard>
);

// More categories than the card's chip limit: the first two show and the rest sit behind +N,
// at the card's narrowest width (20rem). Hover, focus or click the button to see the panel.
const manyCategoriesNode = (
  <div style={{ inlineSize: '20rem' }}>
    <IngredientCard
      {...BASE}
      kind="compendium"
      categories={['Binding', 'Clarity', 'Healing', 'Protection', 'Sleep', 'Strength'].map(
        (name, index) => ({
          category: { id: name, name },
          group: CATEGORIES[index % CATEGORIES.length].group,
        }),
      )}
    />
  </div>
);

// The compact look, which the coven's Ingredients page can choose. The card has no
// density prop: an ancestor's `data-density` switches it, as `IngredientCardList` sets it.
const compactNode = (
  <div data-density="compact">
    <IngredientCard {...BASE} kind="own">
      <Jars />
    </IngredientCard>
  </div>
);

// The two recency marks, one card each.
const newAndUpdatedNode = (
  <>
    <IngredientCard {...BASE} kind="compendium" recency="new" />
    <IngredientCard {...BASE} kind="compendium" recency="updated" />
  </>
);

// New or Updated sits just left of the safety badge in the card's top-right corner, and the
// safety badge keeps the very corner. NewAndUpdated shows it beside the badge;
// this shows the mark alone in the corner.
const newWithoutSafetyNode = (
  <IngredientCard
    {...BASE}
    kind="compendium"
    recency="new"
    variants={VARIANTS.map((v) => ({ ...v, toxic: false, safetyNotes: '' }))}
  />
);

// The newest edit across the ingredient's jars: who, and when, under the jar lines.
const lastEditedNode = (
  <IngredientCard
    {...BASE}
    kind="own"
    forms={false}
    lastEdit={{
      by: 'Fixture A',
      at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    }}
  >
    <Jars />
  </IngredientCard>
);

// Every state of the card in one grid. The cell is the card's narrowest column.
export const States: Story = {
  args: { onUse: fn(), onRestock: fn(), lastPressed: '' },
  render: function Render({ onUse, onRestock, lastPressed }) {
    const [, updateArgs] = useArgs<{ lastPressed: string }>();
    const use = () => {
      onUse();
      updateArgs({ lastPressed: 'Use' });
    };
    const restock = () => {
      onRestock();
      updateArgs({ lastPressed: 'Restock' });
    };
    return (
      <StatesGrid
        cell="22rem"
        states={{
          'Own With Jars': ownWithJarsNode,
          Caution: cautionNode,
          'Mineral Name': mineralNameNode,
          'In Cupboard': inCupboardNode,
          Retired: retiredNode,
          'Many Forms': manyFormsNode,
          'No Forms Line': noFormsLineNode,
          'Long Name': longNameNode,
          'One Long Word': oneLongWordNode,
          'No Formal Name': noFormalNameNode,
          'With Actions': withActionsNode(use, restock, lastPressed),
          'With Start Actions': withStartActionsNode(restock),
          'Many Categories': manyCategoriesNode,
          Compact: compactNode,
          'New And Updated': newAndUpdatedNode,
          'New Without Safety': newWithoutSafetyNode,
          'Last Edited': lastEditedNode,
          Compendium: defaultNode,
        }}
      />
    );
  },
};
