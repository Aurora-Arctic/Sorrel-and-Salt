import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';
import { StatesGrid } from '../../../.storybook/states-grid';
import { Jars } from './story-jars';
import IngredientCard from '.';
import { categoryRefs } from './category-refs';
import { CardCategoryVocabulary } from './category-vocabulary';
import { IngredientCardSkeleton } from './skeleton';
import type { SafetyVariant } from '../SafetyNote/types';
import DetailsLink from '../IngredientEntry/details-link';
import { detailsHeading } from '../IngredientEntry/details';
import { route } from '../../../.storybook/route';


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

const MANY_CATEGORIES = ['Binding', 'Clarity', 'Healing', 'Protection', 'Sleep', 'Strength'].map(
  (name, index) => ({
    category: { id: name, name },
    group: CATEGORIES[index % CATEGORIES.length].group,
  }),
);

// The cards name their categories by id, as a list's do; this is the list's vocabulary.
const VOCABULARY = [...CATEGORIES, ...MANY_CATEGORIES].map(({ category, group }) => ({
  ...category,
  group,
}));

const meta = {
  title: 'Ingredients / Ingredient Card',
  decorators: [
    (Story) => (
      <CardCategoryVocabulary categories={VOCABULARY}>
        <Story />
      </CardCategoryVocabulary>
    ),
  ],
} satisfies Meta;

const BASE = {
  href: route('/compendium/ingredients/testwort-testalis'),
  label: 'Testwort',
  formalName: 'Fixtura testalis',
  nomenclature: 'botanical' as const,
  categories: categoryRefs(CATEGORIES),
  variants: VARIANTS,
};

const defaultNode = <IngredientCard {...BASE} kind="compendium" />;

const ownWithJarsNode = (
  <IngredientCard {...BASE} kind="own">
    <Jars />
  </IngredientCard>
);

const cautionNode = (
  <IngredientCard
    {...BASE}
    kind="compendium"
    variants={VARIANTS.filter((v) => !v.toxic)}
    safetyNotes="Keep away from open flame."
  />
);

const mineralNameNode = (
  <IngredientCard
    {...BASE}
    kind="compendium"
    label="Testite"
    formalName="Fixtura testite"
    nomenclature="mineral"
  />
);

const inCupboardNode = (
  <IngredientCard {...BASE} kind="cupboard" label="Our Testwort">
    <Jars />
  </IngredientCard>
);

const retiredNode = <IngredientCard {...BASE} kind="cupboard" retired />;

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

const noFormsLineNode = (
  <IngredientCard {...BASE} kind="own" forms={false}>
    <Jars />
  </IngredientCard>
);

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

const oneLongWordNode = (
  <IngredientCard {...BASE} kind="own" label="Testwortnameicanicusmuslongus">
    <Jars />
  </IngredientCard>
);

const noFormalNameNode = (
  <IngredientCard {...BASE} kind="own" formalName={undefined} nomenclature="none">
    <Jars />
  </IngredientCard>
);

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

const manyCategoriesNode = (
  <div style={{ inlineSize: '20rem' }}>
    <IngredientCard
      {...BASE}
      kind="compendium"
      categories={categoryRefs(MANY_CATEGORIES)}
    />
  </div>
);

const compactNode = (
  <div data-density="compact">
    <IngredientCard {...BASE} kind="own">
      <Jars />
    </IngredientCard>
  </div>
);

const newAndUpdatedNode = (
  <>
    <IngredientCard {...BASE} kind="compendium" recency="new" />
    <IngredientCard {...BASE} kind="compendium" recency="updated" />
  </>
);

const newWithoutSafetyNode = (
  <IngredientCard
    {...BASE}
    kind="compendium"
    recency="new"
    variants={VARIANTS.map((v) => ({ ...v, toxic: false, safetyNotes: '' }))}
  />
);

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
          Loading: <IngredientCardSkeleton />,
        }}
      />
    );
  },
};
