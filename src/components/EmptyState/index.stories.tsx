import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import EmptyState from '.';

// Render-only; behaviour is asserted in tests/components/EmptyState. `page` is a whole list that is
// empty; `compact` is a table or a card section.
const meta = {
  title: 'Feedback / Empty State',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const clearFilters = (
  <a className="btn btn--quiet" href="?">
    Clear Filters
  </a>
);

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="22rem"
      states={{
        'Page Empty': <EmptyState label="No Spells">There are no spells yet.</EmptyState>,
        'Page Empty With Detail And Action': (
          <EmptyState
            label="No Spells"
            detail="Stewards and Practitioners can write one."
            action={
              <a className="btn btn--solid" href="?">
                New Spell
              </a>
            }
          >
            There are no spells yet.
          </EmptyState>
        ),
        'Page No Matches': (
          <EmptyState
            label="No Matches"
            detail="Widen the filters to see more."
            action={clearFilters}
          >
            No spells match your filters.
          </EmptyState>
        ),
        'Compact Empty': (
          <EmptyState size="compact" label="No Members">
            There are no members yet.
          </EmptyState>
        ),
        'Compact No Matches': (
          <EmptyState size="compact" label="No Matches" action={clearFilters}>
            No members match your filters.
          </EmptyState>
        ),
        Quiet: <EmptyState quiet>There is nothing here.</EmptyState>,
      }}
    />
  ),
};
