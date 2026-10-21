import type { Story } from '@ladle/react';
import JarShelf from '.';
import type { StockForm, StockJar } from '../StockDialog/types';
import type { ShelfForm } from './types';

// Render-only; the vessel pick and the level are asserted in tests/components/JarShelf, and
// the press in tests/components/IngredientEntry. In the workshop the dialog a press opens
// reaches no server. Every name is invented.
export default {
  title: 'Ingredients / Jar Shelf',
};

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
export const Viewer: Story = () => <JarShelf forms={FORMS} seed={SEED} />;

/** A role that may edit: each jar, the empty one too, opens Edit Stock on its form. */
export const Editable: Story = () => <JarShelf forms={FORMS} seed={SEED} edit={edit} />;

/** One form alone, as an entry with a single variant has. */
export const OneForm: Story = () => <JarShelf forms={FORMS.slice(0, 1)} seed={SEED} />;
