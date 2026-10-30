import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import JarShelf, { JarDrawing } from '.';
import { BOTTLES, JARS, type SHAPES } from './shapes';
import type { StockForm, StockJar } from '../StockDialog/types';
import type { HeldJar, ShelfForm } from './types';

// Render-only; the vessel pick and the level are asserted in tests/components/JarShelf, and
// the press in tests/components/IngredientEntry. In the workshop the dialog a press opens
// reaches no server. Every name is invented.
const meta = {
  title: 'Ingredients / Jar Shelf',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const WORKSPACE = '00000000-0000-4000-8000-000000000001';
const INGREDIENT = '00000000-0000-4000-8000-000000000002';
const SEED = 'Testwort';

const FORMS: ShelfForm[] = [
  {
    variantId: '00000000-0000-4000-8000-0000000000f1',
    form: 'dried leaf',
    jar: { id: 'a1', quantity: 180, unit: 'g', threshold: 100 },
  },
  {
    variantId: '00000000-0000-4000-8000-0000000000f2',
    form: 'oil',
    jar: { id: 'a2', quantity: 40, unit: 'ml', threshold: 50 },
  },
  {
    variantId: '00000000-0000-4000-8000-0000000000f3',
    form: 'powder',
    jar: { id: 'a3', quantity: 0, unit: 'g', threshold: 20 },
  },
  {
    variantId: '00000000-0000-4000-8000-0000000000f4',
    form: 'resin',
    jar: { id: 'a4', quantity: null, unit: null, threshold: null },
  },
  {
    variantId: '00000000-0000-4000-8000-0000000000f5',
    form: 'tincture',
    jar: { id: 'a5', quantity: 12, unit: 'ml', threshold: null },
  },
  { variantId: '00000000-0000-4000-8000-0000000000f6', form: 'fresh herb', jar: null },
];

const edit = {
  workspaceId: WORKSPACE,
  ingredientId: INGREDIENT,
  ingredientName: 'Testwort',
  forms: FORMS.map(({ variantId, form }): StockForm => ({ variantId, label: form })),
  jars: FORMS.flatMap(({ variantId, jar }): StockJar[] => (jar ? [{ ...jar, variantId }] : [])),
};

/** A role that may not edit: plain figures, no buttons. */
const viewerNode = <JarShelf forms={FORMS} seed={SEED} />;

/** A role that may edit: each jar, the empty one too, opens Edit Stock on its form. */
const defaultNode = <JarShelf forms={FORMS} seed={SEED} edit={edit} />;

/** One form alone, as an entry with a single variant has. */
const oneFormNode = <JarShelf forms={FORMS.slice(0, 1)} seed={SEED} />;

const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  Viewer: viewerNode,
  'One Form': oneFormNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};

/** Part-full: at the threshold, so the level stands at half with the low-stock mark showing. */
const PART_FULL: Pick<HeldJar, 'quantity' | 'threshold'> = { quantity: 10, threshold: 10 };

type ShapeName = keyof typeof SHAPES;

/** Each shape on the shelf's own plank and cell, empty then part-full, named beneath. */
function ShapeGroup({ heading, shapes }: { heading: string; shapes: readonly ShapeName[] }) {
  return (
    <section>
      <h2>{heading}</h2>
      <ul className="jar-shelf" aria-label={heading}>
        {shapes.flatMap((shape) =>
          [
            { held: null, label: `${shape}, empty` },
            { held: PART_FULL, label: `${shape}, part-full` },
          ].map(({ held, label }) => (
            <li key={label} className="jar-shelf__jar">
              <JarDrawing shape={shape} held={held} />
              <span className="jar-shelf__amount">{label}</span>
            </li>
          )),
        )}
      </ul>
    </section>
  );
}

/** Every drawing in `SHAPES`, grouped by use, read from the lists so a new shape appears unedited. */
export const EveryShape: Story = {
  name: 'Every Shape',
  render: () => (
    <div>
      <ShapeGroup heading="Jars" shapes={JARS} />
      <ShapeGroup heading="Bottles" shapes={BOTTLES} />
      <ShapeGroup heading="Add Stock" shapes={['cloth']} />
    </div>
  ),
};
