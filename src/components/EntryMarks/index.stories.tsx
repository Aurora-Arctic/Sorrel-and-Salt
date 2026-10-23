import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import IngredientCard from '../IngredientCard';
import '../IngredientEntry/index.scss';
import EntryMarks, { RecencyMark } from '.';
import { route } from '../../../.storybook/route';
import { StatesGrid } from '../../../.storybook/states-grid';

// Render-only; what shows and when is asserted in tests/components/EntryMarks.
const meta = {
  title: 'Ingredients / Entry Marks',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="badges">{children}</div>
);

// A compendium entry no cupboard names carries no mark, so Not In Cupboard renders nothing.
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="14rem"
      states={{
        Own: (
          <Row>
            <EntryMarks kind="own" />
          </Row>
        ),
        'In Cupboard': (
          <Row>
            <EntryMarks kind="cupboard" />
          </Row>
        ),
        'In Cupboard Annotated': (
          <Row>
            <EntryMarks kind="cupboard" annotated />
          </Row>
        ),
        Retired: (
          <Row>
            <EntryMarks kind="cupboard" retired annotated />
          </Row>
        ),
        'Not In Cupboard': (
          <Row>
            <EntryMarks kind="compendium" />
          </Row>
        ),
      }}
    />
  ),
};

// The New / Updated marker (MB.106): New and Updated on an ingredient card and in the entry
// page's heading area.
const CARD = {
  href: route('/compendium/ingredients/testwort-testalis'),
  label: 'Testwort',
  formalName: 'Fixtura testalis',
  nomenclature: 'botanical' as const,
  kind: 'compendium' as const,
};

export const Recency: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: '1.5rem', maxInlineSize: '40rem', padding: '1rem' }}>
      {(['new', 'updated'] as const).map((recency) => (
        <div key={recency} style={{ display: 'grid', gap: '1.5rem' }}>
          <IngredientCard {...CARD} recency={recency} />
          <header className="ingredient-entry__head" style={{ minBlockSize: '5rem' }}>
            <h1 style={{ margin: 0 }}>Testwort</h1>
            <RecencyMark recency={recency} />
          </header>
        </div>
      ))}
    </div>
  ),
};
