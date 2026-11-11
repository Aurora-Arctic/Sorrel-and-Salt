import { covenPath } from '@/lib/coven-path';
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

const meta = {
  title: 'Grimoire / Spell Recipe',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

const COVEN = 'fixture-coven';
const GRIMOIRE = covenPath(COVEN, 'grimoire');
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

const PAGE_STEPS: RecipeStep[] = RECIPE_STEPS.map((step) =>
  step.kind === 'ingredient' ? { ...step, supply: null } : step,
);

const ASIDE_STEPS = BUILDER_STEPS.filter(({ id }) => id !== 'step-6').map(stepValueOf);

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

const Look = ({
  member,
  status = 'complete',
  visibility = 'workspace',
}: {
  member: boolean;
  status?: SpellStatus;
  visibility?: SpellVisibility;
}) => (
  <Reopenable>
    {() => (
      <SpellLookDialog
        closeHref={GRIMOIRE}
        opened={{
          title: TITLE,
          status,
          visibility,
          lastEdit: LAST_EDIT,
          recipeHref: RECIPE,
          editHref: member ? (`${GRIMOIRE}?edit=${FIXTURE_SPELL}` as Route) : undefined,
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
  Complete: <Page />,
  Draft: <Page status="draft" />,
  Private: <Page visibility="private" />,
  'Quick Look': <Look member />,
  'Quick Look Draft': <Look member status="draft" />,
  'Quick Look Private': <Look member visibility="private" />,
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

export const Phone: Story = {
  globals: { viewport: { value: 'w375', isRotated: false } },
  render: () => <Page />,
};
