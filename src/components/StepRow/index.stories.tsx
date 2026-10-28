import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { StatesGrid } from '../../../.storybook/states-grid';
import StepRow from '.';

// Render-only; what shows and when is asserted in tests/components/StepRow.
// The editing controls are the spell builder's (SpellBuilder / Spell Builder).
const meta = {
  title: 'Grimoire / Step Row',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const List = ({ children }: { children: ReactNode }) => (
  <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>{children}</ol>
);

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="22rem"
      states={{
        'Instruction Only': (
          <List>
            <StepRow position={1} name={null} body="Light the candle" />
          </List>
        ),
        'Ingredient Only': (
          <List>
            <StepRow
              position={2}
              name="Rosemary (Dried Leaf)"
              icon="botanical"
              quantity="2"
              unit="tsp"
            />
          </List>
        ),
        'Ingredient With Instruction': (
          <List>
            <StepRow
              position={3}
              name="Rosemary (Dried Leaf)"
              icon="botanical"
              quantity="2"
              unit="tsp"
              body="Crush it first"
            />
          </List>
        ),
        'One-Off Without Amount': (
          <List>
            <StepRow position={4} name="Testwort" />
          </List>
        ),
      }}
    />
  ),
};
