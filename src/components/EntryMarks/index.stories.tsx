import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';
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

const mark = (props: ComponentProps<typeof EntryMarks>) => (
  <Row>
    <EntryMarks {...props} />
  </Row>
);

const FORM = { form: 'Dried' };

// A compendium entry no cupboard names carries no mark outside a coven, so
// the public compendium's cell draws nothing; the note says so.
export const States: Story = {
  render: () => (
    <StatesGrid
      cell="14rem"
      states={{
        Own: mark({ kind: 'own' }),
        'In Cupboard': mark({ kind: 'cupboard' }),
        'In Cupboard Annotated': mark({ kind: 'cupboard', annotated: true }),
        Retired: mark({ kind: 'cupboard', retired: true, annotated: true }),
        'Retired Alone': mark({ kind: 'cupboard', retired: true }),
        'Own And Annotated: No Annotated Mark': mark({ kind: 'own', annotated: true }),
        'Compendium Entry In A Coven': mark({ kind: 'compendium', inCoven: true }),
        'Not In Cupboard: Nothing Drawn': (
          <>
            {mark({ kind: 'compendium' })}
            <p style={{ margin: 0 }}>On the public compendium no mark is drawn.</p>
          </>
        ),
        'Without Provenance': mark({ kind: 'cupboard', annotated: true, provenance: false }),
        'Toxic Ingredient': mark({ kind: 'cupboard', toxic: true }),
        'Toxic With Notes: Toxic Wins': mark({
          kind: 'cupboard',
          toxic: true,
          safetyNotes: 'Keep from children.',
        }),
        'Toxic In One Form': mark({ kind: 'cupboard', variants: [{ ...FORM, toxic: true }] }),
        'Not Toxic': mark({ kind: 'cupboard', toxic: false }),
        'Toxic Not Known': mark({ kind: 'cupboard', toxic: null }),
        'Caution From Notes': mark({ kind: 'cupboard', safetyNotes: 'Keep from children.' }),
        'Caution From A Form': mark({
          kind: 'cupboard',
          variants: [{ ...FORM, safetyNotes: 'Irritates skin when fresh.' }],
        }),
        'Safety Left Out': mark({ kind: 'cupboard', toxic: true, safety: false }),
        'New With Marks': mark({ kind: 'cupboard', annotated: true, toxic: true, recency: 'new' }),
        'Updated With Marks': mark({
          kind: 'own',
          safetyNotes: 'Handle with care.',
          recency: 'updated',
        }),
      }}
    />
  ),
};

// The New / Updated marker: New and Updated on an ingredient card and in the entry
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
