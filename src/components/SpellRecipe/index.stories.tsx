import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import {
  BUILDER_STEPS,
  cardCategories,
  GROUP_COLORS,
  namedCategories,
  RECIPE_STEPS,
  WORKINGS,
} from '../../../.storybook/grimoire-fixtures';
import {
  FIXTURE_SPELL,
  FIXTURE_WORKSPACE,
  RecordButton,
  WorkingsSection,
} from '../../../.storybook/grimoire-workings';
import { WorkshopSearch } from '../../../.storybook/navigation';
import { Reopenable } from '../../../.storybook/reopenable';
import { ShellFrame } from '../../../.storybook/shell-frame';
import { RouteModalProvider } from '../Modal/route-modal-provider';
import { EditLink } from '../IconTip';
import { stepValueOf } from '../SpellBuilder/steps/values';
import SpellPreview from '../SpellPreview';
import { previewStepsOf } from '../SpellPreview/preview-steps';
import type { SpellStatus, SpellVisibility } from '@/modules/grimoire';
import SpellRecipeAside from './aside';
import SpellRecipeBody from './body';
import { deletedHrefOf } from './deleted-href';
import SpellLookDialog from './look-dialog';
import SpellMoreMenu from './more-menu';
import type { InventoryDoor, RecipeStep } from './types';
import SpellRecipe from '.';

// Render-only; what shows and when is asserted in tests/components/SpellRecipe. The page states
// draw the recipe as its page does (src/app/(shell)/coven/[slug]/grimoire/[id]/page.tsx): the head's
// controls, the Workings section and the side column. A dropdown, not a grid: the page's sections
// carry fixed ids.
const meta = {
  title: 'Grimoire / Spell Recipe',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const COVEN = 'fixture-coven';
const GRIMOIRE = `/coven/${COVEN}/grimoire` as Route;
const RECIPE = `${GRIMOIRE}/${FIXTURE_SPELL}` as Route;
const TITLE = 'Fixture Working';
const LAST_EDIT = { by: 'Testa Owner', at: '2026-10-01T12:00:00.000Z' };
const INTENT = 'To see clearly through the winter.';
const NOTE = 'Best made on a dry night.';
const FACTS = {
  jarDescription: 'Squat Amber Jar',
  sealWaxColor: 'Red',
  moonPhase: 'Waxing Gibbous',
  dayOfWeek: 'Friday',
};
const ASSIGNED = ['Protection', 'Clarity', 'Healing'];

// The recipe page draws no supply verdict in the rows: its side column gives them.
const PAGE_STEPS: RecipeStep[] = RECIPE_STEPS.map((step) =>
  step.kind === 'ingredient' ? { ...step, supply: null } : step,
);

// The side column holds the steps whose ingredient is still there; Testmoss was deleted since.
const ASIDE_STEPS = BUILDER_STEPS.filter(({ id }) => id !== 'step-6').map(stepValueOf);

/** Each linked step's Quick Look eye, and Edit Stock behind its jar for a role that updates stock. */
const DOORS: InventoryDoor[] = RECIPE_STEPS.flatMap((step) =>
  step.kind === 'ingredient' && step.look && step.variantId
    ? [
        {
          stepId: step.id,
          look: step.look,
          stock: {
            workspaceId: FIXTURE_WORKSPACE,
            ingredientId: `ingredient-${step.id}`,
            ingredientName: step.name,
            forms: [{ variantId: step.variantId, label: step.form ?? 'Whole' }],
            jars: [
              {
                id: `jar-${step.id}`,
                variantId: step.variantId,
                quantity: 10,
                unit: 'g',
                threshold: 5,
              },
            ],
          },
        },
      ]
    : [],
);

const Page = ({
  status = 'complete',
  visibility = 'workspace',
}: {
  status?: SpellStatus;
  visibility?: SpellVisibility;
}) => {
  // Only a complete spell is worked.
  const canRecord = status === 'complete';
  const listPath = (status === 'draft' ? `${GRIMOIRE}/drafts` : GRIMOIRE) as Route;
  return (
    <ShellFrame area="coven" open={RECIPE}>
      <WorkshopSearch>
        <main>
          <RouteModalProvider>
            <SpellRecipe
              title={TITLE}
              intent={INTENT}
              status={status}
              visibility={visibility}
              categories={cardCategories(...ASSIGNED)}
              lastEdit={LAST_EDIT}
              note={NOTE}
              {...FACTS}
              steps={PAGE_STEPS}
              workings={
                <WorkingsSection
                  workings={canRecord ? WORKINGS : []}
                  canRecord={canRecord}
                  visibility={visibility}
                />
              }
              aside={
                <SpellRecipeAside
                  steps={ASIDE_STEPS}
                  doors={DOORS}
                  intended={namedCategories(...ASSIGNED)}
                  groups={[...GROUP_COLORS]}
                />
              }
              action={
                <div className="spell-recipe__actions">
                  {canRecord && <RecordButton visibility={visibility} />}
                  <EditLink
                    href={`${RECIPE}?edit=${FIXTURE_SPELL}` as Route}
                    name={TITLE}
                    heading={{ eyebrow: 'Edit Spell', title: TITLE }}
                    className="icon-tip__edit icon-tip__edit--plain"
                  />
                  <SpellPreview
                    title={TITLE}
                    intent={INTENT}
                    categories={cardCategories(...ASSIGNED)}
                    note={NOTE}
                    {...FACTS}
                    steps={previewStepsOf(RECIPE_STEPS)}
                  />
                  <SpellMoreMenu
                    workspaceId={FIXTURE_WORKSPACE}
                    covenSlug={COVEN}
                    spellId={FIXTURE_SPELL}
                    name={TITLE}
                    deletedHref={deletedHrefOf(listPath, TITLE)}
                    visibility={visibility}
                    canDuplicate
                    canDelete
                    canPrint
                  />
                </div>
              }
              back={{ href: GRIMOIRE, label: 'Grimoire' }}
            />
          </RouteModalProvider>
        </main>
      </WorkshopSearch>
    </ShellFrame>
  );
};

// Quick Look: the recipe's body in a modal over the grimoire list, its headings a level down under
// the dialog's title, and each step's supply verdict in its row. The workshop's router goes
// nowhere, so Close, Escape and the links leave Open Again (`Reopenable`).
const Look = ({ member }: { member: boolean }) => (
  <Reopenable>
    {() => (
      <SpellLookDialog
        closeHref={GRIMOIRE}
        opened={{
          title: TITLE,
          lastEdit: LAST_EDIT,
          recipeHref: RECIPE,
          editHref: member ? (`${GRIMOIRE}?edit=${FIXTURE_SPELL}` as Route) : undefined,
          deleteSpell: member
            ? {
                workspaceId: FIXTURE_WORKSPACE,
                spellId: FIXTURE_SPELL,
                deletedHref: deletedHrefOf(GRIMOIRE, TITLE),
                visibility: 'workspace',
              }
            : undefined,
          children: (
            <SpellRecipeBody
              title={TITLE}
              intent={INTENT}
              categories={cardCategories(...ASSIGNED)}
              note={NOTE}
              {...FACTS}
              steps={RECIPE_STEPS}
              level={3}
            />
          ),
        }}
      />
    )}
  </Reopenable>
);

const STATES: Record<string, ReactNode> = {
  // Every slot filled: categories, the head's controls, two workings and a draft one, the side
  // column, a toxic form, a one-off and a step whose ingredient was deleted since.
  Complete: <Page />,
  // A draft is not worked: no Record a Working, and Workings empty.
  Draft: <Page status="draft" />,
  Private: <Page visibility="private" />,
  // A member's: the Edit pencil and the bin beside the title.
  'Quick Look': <Look member />,
  'Quick Look Read Only': <Look member={false} />,
  'Quick Look Read Failed': (
    <Reopenable>{() => <SpellLookDialog closeHref={GRIMOIRE} failed />}</Reopenable>
  ),
};

export const States: Story = {
  args: { state: 'Complete' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
