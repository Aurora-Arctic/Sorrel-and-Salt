import type { Story } from '@ladle/react';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import { Reopenable } from '../../../.ladle/reopenable';
import IngredientEntry from '.';
import DetailsDialog from './details-dialog';
import { detailsHeading } from './details';
import { EDIT_ENTRY_EYEBROW } from './edit-heading';
import IngredientSummary from './summary';
import type { IngredientDetailsOpened, IngredientEntryProps } from './types';
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

/** A coven's cupboard row over FULL's entry; every override null unless given. */
const cupboardEntry = (
  overrides: Partial<NonNullable<IngredientDetail['cupboardEntry']>> = {},
): NonNullable<IngredientDetail['cupboardEntry']> => ({
  id: nextId(),
  workspaceId: '00000000-0000-4000-8000-0000000000c1',
  ingredientId: '00000000-0000-4000-8000-000000000001',
  label: null,
  description: null,
  safetyNotes: null,
  elements: null,
  celestialBodies: null,
  zodiacSigns: null,
  colors: null,
  ...STAMPS,
  ...overrides,
});

const FULL: IngredientDetail = {
  entry: entryRow(),
  retired: false,
  cupboardEntry: null,
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
const COMPENDIUM_CASE: NonNullable<IngredientEntryProps['replaces']> = {
  tip: 'This is the compendium’s entry. The link opens its public page.',
  entries: [
    {
      title: 'Testwort (Fixtura testalis)',
      href: '/compendium/ingredients/testwort-fixtura-testalis' as Route,
    },
  ],
  total: 1,
};

const LOCAL_TIP =
  'The compendium holds an entry with this same formal name. Your coven’s entry and it stay separate; compare them here.';

const SIMILAR_TIP =
  'Your entry has no formal name, so these compendium entries only share its name.';

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

// A compendium entry this coven holds in its cupboard, with nothing changed
// (M12.16): marked Compendium, and no Local badge.
export const FromTheCompendium: Story = () => (
  <Entry detail={{ ...FULL, cupboardEntry: cupboardEntry() }} />
);

// The same, annotated: the coven's label heads the page with the compendium's
// name beneath it, its own description stands, the planets are cleared on
// purpose, and the rest is the compendium's.
export const Annotated: Story = () => (
  <Entry
    detail={{
      ...FULL,
      cupboardEntry: cupboardEntry({
        label: 'Hedgewort',
        description: 'What our coven makes of it.',
        celestialBodies: [],
      }),
    }}
  />
);

// The cupboard choices beside the title (M12.17). The workshop has no API, so
// a press answers with the generic error, which shows in the failure callout
// under the button (M12.31). A member sees Add to Cupboard while
// the coven does not hold the entry; an Edit menu of Annotate, Make It Ours
// (M12.23) and Remove once it does; a viewer sees none.
const CUPBOARD = {
  workspaceId: nextId(),
  covenSlug: 'fixture-coven',
  canAdd: true,
  canAnnotate: true,
  canRemove: true,
  canMakeOurs: true,
  annotate: {
    href: '/coven/fixture-coven/ingredients/fixture?annotate' as Route,
    closeHref: '/coven/fixture-coven/ingredients/fixture' as Route,
    opened: false,
  },
};

export const AddToCupboard: Story = () => <Entry cupboard={CUPBOARD} />;

export const AnnotateOrRemove: Story = () => (
  <Entry detail={{ ...FULL, cupboardEntry: cupboardEntry() }} cupboard={CUPBOARD} />
);

export const ViewerSeesNoCupboardButtons: Story = () => (
  <Entry
    detail={{ ...FULL, cupboardEntry: cupboardEntry() }}
    cupboard={{
      ...CUPBOARD,
      canAdd: false,
      canAnnotate: false,
      canRemove: false,
      canMakeOurs: false,
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
// follows the link), and the "In the Compendium" block linking its public page.
export const CompendiumEntryForCurator: Story = () => (
  <Entry
    edit={{
      href: '/compendium/ingredients/testwort-fixtura-testalis?edit' as Route,
      closeHref: '/compendium/ingredients/testwort-fixtura-testalis' as Route,
      deletedHref: '/compendium' as Route,
    }}
    replaces={COMPENDIUM_CASE}
  />
);

// A compendium entry seen from a coven: the same block, listing the entry
// itself once, with no See All.
export const CompendiumEntryInCoven: Story = () => <Entry replaces={COMPENDIUM_CASE} />;

// A compendium entry the curators retired, read on a coven's route because the
// coven's cupboard still names it (M12.24): marked, and with neither the
// public link nor Edit, since the compendium no longer holds it.
export const RetiredInCoven: Story = () => <Entry detail={{ ...FULL, retired: true }} />;

// The same, to a member: the Edit menu offers Annotate, Make It Ours (M12.23) and
// Remove, and no Add, since the compendium no longer offers the entry (the
// owner's decision, 2026-10-19).
export const RetiredOffersMakeItOurs: Story = () => (
  <Entry
    detail={{ ...FULL, retired: true, cupboardEntry: cupboardEntry() }}
    cupboard={{ ...CUPBOARD, canAdd: false }}
  />
);

// A coven's own entry whose formal name a compendium entry shares: the
// "In the Compendium" block with its one link and the ⓘ saying why it is shown.
export const LocalReplacingCompendiumEntry: Story = () => (
  <Entry
    replaces={{
      tip: LOCAL_TIP,
      entries: [
        {
          title: 'Testwort (Fixtura testalis)',
          href: '/compendium/ingredients/testwort-fixtura-testalis' as Route,
        },
      ],
      total: 1,
      allHref: '/compendium?query=Fixture%20Wort' as Route,
    }}
  />
);

// Four compendium entries share the formal name: the first three, then See All
// to the compendium search.
// An own entry with no formal name: the Similar block, a read-only list of the
// compendium entries it might be. The second title is long, to show it wrapping
// with the icon never alone on a line.
export const SimilarInTheCompendium: Story = () => (
  <Entry
    similar={{
      tip: SIMILAR_TIP,
      entries: [
        {
          title: 'Testwort (Fixtura testalis)',
          href: '/compendium/ingredients/testwort-fixtura-testalis' as Route,
        },
        {
          title: 'Fixture Wort of the Long Name (Fixtura longissima nominis extensissimi)',
          href: '/compendium/ingredients/fixture-wort-long' as Route,
        },
      ],
      total: 5,
      allHref: '/compendium?query=Fixture%20Wort' as Route,
    }}
  />
);

export const LocalReplacingSeveral: Story = () => (
  <Entry
    replaces={{
      tip: LOCAL_TIP,
      entries: [
        { title: 'Fixture Alpha', href: '/compendium/ingredients/fixture-alpha' as Route },
        { title: 'Fixture Beta', href: '/compendium/ingredients/fixture-beta' as Route },
        { title: 'Fixture Gamma', href: '/compendium/ingredients/fixture-gamma' as Route },
      ],
      total: 4,
      allHref: '/compendium?query=Fixture%20Wort' as Route,
    }}
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

// The details modal (M12.5): an ingredient's name in a list opens IngredientSummary
// in DetailsDialog, over the list. The workshop's router goes nowhere, so Close,
// Escape and the links leave Open Again (`Reopenable`), as Modal's stories do.

/** The modal opened over a list, as the page builds it: the entry's head, Open Full Page, the summary. */
const Details = ({
  detail,
  listHref,
  ...opened
}: Omit<IngredientDetailsOpened, 'heading' | 'children'> & {
  detail: IngredientDetail;
  listHref: Route;
}) => (
  <Reopenable>
    {() => (
      <DetailsDialog
        closeHref={listHref}
        opened={{
          heading: detailsHeading(detail.entry),
          children: <IngredientSummary detail={detail} />,
          ...opened,
        }}
      />
    )}
  </Reopenable>
);

const COVEN_LIST = '/coven/fixture-coven/ingredients' as Route;

/** FULL as the coven's own entry, which its owner or member may edit. */
const OWN: IngredientDetail = {
  ...FULL,
  entry: entryRow({
    workspaceId: '00000000-0000-4000-8000-0000000000c1',
    slug: 'testwort-fixtura-testalis',
  }),
};

// From the coven's list, its own entry: Open Full Page and Edit in the header,
// then the safety note with the line naming the form that carries its own, the
// correspondences, folk names and categories.
export const DetailsFromCovenList: Story = () => (
  <Details
    detail={OWN}
    listHref={COVEN_LIST}
    pageHref={`${COVEN_LIST}/${OWN.entry.id}` as Route}
    editAction={{
      href: `${COVEN_LIST}?edit=${OWN.entry.id}` as Route,
      heading: { eyebrow: 'Edit Ingredient', title: 'Testwort' },
    }}
  />
);
DetailsFromCovenList.meta = { iframed: true };

// From the public compendium, to anyone but a curator: the same summary, and
// only Open Full Page.
export const DetailsFromCompendium: Story = () => (
  <Details
    detail={FULL}
    listHref={'/compendium' as Route}
    pageHref={`/compendium/ingredients/${FULL.entry.slug}` as Route}
  />
);
DetailsFromCompendium.meta = { iframed: true };

// A long description, cut to its first three lines, Show More opening the
// rest in place; the sparse story's short one stands whole with no button.
export const DetailsLongDescription: Story = () => (
  <Details
    detail={{
      ...FULL,
      entry: entryRow({
        ...FULL.entry,
        description:
          'A low, grey-leaved fixture herb of dry banks and old walls, gathered at midsummer when its small yellow flowers first open.\n' +
          'Its leaves are dried in bundles under the eaves and kept through the winter, and its seed heads are left standing for the birds.\n' +
          'In the fixture covens it is laid under the threshold stone of a new house, burned with the year’s last fire, and steeped for the wash that clears a room after a quarrel.',
      }),
    }}
    listHref={'/compendium' as Route}
    pageHref={`/compendium/ingredients/${FULL.entry.slug}` as Route}
  />
);
DetailsLongDescription.meta = { iframed: true };

// The same, to a curator: Edit opens the compendium's edit modal over the details.
export const DetailsFromCompendiumForCurator: Story = () => (
  <Details
    detail={FULL}
    listHref={'/compendium' as Route}
    pageHref={`/compendium/ingredients/${FULL.entry.slug}` as Route}
    editAction={{
      href: `/compendium?edit=${FULL.entry.slug}` as Route,
      heading: { eyebrow: EDIT_ENTRY_EYEBROW, title: 'Testwort' },
    }}
  />
);
DetailsFromCompendiumForCurator.meta = { iframed: true };

// Sparse: only what is recorded shows. One element and a folk name; the empty
// correspondence rows, the categories and the safety note are left out, where
// the page would say "None recorded".
export const DetailsSparse: Story = () => (
  <Details
    detail={{
      entry: entryRow({
        name: 'Fixture Reedling',
        canonicalName: 'Fixtura palustris',
        description: 'A thin reed of fixture marshes.',
        elements: ['water'],
        celestialBodies: null,
        zodiacSigns: null,
        colors: null,
        safetyNotes: null,
      }),
      retired: false,
      cupboardEntry: null,
      folkNames: ['Marsh Testwort'],
      categories: [],
      deities: [],
      substitutes: [],
      references: [],
      variants: [variant('dried stem')],
    }}
    listHref={'/compendium' as Route}
    pageHref={'/compendium/ingredients/fixture-reedling' as Route}
  />
);
DetailsSparse.meta = { iframed: true };

// Every section empty: one line says so rather than leave the body blank.
export const DetailsNothingRecorded: Story = () => (
  <Details
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
      retired: false,
      cupboardEntry: null,
      folkNames: [],
      categories: [],
      deities: [],
      substitutes: [],
      references: [],
      variants: [variant('chip')],
    }}
    listHref={'/compendium' as Route}
    pageHref={'/compendium/ingredients/fixture-spar' as Route}
  />
);
DetailsNothingRecorded.meta = { iframed: true };

// A toxic entry: its own safety note heads the summary, and the line beneath
// names the two forms that carry cautions of their own.
export const DetailsToxic: Story = () => (
  <Details
    detail={{
      ...FULL,
      entry: entryRow({
        name: 'Fixture Banewort',
        canonicalName: 'Fixtura venenosa',
        description: 'A tall fixture herb with purple bells.\nEvery part of it is poisonous.',
        toxic: true,
        safetyNotes: 'Poisonous in every part.\nKeep from children and animals.',
      }),
      variants: [
        variant('oil', { toxic: true, safetyNotes: 'Never take by mouth.' }),
        variant('root', { toxic: true, safetyNotes: 'Wear gloves to handle it.' }),
        variant('dried leaf'),
      ],
    }}
    listHref={'/compendium' as Route}
    pageHref={'/compendium/ingredients/fixture-banewort' as Route}
  />
);
DetailsToxic.meta = { iframed: true };

export const DetailsPhoneDark: Story = () => <DetailsFromCovenList />;
DetailsPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };

export const DetailsPhoneLight: Story = () => <DetailsFromCovenList />;
DetailsPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };
