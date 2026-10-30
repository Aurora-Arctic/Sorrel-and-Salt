import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import JarLine from '.';
import type { StockForm, StockJar } from '../StockDialog/types';

// Render-only; the lines' content is asserted in tests/components/SpellBuilder and
// tests/components/RecordWorking. Point at a pressable line to see the jar shake and the name grow.
// Every name is invented.
const meta = {
  title: 'Ingredients / Jar Line',
} satisfies Meta;
export default meta;
type Story = StoryObj;

const FORM: StockForm = {
  variantId: '00000000-0000-4000-8000-0000000000f1',
  label: 'Dried Leaf',
};
const JAR: StockJar = {
  id: 'a1',
  variantId: FORM.variantId,
  quantity: 180,
  unit: 'g',
  threshold: 100,
};
const press = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  ingredientId: '00000000-0000-4000-8000-000000000002',
  ingredientName: 'Testwort',
  forms: [FORM],
  jars: [JAR],
  openOn: FORM.variantId,
  ariaLabel: 'Edit Stock, Testwort, Dried Leaf',
};

export const States: Story = {
  render: () => (
    <ul style={{ listStyle: 'none', padding: 0, maxInlineSize: '24rem' }}>
      <JarLine
        seed="Testwort"
        kind="dried leaf"
        held={{ quantity: 180, threshold: 100 }}
        tone="ok"
        name="Testwort"
        press={press}
        words="need 20 g · have 180 g"
      />
      <JarLine
        seed="Testwort"
        kind="oil"
        held={{ quantity: 40, threshold: 50 }}
        tone="low"
        name="Testwort Oil"
        words="Still: no press"
      />
      <JarLine
        seed="Testwort"
        kind="resin"
        held={null}
        tone="empty"
        name="Testwort Resin"
        words="have no jar"
      />
      <JarLine
        seed="Fakeroot"
        kind=""
        held={null}
        tone="ok"
        oneOff
        name="Fakeroot"
        words="one-off · not kept"
      />
    </ul>
  ),
};
