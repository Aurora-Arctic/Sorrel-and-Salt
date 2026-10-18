import type { Story } from '@ladle/react';
import IngredientCard from '../IngredientCard';
import { Jars } from '../IngredientCard/story-jars';
import type { SafetyVariant } from '../SafetyNote/types';
import IngredientCardList from '.';

// Render-only; the wrapping is asserted in tests/components/IngredientCardList.
// About six mixed cards, to see the grid at a phone, a tablet and a desktop
// width: the preview ignores `meta.width`, so set the viewport to check.
export default {
  title: 'Surfaces / Ingredient Card List',
};

const GROUP = { colorDark: '#7aa7d9', colorLight: '#1f4f8a' };
const CHIPS = [{ category: { id: 'c1', name: 'Protection' }, group: GROUP }];
const LEAF: SafetyVariant = {
  form: 'dried leaf',
  formChoice: { group: { icon: 'botanical' } },
  safetyNotes: '',
};
const OIL: SafetyVariant = {
  form: 'oil',
  formChoice: { group: { icon: 'fluid' } },
  safetyNotes: 'Dilute before it touches skin.',
  toxic: true,
};

const href = (slug: string) => `/compendium/ingredients/${slug}` as const;

// Mixed on purpose: some with jar lines and some without, with and without
// marks and chips, one with actions, so rows of unequal height show the foot
// landing on one line.
const Cards = () => (
  <IngredientCardList label="Ingredients">
    <IngredientCard
      href={href('testwort')}
      label="Testwort"
      formalName="Fixtura testalis"
      nomenclature="botanical"
      kind="compendium"
      categories={CHIPS}
      variants={[LEAF, OIL]}
    />
    <IngredientCard
      href={href('testroot')}
      label="Testroot"
      kind="own"
      categories={CHIPS}
      variants={[LEAF]}
    >
      <Jars />
    </IngredientCard>
    <IngredientCard
      href={href('testite')}
      label="Testite"
      formalName="Fixtura testite"
      nomenclature="mineral"
      kind="compendium"
    />
    <IngredientCard
      href={href('testbark')}
      label="Our Testbark"
      formalName="Fixtura corticalis"
      nomenclature="botanical"
      kind="cupboard"
      annotated
      retired
      categories={CHIPS}
      variants={[LEAF]}
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
    <IngredientCard href={href('testflower')} label="Testflower" kind="own" variants={[OIL]}>
      <Jars />
    </IngredientCard>
    <IngredientCard
      href={href('testseed')}
      label="Testseed"
      formalName="Fixtura seminalis"
      nomenclature="botanical"
      kind="compendium"
      categories={CHIPS}
      variants={[LEAF]}
    />
  </IngredientCardList>
);

export const Grid: Story = () => <Cards />;
