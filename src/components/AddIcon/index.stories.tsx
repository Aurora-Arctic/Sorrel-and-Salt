import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import AddIcon from '.';
import { HeldMark } from '../CompendiumCards/held-mark';
import IconTip, { CheckIcon, PlusIcon } from '../IconTip';
import Spinner from '../Spinner';

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

const pending = (
  <IconTip tip={ADD}>
    <button type="button" className="add-icon" aria-busy aria-disabled>
      <Spinner />
      <span className="visually-hidden">{`${ADD}: ${NAME}`}</span>
    </button>
  </IconTip>
);

const added = (
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
);

const returning = (
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
);

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="10rem"
      states={{
        'One Coven': (
          <AddIcon
            name={NAME}
            workspaceId={ONE}
            ingredientId="fixture"
            covens={[COVENS[0]]}
            heldIn={[]}
          />
        ),
        'Several Covens': (
          <AddIcon
            name={NAME}
            workspaceId={ONE}
            ingredientId="fixture"
            covens={COVENS}
            heldIn={[ONE]}
          />
        ),
        Pending: pending,
        Added: added,
        Returning: returning,
        Held: <HeldMark name={NAME} />,
      }}
    />
  ),
};
