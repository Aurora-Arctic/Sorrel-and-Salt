import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SpellMarks from '.';
import { StatesGrid } from '../../../.storybook/states-grid';

// Render-only; which badge shows where is asserted through its users, in
// tests/components/SpellRecipe and tests/components/SpellCard.
const meta = {
  title: 'Grimoire / Spell Marks',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="14rem"
      states={{
        Draft: <SpellMarks status="draft" visibility="workspace" />,
        Private: <SpellMarks status="complete" visibility="private" />,
        'Draft and Private': <SpellMarks status="draft" visibility="private" />,
        'Complete and Shared: Nothing Drawn': (
          <>
            <SpellMarks status="complete" visibility="workspace" />
            <p style={{ margin: 0 }}>A complete spell shared with the coven carries no badge.</p>
          </>
        ),
      }}
    />
  ),
};
