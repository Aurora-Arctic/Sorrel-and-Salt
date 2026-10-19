import type { Story } from '@ladle/react';
import IngredientCardList from '../IngredientCardList';
import type { SafetyVariant } from '../SafetyNote/types';
import { ENTRIES, JarLines } from './compact.fixtures';
import { Jars } from './story-jars';
import IngredientCard from '.';
import './compact.stories.scss';

// A throwaway sample of a compact card (the owner's ask), beside the real one.
// The real card is not changed: `.compact-sample` overrides from outside it
// (compact.stories.scss), and this file and that one can be deleted whole.
export default {
  title: 'Surfaces / Ingredient Card / Compact Sample',
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

const LONG = {
  ...BASE,
  kind: 'cupboard' as const,
  annotated: true,
  retired: true,
  label: 'Testwort Longer Nameicanicusmus',
  formalName: 'Fixtura testalis longissimanicusmus',
  safetyNotes: 'Keep away from open flame.',
};

const Own = () => (
  <IngredientCard {...BASE} kind="own">
    <Jars />
  </IngredientCard>
);

const Long = () => (
  <IngredientCard {...LONG}>
    <Jars />
  </IngredientCard>
);

const Pair = ({ children }: { children: (compact: boolean) => React.ReactNode }) => (
  <div className="compact-sample-pair">
    <div>
      <h3 className="compact-sample-pair__label">Current</h3>
      {children(false)}
    </div>
    <div className="compact-sample">
      <h3 className="compact-sample-pair__label">Compact</h3>
      {children(true)}
    </div>
  </div>
);

// The current card and the compact one, on the same data: OwnWithJars, then LongName.
export const SideBySide: Story = () => (
  <>
    <Pair>{() => <Own />}</Pair>
    <br />
    <Pair>{() => <Long />}</Pair>
  </>
);

// The real grid filled with compact cards, at a narrower minimum column.
export const CompactGrid: Story = () => (
  <div className="compact-sample">
    <IngredientCardList label="Ingredients">
      <Own />
      <Long />
      <IngredientCard
        href="/compendium/ingredients/testite"
        label="Testite"
        formalName="Fixtura testite"
        nomenclature="mineral"
        kind="compendium"
        categories={CATEGORIES.slice(0, 1)}
      />
      <IngredientCard
        {...BASE}
        label="Testroot"
        kind="own"
        variants={[VARIANTS[0]]}
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
        <Jars jars={['leaf']} />
      </IngredientCard>
      <IngredientCard {...BASE} label="Testseed" kind="compendium" />
      <IngredientCard {...BASE} label="Testflower" kind="own" variants={[VARIANTS[1]]}>
        <Jars jars={['oil']} />
      </IngredientCard>
    </IngredientCardList>
  </div>
);

// The compact card at a phone's width: set the viewport to 375px.
export const CompactPhone: Story = () => (
  <div className="compact-sample">
    <Own />
    <br />
    <Long />
  </div>
);
CompactPhone.meta = { width: 375 };

// Four grids on the same nine entries, for the two pages that use the card: the
// public compendium (M8.18: no marks of whose, no jars, no actions) and the coven's
// Ingredients page (M9.6: marks, jar lines, Edit and Delete). Current spacing and
// compact spacing differ in nothing else.
const CompendiumGrid = () => (
  <IngredientCardList label="Compendium">
    {ENTRIES.map((e) => (
      <IngredientCard
        key={e.slug}
        href={`/compendium/ingredients/${e.slug}` as const}
        label={e.label}
        formalName={e.formalName}
        nomenclature={e.nomenclature}
        categories={e.categories}
        variants={e.variants}
        toxic={e.toxic}
        safetyNotes={e.safetyNotes}
        kind="compendium"
      />
    ))}
  </IngredientCardList>
);

const CupboardGrid = () => (
  <IngredientCardList label="Ingredients">
    {ENTRIES.map((e) => (
      <IngredientCard
        key={e.slug}
        href={`/coven/test-coven/ingredients/${e.slug}` as const}
        label={e.label}
        formalName={e.formalName}
        nomenclature={e.nomenclature}
        categories={e.categories}
        variants={e.variants}
        toxic={e.toxic}
        safetyNotes={e.safetyNotes}
        kind={e.kind}
        annotated={e.annotated}
        retired={e.retired}
        actions={
          <>
            <button type="button" className="btn btn--small">
              Edit
            </button>
            <button type="button" className="btn btn--small btn--destructive">
              Delete
            </button>
          </>
        }
      >
        <JarLines jars={e.jars} />
      </IngredientCard>
    ))}
  </IngredientCardList>
);

export const CompendiumGridCurrent: Story = () => <CompendiumGrid />;
export const CompendiumGridCompact: Story = () => (
  <div className="compact-sample">
    <CompendiumGrid />
  </div>
);
export const CupboardGridCurrent: Story = () => <CupboardGrid />;
export const CupboardGridCompact: Story = () => (
  <div className="compact-sample">
    <CupboardGrid />
  </div>
);
