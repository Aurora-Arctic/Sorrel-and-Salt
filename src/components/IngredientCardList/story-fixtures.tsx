import type { ReactNode } from 'react';
import type { EntryKind } from '../EntryMarks/types';
import type { SafetyVariant } from '../SafetyNote/types';
import type { NomenclatureKind } from '@/modules/ingredients/schema/ingredient-enums';
import JarLines from '../JarLines';
import type { CardCategory } from '../IngredientCard/types';

// Story-only data for the grid stories (index.stories.tsx). Invented
// names; one set of entries, so a current grid and its compact twin differ in
// spacing alone. Used by the grid stories.

const GROUPS = {
  protect: { colorDark: '#7aa7d9', colorLight: '#1f4f8a' },
  mind: { colorDark: '#c9a3e0', colorLight: '#6b2f8a' },
  hearth: { colorDark: '#e0b07a', colorLight: '#8a4f1f' },
  growth: { colorDark: '#8fd19a', colorLight: '#1f6a33' },
};

const cat = (name: string, group: keyof typeof GROUPS): CardCategory => ({
  category: { id: name, name },
  group: GROUPS[group],
});

const CATS = {
  protection: cat('Protection', 'protect'),
  clarity: cat('Clarity', 'mind'),
  hearth: cat('Hearth', 'hearth'),
  growth: cat('Growth', 'growth'),
  rest: cat('Rest', 'mind'),
  banishing: cat('Banishing', 'protect'),
};

const leaf = { group: { icon: 'botanical' as const } };
const fluid = { group: { icon: 'fluid' as const } };
const form = (
  name: string,
  extra: Partial<SafetyVariant> = {},
  choice: SafetyVariant['formChoice'] = null,
): SafetyVariant => ({ form: name, formChoice: choice, safetyNotes: '', ...extra });

interface Jar {
  form: string;
  quantity: number;
  threshold: number;
  unit: string;
}

export interface FixtureEntry {
  slug: string;
  label: string;
  formalName?: string;
  nomenclature?: NomenclatureKind;
  categories: CardCategory[];
  variants: SafetyVariant[];
  toxic?: boolean;
  safetyNotes?: string;
  /** How the entry shows on the coven's Ingredients page. */
  kind: EntryKind;
  retired?: boolean;
  /** The jars the coven holds: each names a form the card lists. */
  jars: Jar[];
}

// Nine entries. Lengths on purpose: a long name (Testwort Longer Nameicanicusmus),
// no formal name (Testseed, Testsalt), one form (Testite), five forms (Testflower), four
// categories (Testroot).
export const ENTRIES: FixtureEntry[] = [
  {
    slug: 'testwort',
    label: 'Testwort',
    formalName: 'Fixtura testalis',
    nomenclature: 'botanical',
    categories: [CATS.protection, CATS.clarity],
    variants: [
      form('dried leaf', {}, leaf),
      form('oil', { safetyNotes: 'Dilute before use.' }, fluid),
    ],
    kind: 'own',
    jars: [
      { form: 'dried leaf', quantity: 6, threshold: 10, unit: 'g' },
      { form: 'oil', quantity: 0, threshold: 10, unit: 'ml' },
    ],
  },
  {
    slug: 'testwort-longer',
    label: 'Testwort Longer Nameicanicusmus',
    formalName: 'Fixtura testalis longissimanicusmus',
    nomenclature: 'botanical',
    categories: [CATS.hearth],
    variants: [form('whole root'), form('powder')],
    toxic: true,
    kind: 'cupboard',
    retired: true,
    jars: [{ form: 'whole root', quantity: 40, threshold: 10, unit: 'g' }],
  },
  {
    slug: 'testseed',
    label: 'Testseed',
    categories: [CATS.growth],
    variants: [form('whole seed'), form('ground')],
    kind: 'cupboard',
    jars: [
      { form: 'whole seed', quantity: 120, threshold: 20, unit: 'g' },
      { form: 'ground', quantity: 15, threshold: 20, unit: 'g' },
    ],
  },
  {
    slug: 'testite',
    label: 'Testite',
    formalName: 'Testite crystallis',
    nomenclature: 'mineral',
    categories: [CATS.protection],
    variants: [form('tumbled stone')],
    kind: 'cupboard',
    jars: [{ form: 'tumbled stone', quantity: 3, threshold: 5, unit: 'pcs' }],
  },
  {
    slug: 'testflower',
    label: 'Testflower',
    formalName: 'Fixtura florens',
    nomenclature: 'botanical',
    categories: [CATS.rest, CATS.clarity],
    variants: [
      form('dried flower', {}, leaf),
      form('fresh flower', {}, leaf),
      form('essential oil', { safetyNotes: 'Never take by mouth.' }, fluid),
      form('tincture', {}, fluid),
      form('hydrosol', {}, fluid),
    ],
    kind: 'own',
    jars: [
      { form: 'dried flower', quantity: 30, threshold: 10, unit: 'g' },
      { form: 'essential oil', quantity: 4, threshold: 5, unit: 'ml' },
      { form: 'tincture', quantity: 60, threshold: 20, unit: 'ml' },
    ],
  },
  {
    slug: 'testroot',
    label: 'Testroot',
    formalName: 'Fixtura radicalis',
    nomenclature: 'botanical',
    categories: [CATS.protection, CATS.hearth, CATS.growth, CATS.banishing],
    variants: [form('dried root', {}, leaf), form('fresh root', {}, leaf), form('powder')],
    safetyNotes: 'Keep away from open flame.',
    kind: 'own',
    jars: [{ form: 'powder', quantity: 22, threshold: 10, unit: 'g' }],
  },
  {
    slug: 'testmoss',
    label: 'Testmoss',
    formalName: 'Muscus testensis',
    nomenclature: 'botanical',
    categories: [CATS.rest, CATS.growth],
    variants: [form('dried moss', {}, leaf)],
    toxic: true,
    kind: 'cupboard',
    retired: true,
    jars: [{ form: 'dried moss', quantity: 0, threshold: 10, unit: 'g' }],
  },
  {
    slug: 'testresin',
    label: 'Testresin',
    formalName: 'Resina testalis',
    nomenclature: 'botanical',
    categories: [CATS.hearth, CATS.protection],
    variants: [form('tears'), form('powder')],
    kind: 'own',
    jars: [
      { form: 'tears', quantity: 50, threshold: 10, unit: 'g' },
      { form: 'powder', quantity: 8, threshold: 10, unit: 'g' },
    ],
  },
  {
    slug: 'testsalt',
    label: 'Testsalt',
    nomenclature: 'none',
    categories: [CATS.banishing],
    variants: [form('coarse'), form('fine')],
    kind: 'cupboard',
    jars: [
      { form: 'coarse', quantity: 500, threshold: 100, unit: 'g' },
      { form: 'fine', quantity: 250, threshold: 100, unit: 'g' },
    ],
  },
];

// The fixture's jars as the component takes them; the group icon is looked up from the entry's
// variants, as the page will read it from the form's group.
export const jarLinesOf = (entry: FixtureEntry): ReactNode => (
  <JarLines
    jars={entry.jars.map(({ form, ...rest }) => ({
      ...rest,
      id: form,
      form,
      icon:
        entry.variants.find(({ form: variantForm }) => variantForm === form)?.formChoice?.group
          .icon ?? null,
    }))}
  />
);
