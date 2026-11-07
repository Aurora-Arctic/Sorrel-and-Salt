import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Route } from 'next';
import { type ReactNode, useEffect } from 'react';
import { FIXTURE_COVEN, FIXTURE_WORKSPACE_ID } from '../../../.storybook/fixtures';
import { Reopenable } from '../../../.storybook/reopenable';
import { ShellFrame } from '../../../.storybook/shell-frame';
import StockDialog from '../StockDialog';
import IngredientEntry from '.';
import DetailsDialog from './details-dialog';
import { detailsHeading, detailsMarks } from './details';
import { EDIT_ENTRY_EYEBROW } from './edit-heading';
import ReviewMark from './review-mark';
import IngredientSummary from './summary';
import type { IngredientDetailsOpened, IngredientEntryProps, SummaryJar } from './types';
import type {
  CategoryDetail,
  CitedReference,
  HoldingCoven,
  IngredientDetail,
  IngredientRow,
  IngredientVariantRow,
  VariantDetail,
} from '@/modules/ingredients';

const meta = {
  title: 'Pages / Ingredient Entry',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

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
    revision: 1,
    curatorReviewedAt: null,
    seedContentHash: null,
    shown: true,
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
      scholarly: false,
      seedKey: null,
      ...STAMPS,
    },
    locator,
    nameBasis: null,
    supports: null,
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

const cupboardEntry = (
  overrides: Partial<NonNullable<IngredientDetail['cupboardEntry']>> = {},
): NonNullable<IngredientDetail['cupboardEntry']> => ({
  id: nextId(),
  workspaceId: FIXTURE_WORKSPACE_ID,
  ingredientId: '00000000-0000-4000-8000-000000000001',
  label: null,
  revision: 1,
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
    { name: 'Fixtura', tradition: 'Fixture Pantheon', otherNames: [] },
    { name: 'Testis', tradition: null, otherNames: [] },
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
        colors: ['Gold'],
      },
      {
        icon: 'fluid',
        categories: [DREAMS],
        references: [cited('The Oils of Fixtura', 'ch. 3')],
      },
    ),
    variant('smoke bundle', { description: 'Stems bound with fixture thread.' }),
  ],
};

const hrefOf: IngredientEntryProps['hrefOf'] = (ingredient) =>
  `/compendium/ingredients/${ingredient.slug}` as Route;

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

const CUPBOARD = {
  workspaceId: nextId(),
  covenSlug: FIXTURE_COVEN.slug,
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

const COMPENDIUM_BACK = {
  href: '/compendium' as Route,
  label: 'Compendium',
  also: [{ path: '/curator/compendium', label: 'Curator Compendium' }],
};

const BACK = { href: '/coven/fixture-coven/ingredients' as Route, label: 'Ingredients' };

const Entry = (props: Partial<IngredientEntryProps>) => (
  <ShellFrame area="coven" open="/coven/fixture-coven/ingredients">
    <Page>
      <IngredientEntry detail={FULL} hrefOf={hrefOf} back={BACK} {...props} />
    </Page>
  </ShellFrame>
);

const PublicEntry = (props: Partial<IngredientEntryProps>) => (
  <ShellFrame area="none" open="/compendium" signedOut={!props.heldInCovens && !props.edit}>
    <Page>
      <IngredientEntry detail={FULL} hrefOf={hrefOf} back={COMPENDIUM_BACK} {...props} />
    </Page>
  </ShellFrame>
);

const defaultNode = <PublicEntry />;

const noFormalNameNode = (
  <Entry
    detail={{
      ...FULL,
      entry: entryRow({
        name: 'Fixture Crossroads Dust',
        canonicalName: null,
        nomenclature: 'none',
      }),
      variants: [],
      cupboardEntry: cupboardEntry(),
    }}
    cupboard={CUPBOARD}
  />
);

const covenEntryNode = (
  <Entry
    detail={{
      ...FULL,
      entry: entryRow({ workspaceId: FIXTURE_WORKSPACE_ID }),
    }}
    lastEdit={{ by: 'Fixture A', at: new Date(Date.now() - 3_600_000).toISOString() }}
  />
);

const covenEntryForMemberNode = (
  <Entry
    detail={{
      ...FULL,
      entry: entryRow({ workspaceId: FIXTURE_WORKSPACE_ID }),
    }}
    edit={{
      href: '/coven/fixture-coven/ingredients/fixture?edit' as Route,
      closeHref: '/coven/fixture-coven/ingredients/fixture' as Route,
      deletedHref: BACK.href,
      coven: {
        workspaceId: FIXTURE_WORKSPACE_ID,
        ingredientsHref: BACK.href,
        mayPromote: true,
        stock: {
          forms: FULL.variants.map(({ variant }) => ({
            variantId: variant.id,
            label: variant.form.replace(/\b\w/g, (c) => c.toUpperCase()),
          })),
          jars: [],
        },
      },
    }}
  />
);

const unknownWithNameNode = (
  <PublicEntry
    detail={{
      ...FULL,
      entry: entryRow({ canonicalName: 'Fixtura incerta', nomenclature: 'unknown' }),
    }}
  />
);

const unknownWithoutNameNode = (
  <PublicEntry
    detail={{
      ...FULL,
      entry: entryRow({ canonicalName: null, nomenclature: 'unknown' }),
    }}
  />
);

const nothingRecordedNode = (
  <PublicEntry
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
  />
);

const fromTheCompendiumNode = <Entry detail={{ ...FULL, cupboardEntry: cupboardEntry() }} />;

const annotatedNode = (
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

const annotateOrRemoveNode = (
  <Entry
    detail={{ ...FULL, cupboardEntry: cupboardEntry({ label: 'Hedgewort' }) }}
    cupboard={CUPBOARD}
  />
);

const removeAloneInMoreNode = (
  <Entry
    detail={{ ...FULL, cupboardEntry: cupboardEntry() }}
    cupboard={{ ...CUPBOARD, canAnnotate: false, canMakeOurs: false }}
  />
);

const newWithBackNode = (
  <Entry
    detail={{
      ...FULL,
      entry: entryRow({ createdAt: new Date() }),
      cupboardEntry: cupboardEntry(),
    }}
    cupboard={CUPBOARD}
    back={BACK}
  />
);

const longNamesNode = (
  <Entry
    detail={{
      ...FULL,
      entry: entryRow({
        name: 'Testwort Longer Nameicanicusmus',
        canonicalName: 'Fixtura testalis longissimanicusmus var. fixturissima subsp. testarum',
        updatedAt: new Date(),
      }),
      cupboardEntry: cupboardEntry(),
    }}
    cupboard={CUPBOARD}
    back={BACK}
  />
);

const longNamesPublicNode = (
  <PublicEntry
    detail={{
      ...FULL,
      entry: entryRow({
        name: 'Testwort Longer Nameicanicusmus',
        canonicalName: 'Fixtura testalis longissimanicusmus var. fixturissima subsp. testarum',
      }),
    }}
    edit={{
      href: '/compendium/ingredients/testwort-fixtura-testalis?edit' as Route,
      closeHref: '/compendium/ingredients/testwort-fixtura-testalis' as Route,
      deletedHref: '/compendium' as Route,
    }}
  />
);

const viewerSeesNoCupboardButtonsNode = (
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

const compendiumEntryForCuratorNode = (
  <Entry
    edit={{
      href: '/compendium/ingredients/testwort-fixtura-testalis?edit' as Route,
      closeHref: '/compendium/ingredients/testwort-fixtura-testalis' as Route,
      deletedHref: '/compendium' as Route,
    }}
    replaces={COMPENDIUM_CASE}
    reviewControl={
      <ReviewMark ingredientId="00000000-0000-4000-8000-0000000000e1" reviewedAt={null} />
    }
  />
);

const compendiumEntryInCovenNode = <Entry replaces={COMPENDIUM_CASE} />;

const retiredInCovenNode = <Entry detail={{ ...FULL, retired: true }} />;

const retiredOffersMakeItOursNode = (
  <Entry
    detail={{ ...FULL, retired: true, cupboardEntry: cupboardEntry() }}
    cupboard={{ ...CUPBOARD, canAdd: false }}
  />
);

const localReplacingCompendiumEntryNode = (
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

const similarInTheCompendiumNode = (
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

const localReplacingSeveralNode = (
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

const movedAwayNode = (
  <PublicEntry
    movedAway={{
      name: 'Fixture Movedwort',
      href: '/compendium/ingredients/fixture-movedwort' as Route,
    }}
  />
);

const formAddsNothingNode = (
  <PublicEntry
    detail={{ ...FULL, variants: [variant('root'), variant('dried leaf', { toxic: true })] }}
  />
);

const Details = ({
  detail,
  listHref,
  covens,
  jars,
  ...opened
}: Omit<IngredientDetailsOpened, 'heading' | 'children'> & {
  detail: IngredientDetail;
  listHref: Route;
  covens?: readonly HoldingCoven[];
  jars?: readonly SummaryJar[];
}) => (
  <Reopenable>
    {() => (
      <DetailsDialog
        closeHref={listHref}
        opened={{
          heading: detailsHeading(detail.entry),
          marks: detailsMarks(detail),
          children: <IngredientSummary detail={detail} covens={covens} jars={jars} />,
          ...opened,
        }}
      />
    )}
  </Reopenable>
);

const COVEN_LIST = '/coven/fixture-coven/ingredients' as Route;

const PUBLIC_LINKS = {
  listHref: '/compendium' as Route,
  pageHref: `/compendium/ingredients/${FULL.entry.slug}` as Route,
};

const OWN: IngredientDetail = {
  ...FULL,
  entry: entryRow({
    workspaceId: FIXTURE_WORKSPACE_ID,
    slug: 'testwort-fixtura-testalis',
  }),
};

const COVEN_LINKS = {
  listHref: COVEN_LIST,
  pageHref: `${COVEN_LIST}/${OWN.entry.id}` as Route,
};

const detailsFromCovenListNode = (
  <Details
    detail={OWN}
    {...COVEN_LINKS}
    editAction={{
      href: `${COVEN_LIST}?edit=${OWN.entry.id}` as Route,
      heading: { eyebrow: 'Edit Ingredient', title: 'Testwort' },
    }}
  />
);

const STOCKED: IngredientDetail = {
  ...OWN,
  variants: [...OWN.variants, variant('root'), variant('dried leaf')],
};
const [OIL, BUNDLE, ROOT] = STOCKED.variants.map(({ variant }) => variant.id);
const detailsWithStockNode = (
  <Details
    detail={STOCKED}
    {...COVEN_LINKS}
    jars={[
      { variantId: OIL, quantity: 4, unit: 'ml', threshold: 10 },
      { variantId: BUNDLE, quantity: null, unit: null, threshold: null },
      { variantId: ROOT, quantity: 0, unit: 'g', threshold: null },
    ]}
  />
);
const detailsLastEditedNode = (
  <Details
    detail={STOCKED}
    {...COVEN_LINKS}
    lastEdit={{ by: 'Fixture A', at: '2026-10-21T09:00:00.000Z' }}
  />
);
const JARRED = STOCKED.variants.map(({ variant }) => ({
  variantId: variant.id,
  label: variant.form.replace(/\b\w/g, (c) => c.toUpperCase()),
}));
const PressStock = (): null => {
  useEffect(() => {
    document.querySelector<HTMLButtonElement>('button[aria-label^="Edit Stock"]')?.click();
  }, []);
  return null;
};
const detailsWithStockDialogNode = (
  <>
    <Details
      detail={STOCKED}
      {...COVEN_LINKS}
      actions={
        <StockDialog
          workspaceId={FIXTURE_WORKSPACE_ID}
          ingredientId={OWN.entry.id}
          ingredientName="Testwort"
          forms={JARRED}
          jars={[
            {
              id: '00000000-0000-4000-8000-0000000000e1',
              variantId: OIL,
              quantity: 4,
              unit: 'ml',
              threshold: 10,
            },
            {
              id: '00000000-0000-4000-8000-0000000000e2',
              variantId: ROOT,
              quantity: 0,
              unit: 'g',
              threshold: null,
            },
          ]}
        />
      }
    />
    <PressStock />
  </>
);
const detailsFromCompendiumNode = <Details detail={FULL} {...PUBLIC_LINKS} />;
const HOLDING = [
  { id: FIXTURE_WORKSPACE_ID, ...FIXTURE_COVEN },
  { id: '00000000-0000-4000-8000-0000000000c2', slug: 'testwort-circle', name: 'Testwort Circle' },
  {
    id: '00000000-0000-4000-8000-0000000000c3',
    slug: 'the-hedge-witches-of-the-lower-fixture-valley',
    name: 'The Hedge Witches of the Lower Fixture Valley and Its Neighbouring Hamlets',
  },
  { id: '00000000-0000-4000-8000-0000000000c4', slug: 'stillroom', name: 'Stillroom' },
];

const detailsInYourCupboardsNode = <Details detail={FULL} {...PUBLIC_LINKS} covens={HOLDING} />;
const detailsInOneCovenNode = (
  <Details detail={FULL} {...PUBLIC_LINKS} covens={HOLDING.slice(0, 1)} />
);
const detailsLongDescriptionNode = (
  <Details
    detail={{
      ...FULL,
      entry: entryRow({
        ...FULL.entry,
        description:
          'A low, grey-leaved fixture herb of dry banks and old walls, gathered at midsummer when its small yellow flowers first open.\n' +
          'Its leaves are dried in bundles under the eaves and kept through the winter, and its seed heads are left standing for the birds.\n' +
          'The old herbals set it among the plants that keep a house, and the village women pressed it between the pages of the family book, where it scented the leaves for a generation.\n' +
          'A tea of it is taken at the turn of the year, three sips for each of the three roads, and the cup is turned down on the hearth when it is empty.\n' +
          'In the fixture covens it is laid under the threshold stone of a new house, burned with the year’s last fire, and steeped for the wash that clears a room after a quarrel.',
      }),
    }}
    {...PUBLIC_LINKS}
  />
);
const detailsFromCompendiumForCuratorNode = (
  <Details
    detail={FULL}
    {...PUBLIC_LINKS}
    editAction={{
      href: `/compendium?edit=${FULL.entry.slug}` as Route,
      heading: { eyebrow: EDIT_ENTRY_EYEBROW, title: 'Testwort' },
    }}
  />
);
const detailsSparseNode = (
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
const detailsNothingRecordedNode = (
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
const detailsToxicNode = (
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
const detailsLongNameNode = (
  <Details
    detail={{
      ...OWN,
      entry: entryRow({
        ...OWN.entry,
        name: 'Fixture Grey-Leaved Testwort of the Dry Banks and Old Walls',
        toxic: true,
        safetyNotes: 'Poisonous in every part.',
      }),
    }}
    {...COVEN_LINKS}
    editAction={{
      href: `${COVEN_LIST}?edit=${OWN.entry.id}` as Route,
      heading: { eyebrow: 'Edit Ingredient', title: 'Fixture Grey-Leaved Testwort' },
    }}
  />
);
const detailsNewAndCautionedNode = (
  <Details
    detail={{
      ...FULL,
      entry: entryRow({
        ...FULL.entry,
        safetyNotes: 'Keep from children and animals.',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    }}
    {...PUBLIC_LINKS}
    editAction={{
      href: `/compendium?edit=${FULL.entry.slug}` as Route,
      heading: { eyebrow: EDIT_ENTRY_EYEBROW, title: 'Testwort' },
    }}
  />
);
const detailsLongWordNode = (
  <Details
    detail={{
      ...OWN,
      entry: entryRow({
        ...OWN.entry,
        name: 'Pseudotestworticulumfixturaceae',
        toxic: true,
        safetyNotes: 'Poisonous in every part.',
      }),
    }}
    {...COVEN_LINKS}
    editAction={{
      href: `${COVEN_LIST}?edit=${OWN.entry.id}` as Route,
      heading: { eyebrow: 'Edit Ingredient', title: 'Pseudotestworticulumfixturaceae' },
    }}
  />
);
const detailsNoFormalNameNode = (
  <Details
    detail={{
      ...OWN,
      entry: entryRow({
        ...OWN.entry,
        canonicalName: null,
        toxic: true,
        safetyNotes: 'Poisonous.',
      }),
    }}
    {...COVEN_LINKS}
    editAction={{
      href: `${COVEN_LIST}?edit=${OWN.entry.id}` as Route,
      heading: { eyebrow: 'Edit Ingredient', title: 'Testwort' },
    }}
  />
);

const [PAGE_OIL, PAGE_BUNDLE] = FULL.variants.map(({ variant }) => variant.id);
const STOCK = {
  workspaceId: FIXTURE_WORKSPACE_ID,
  forms: [
    { variantId: PAGE_OIL, label: 'Oil' },
    { variantId: PAGE_BUNDLE, label: 'Smoke Bundle' },
  ],
  jars: [
    {
      id: '00000000-0000-4000-8000-0000000000f1',
      variantId: PAGE_OIL,
      quantity: 4,
      unit: 'ml',
      threshold: 10,
    },
    {
      id: '00000000-0000-4000-8000-0000000000f2',
      variantId: PAGE_BUNDLE,
      quantity: null,
      unit: null,
      threshold: null,
    },
  ],
};
const stockForEditorNode = (
  <Entry
    detail={{ ...FULL, cupboardEntry: cupboardEntry() }}
    cupboard={CUPBOARD}
    stock={{ ...STOCK, mayEdit: true }}
  />
);
const stockOutAndStockedNode = (
  <Entry
    detail={{ ...FULL, cupboardEntry: cupboardEntry() }}
    cupboard={CUPBOARD}
    stock={{
      ...STOCK,
      mayEdit: true,
      jars: [
        { ...STOCK.jars[0], quantity: 0 },
        { ...STOCK.jars[1], quantity: 40, unit: 'g', threshold: 10 },
      ],
    }}
  />
);
const noStockRecordedNode = (
  <Entry
    detail={{ ...FULL, variants: [], cupboardEntry: cupboardEntry() }}
    cupboard={CUPBOARD}
    stock={{ ...STOCK, mayEdit: true, forms: [], jars: [] }}
  />
);
const stockForViewerNode = (
  <Entry
    detail={{ ...FULL, cupboardEntry: cupboardEntry() }}
    stock={{ ...STOCK, mayEdit: false }}
  />
);

const ANNOTATED_HELD = {
  ...FULL,
  cupboardEntry: cupboardEntry({ label: 'Hedgewort', description: 'What our coven makes of it.' }),
};
const annotatedInStockNode = (
  <Entry detail={ANNOTATED_HELD} cupboard={CUPBOARD} stock={{ ...STOCK, mayEdit: true }} />
);
const annotatedWithStockAndPanelNode = (
  <Entry
    detail={ANNOTATED_HELD}
    cupboard={CUPBOARD}
    stock={{ ...STOCK, mayEdit: true }}
    replaces={COMPENDIUM_CASE}
  />
);
const toxicNode = <PublicEntry detail={{ ...FULL, entry: { ...FULL.entry, toxic: true } }} />;

const heldInCovenNode = <PublicEntry heldInCovens />;

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'No Formal Name': noFormalNameNode,
  'Coven Entry': covenEntryNode,
  'Coven Entry For Member': covenEntryForMemberNode,
  'Unknown With Name': unknownWithNameNode,
  'Unknown Without Name': unknownWithoutNameNode,
  'From The Compendium': fromTheCompendiumNode,
  Annotated: annotatedNode,
  'Annotated In Stock': annotatedInStockNode,
  'Annotated With Stock And Compendium Panel': annotatedWithStockAndPanelNode,
  Toxic: toxicNode,
  'Annotate Or Remove': annotateOrRemoveNode,
  'Remove Alone In More': removeAloneInMoreNode,
  'New With Back': newWithBackNode,
  'Long Names': longNamesNode,
  'Long Names Public': longNamesPublicNode,
  'Viewer Sees No Cupboard Buttons': viewerSeesNoCupboardButtonsNode,
  'Compendium Entry For Curator': compendiumEntryForCuratorNode,
  'Compendium Entry In Coven': compendiumEntryInCovenNode,
  'Retired In Coven': retiredInCovenNode,
  'Retired Offers Make It Ours': retiredOffersMakeItOursNode,
  'Similar In The Compendium': similarInTheCompendiumNode,
  'Moved Away': movedAwayNode,
  'Form Adds Nothing': formAddsNothingNode,
  'Stock For Editor': stockForEditorNode,
  'Stock Out And Stocked': stockOutAndStockedNode,
  'No Stock Recorded': noStockRecordedNode,
  'Stock For Viewer': stockForViewerNode,
  'Held In A Coven': heldInCovenNode,
  'Nothing Recorded': nothingRecordedNode,
  'Local Replacing Compendium Entry': localReplacingCompendiumEntryNode,
  'Local Replacing Several': localReplacingSeveralNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};

const DETAILS_STATES: Record<string, ReactNode> = {
  'From Coven List': detailsFromCovenListNode,
  'With Stock': detailsWithStockNode,
  'Last Edited': detailsLastEditedNode,
  'From Compendium': detailsFromCompendiumNode,
  'In Your Cupboards': detailsInYourCupboardsNode,
  'In One Coven': detailsInOneCovenNode,
  'Long Description': detailsLongDescriptionNode,
  'From Compendium For Curator': detailsFromCompendiumForCuratorNode,
  Sparse: detailsSparseNode,
  Toxic: detailsToxicNode,
  'New And Cautioned': detailsNewAndCautionedNode,
  'With Stock Dialog': detailsWithStockDialogNode,
  'Nothing Recorded': detailsNothingRecordedNode,
  'Long Name': detailsLongNameNode,
  'Long Word': detailsLongWordNode,
  'No Formal Name': detailsNoFormalNameNode,
};

export const QuickLook: Story = {
  name: 'Quick Look',
  args: { state: 'From Coven List' },
  argTypes: {
    state: { control: 'select', options: Object.keys(DETAILS_STATES), mapping: DETAILS_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};

export const ReviewMarkNeedsReview: Story = {
  render: () => (
    <ReviewMark ingredientId="00000000-0000-4000-8000-0000000000e1" reviewedAt={null} />
  ),
};

export const ReviewMarkReviewed: Story = {
  render: () => (
    <ReviewMark
      ingredientId="00000000-0000-4000-8000-0000000000e1"
      reviewedAt="2026-10-01T09:30:00.000Z"
    />
  ),
};

export const ReviewLineInTheQuickLook: Story = {
  render: () => (
    <div className="modal-dialog__under">
      <ReviewMark
        ingredientId="00000000-0000-4000-8000-0000000000e1"
        reviewedAt="2026-10-01T09:30:00.000Z"
      />
    </div>
  ),
};
