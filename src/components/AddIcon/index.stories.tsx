import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import AddIcon from '.';
import { HeldMark } from '../CompendiumCards/held-mark';
import IconTip, { CheckIcon, PlusIcon } from '../IconTip';
import Spinner from '../Spinner';

// Render-only; the names, the menu and the busy plus are asserted in tests/components/AddIcon and
// tests/components/CompendiumCards/add-icon.test.tsx. The workshop serves no /api/graphql, so a
// press shows its refusal; Busy and Added are the plus's markup in those states, since only a
// press reaches them. The names are invented (M1.25).
const meta = {
  title: 'Surfaces / Add Icon',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const NAME = 'Testwort, Fixtura testalis';
const ONE = '00000000-0000-4000-8000-000000000001';
const TWO = '00000000-0000-4000-8000-000000000002';
const COVENS = [
  { id: ONE, name: 'Fixture Coven One' },
  { id: TWO, name: 'Fixture Coven Two' },
];
const ADD = 'Add to My Ingredients';

// One coven: a press adds there at once.
export const Default: Story = {
  render: () => (
    <AddIcon
      name={NAME}
      workspaceId={ONE}
      ingredientId="fixture"
      covens={[COVENS[0]]}
      heldIn={[]}
    />
  ),
};

// Two covens: the plus is a menu of both, and the first already holds the entry, so it is
// disabled and marked in its cupboard.
export const SeveralCovens: Story = {
  render: () => (
    <AddIcon name={NAME} workspaceId={ONE} ingredientId="fixture" covens={COVENS} heldIn={[ONE]} />
  ),
};

// While an add runs: the spinner in the plus's place, and the plus refusing presses.
export const Pending: Story = {
  render: () => (
    <IconTip tip={ADD}>
      <button type="button" className="add-icon" aria-busy aria-disabled>
        <Spinner />
        <span className="visually-hidden">{`${ADD}: ${NAME}`}</span>
      </button>
    </IconTip>
  ),
};

// Just after an add: the check drawn along its stroke, which holds, then fades back to the plus.
export const Added: Story = {
  render: () => (
    <IconTip tip={ADD}>
      <button type="button" className="add-icon" data-state="added" aria-disabled>
        <span className="add-icon__glyphs">
          <span className="add-icon__check">
            <CheckIcon />
          </span>
        </span>
        <span className="visually-hidden">{`${ADD}: ${NAME}`}</span>
      </button>
    </IconTip>
  ),
};

// The fade back: the check and the plus stacked, one fading into the other.
export const Returning: Story = {
  render: () => (
    <IconTip tip={ADD}>
      <button type="button" className="add-icon" data-state="returning" aria-disabled>
        <span className="add-icon__glyphs">
          <span className="add-icon__check">
            <CheckIcon />
          </span>
          <span className="add-icon__plus">
            <PlusIcon />
          </span>
        </span>
        <span className="visually-hidden">{`${ADD}: ${NAME}`}</span>
      </button>
    </IconTip>
  ),
};

// Every coven holds it: CompendiumCards' check stands in the plus's place, tipped In Every Cupboard
// and the entry's name.
export const Held: Story = { render: () => <HeldMark name={NAME} /> };
