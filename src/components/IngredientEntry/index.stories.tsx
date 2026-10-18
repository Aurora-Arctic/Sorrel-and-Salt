import type { Story } from '@ladle/react';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import IngredientEntry from '.';
import type { IngredientEntryProps } from './types';
import type {
  CategoryDetail,
  CitedReference,
  IngredientDetail,
  IngredientRow,
  IngredientVariantRow,
  VariantDetail,
} from '@/modules/ingredients';

// Render-only; what shows and when is asserted in tests/components/IngredientEntry.
// Every name is invented. The links go nowhere in the workshop.
export default {
  title: 'Pages / Ingredient Entry',
};

const STAMPS = {
  createdAt: new Date('2026-01-01T00:00:00Z'),
  createdBy: '00000000-0000-4000-8000-0000000000aa',
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  updatedBy: '00000000-0000-4000-8000-0000000000aa',
  deletedAt: null,
  deletedBy: null,
};

let serial = 0;
const nextId = (): string => `00000000-0000-4000-8000-${(++serial).toString().padStart(12, '0')}`;

function entryRow(overrides: Partial<IngredientRow> = {}): IngredientRow {
  return {
    id: nextId(),
    workspaceId: null,
    name: 'Testwort',
    slug: 'testwort-fixtura-testalis',
    canonicalName: 'Fixtura testalis',
    nomenclature: 'botanical',
    identityKey: 'fixtura testalis',
    description:
      'A low, grey-leaved fixture herb of dry banks, gathered at dusk and hung to dry in bundles. ' +
      'Its smoke is said to settle a restless house.',
    elements: ['fire', 'air'],
    celestialBodies: ['Fixture Moon'],
    zodiacSigns: ['Testarius'],
    colors: ['Grey', 'Silver'],
    safetyNotes: 'Not for use while pregnant.',
    toxic: false,
    seedKey: null,
    ...STAMPS,
    ...overrides,
  };
}

function variant(
  form: string,
  overrides: Partial<IngredientVariantRow> = {},
  extra: Partial<Omit<VariantDetail, 'variant'>> = {},
): VariantDetail {
  return {
    variant: {
      id: nextId(),
      ingredientId: '00000000-0000-4000-8000-000000000001',
      workspaceId: null,
      form,
      formId: null,
      description: null,
      safetyNotes: null,
      toxic: false,
      elements: null,
      celestialBodies: null,
      zodiacSigns: null,
      colors: null,
      ...STAMPS,
      ...overrides,
    },
    icon: null,
    categories: [],
    substitutes: [],
    references: [],
    ...extra,
  };
}

function cited(
  title: string,
  locator: string | null = null,
  url: string | null = null,
): CitedReference {
  return {
    reference: {
      id: nextId(),
      workspaceId: null,
      kind: url ? 'web_page' : 'book',
      title,
      authors: 'Fixture, Ada',
      container: url ? 'Fixture Herbal Online' : null,
      contributors: null,
      edition: null,
      volume: null,
      issue: null,
      series: null,
      place: null,
      publisher: null,
      published: '1988',
      pages: null,
      host: null,
      url,
      modified: null,
      accessed: url ? '2026-01-01' : null,
      note: null,
      seedKey: null,
      ...STAMPS,
    },
    locator,
  };
}

function category(name: string, colorDark: string, colorLight: string): CategoryDetail {
  const groupId = nextId();
  return {
    category: {
      id: nextId(),
      name,
      slug: name.toLowerCase(),
      description: 'A fixture category.',
      seedKey: null,
      groupId,
      ...STAMPS,
    },
    group: {
      id: groupId,
      name: `${name} Group`,
      slug: `${name.toLowerCase()}-group`,
      description: 'A fixture group.',
      seedKey: null,
      colorDark,
      colorLight,
      ...STAMPS,
    },
  };
}

const WARDING = category('Fixture Warding', '#7fb38a', '#2f6b3c');
const DREAMS = category('Testdreams', '#c79bd8', '#6d3d82');

const MOCKROOT = { id: nextId(), slug: 'fixture-mockroot', workspaceId: null };

const FULL: IngredientDetail = {
  entry: entryRow(),
  folkNames: ['Fixture Bane', 'Grey Testing Weed'],
  categories: [WARDING, DREAMS],
  deities: [
    { name: 'Fixtura', tradition: 'Fixture Pantheon' },
    { name: 'Testis', tradition: null },
  ],
  substitutes: [
    { name: 'Fixture Mockroot', ingredient: MOCKROOT, form: null },
    { name: 'Fixture Mockroot', ingredient: MOCKROOT, form: 'oil' },
    { name: 'a pinch of grey ash', ingredient: null, form: null },
  ],
  references: [
    cited('A Herbal of Fixture Covens', 'p. 112'),
    cited('Testwort in the Dry Bank', null, 'https://fixtures.example/testwort'),
  ],
  variants: [
    variant(
      'oil',
      {
        description: 'Pressed from the seed; thin and pale.',
        safetyNotes: 'Dilute before it touches skin.\nNever take by mouth.',
        toxic: true,
        colors: ['Gold'],
      },
      {
        icon: 'fluid',
        categories: [DREAMS],
        references: [cited('The Oils of Fixtura', 'ch. 3')],
      },
    ),
    // Typed rather than curated, so it has no group's icon and draws the spoon.
    variant('smoke bundle', { description: 'Stems bound with fixture thread.' }),
  ],
};

const hrefOf: IngredientEntryProps['hrefOf'] = (ingredient) =>
  `/compendium/ingredients/${ingredient.slug}` as Route;

/** A page's main, as the routes give it. */
const Page = ({ children }: { children: ReactNode }) => (
  <main className="page-column">{children}</main>
);

const Entry = (props: Partial<IngredientEntryProps>) => (
  <Page>
    <IngredientEntry detail={FULL} hrefOf={hrefOf} {...props} />
  </Page>
);

// A compendium entry with two forms: the oil toxic with its own caution, the
// bundle typed, so its heading takes the spoon.
export const CompendiumEntry: Story = () => <Entry />;

// No naming system names it: a sentence where the formal name would be.
export const NoFormalName: Story = () => (
  <Entry
    detail={{
      ...FULL,
      entry: entryRow({
        name: 'Fixture Crossroads Dust',
        canonicalName: null,
        nomenclature: 'none',
      }),
      variants: [],
    }}
  />
);

// Unsettled, with a name recorded: upright, and marked unconfirmed.
export const UnknownWithName: Story = () => (
  <Entry
    detail={{
      ...FULL,
      entry: entryRow({ canonicalName: 'Fixtura incerta', nomenclature: 'unknown' }),
    }}
  />
);

// Unsettled, and nobody has looked it up yet.
export const UnknownWithoutName: Story = () => (
  <Entry
    detail={{
      ...FULL,
      entry: entryRow({ canonicalName: null, nomenclature: 'unknown' }),
    }}
  />
);

// Empty everywhere it can be: each block says so rather than standing blank.
export const NothingRecorded: Story = () => (
  <Entry
    detail={{
      entry: entryRow({
        name: 'Fixture Spar',
        canonicalName: 'Fixture spar',
        nomenclature: 'mineral',
        description: null,
        elements: null,
        celestialBodies: null,
        zodiacSigns: null,
        colors: null,
        safetyNotes: null,
      }),
      folkNames: [],
      categories: [],
      deities: [],
      substitutes: [],
      references: [],
      variants: [variant('chip')],
    }}
  />
);

// A coven's own entry, badged Local. Its Edit is M8.17's, so none yet.
export const CovenEntry: Story = () => (
  <Entry
    detail={{
      ...FULL,
      entry: entryRow({ workspaceId: '00000000-0000-4000-8000-0000000000c1' }),
    }}
  />
);

// A compendium entry as a curator reads it on a coven's route: Edit opens the
// compendium's edit modal over the page (it has no router here, so a press
// follows the link), and the link to its public page.
export const CompendiumEntryForCurator: Story = () => (
  <Entry
    edit={{
      href: '/compendium/ingredients/testwort-fixtura-testalis?edit' as Route,
      closeHref: '/compendium/ingredients/testwort-fixtura-testalis' as Route,
      deletedHref: '/compendium' as Route,
    }}
    canonical={'/compendium/ingredients/testwort-fixtura-testalis' as Route}
  />
);

// Another entry moved off this address while its redirect's window is open.
export const MovedAway: Story = () => (
  <Entry
    movedAway={{
      name: 'Fixture Movedwort',
      href: '/compendium/ingredients/fixture-movedwort' as Route,
    }}
  />
);

// A form held but adding nothing: its section still stands, saying so.
export const FormAddsNothing: Story = () => (
  <Entry
    detail={{ ...FULL, variants: [variant('root'), variant('dried leaf', { toxic: true })] }}
  />
);

export const PhoneDark: Story = () => <Entry />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Entry />;
PhoneLight.meta = { theme: 'light', width: 375 };
