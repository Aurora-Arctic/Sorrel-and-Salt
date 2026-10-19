import type { Story } from '@ladle/react';
import IngredientCard from '../IngredientCard';
import '../IngredientEntry/index.scss';
import EntryMarks, { RecencyMark } from '.';

// Render-only; what shows and when is asserted in tests/components/EntryMarks.
export default {
  title: 'Surfaces / Entry Marks',
};

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="badges">{children}</div>
);

export const Own: Story = () => (
  <Row>
    <EntryMarks kind="own" />
  </Row>
);

export const InCupboard: Story = () => (
  <Row>
    <EntryMarks kind="cupboard" />
  </Row>
);

export const InCupboardAnnotated: Story = () => (
  <Row>
    <EntryMarks kind="cupboard" annotated />
  </Row>
);

export const Retired: Story = () => (
  <Row>
    <EntryMarks kind="cupboard" retired annotated />
  </Row>
);

// Renders nothing: a compendium entry no cupboard names carries no mark.
export const NotInCupboard: Story = () => (
  <Row>
    <EntryMarks kind="compendium" />
  </Row>
);

// The New / Updated marker (MB.106): New and Updated on an ingredient card and in the entry
// page's heading area.
const CARD = {
  href: '/compendium/ingredients/testwort-testalis' as const,
  label: 'Testwort',
  formalName: 'Fixtura testalis',
  nomenclature: 'botanical' as const,
  kind: 'compendium' as const,
};

export const Recency: Story = () => (
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
);
