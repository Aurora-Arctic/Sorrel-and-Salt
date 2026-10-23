import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactElement } from 'react';
import JarShelf from '../src/components/JarShelf';
import type { ShelfForm } from '../src/components/JarShelf/types';
import '../src/components/CovenCards/index.scss';
import './mb121-proposals.scss';

// MB.121's design mocks: the options the review weighed and did not build, each the real
// component with one difference, for the owner to compare with the built proposal P1
// (claude-docs/design-decisions/mb.121-workspace-ingredients-review.md). Render-only; a mock
// the owner takes up becomes a change to the component and its tests, and this file goes.
// Every name is invented.
const meta = {
  title: 'Proposals / MB.121',
} satisfies Meta;
export default meta;
type Story = StoryObj;

// One jar of each kind: plenty, Low, Out, and no amount recorded.
const FORMS: ShelfForm[] = [
  {
    variantId: '00000000-0000-4000-8000-0000000000e1',
    form: 'dried leaf',
    jar: { id: 'm1', quantity: 180, unit: 'g', threshold: 100 },
  },
  {
    variantId: '00000000-0000-4000-8000-0000000000e2',
    form: 'oil',
    jar: { id: 'm2', quantity: 40, unit: 'ml', threshold: 50 },
  },
  {
    variantId: '00000000-0000-4000-8000-0000000000e3',
    form: 'powder',
    jar: { id: 'm3', quantity: 0, unit: 'g', threshold: 20 },
  },
  {
    variantId: '00000000-0000-4000-8000-0000000000e4',
    form: 'resin',
    jar: { id: 'm4', quantity: null, unit: null, threshold: null },
  },
];

const shelf = (variant?: string): ReactElement => (
  <div className={variant === undefined ? undefined : `mb121-mock mb121-mock--${variant}`}>
    <JarShelf forms={FORMS} seed="Testwort" />
  </div>
);

/** The shelf as it was before P1: Low and Out told by the jar's colour and the amount's ink. */
export const ShelfBefore: Story = { name: 'Shelf Before P1', render: () => shelf('before') };

/** P1, built: the card badge's symbol before a Low or Out amount. */
export const ShelfSymbol: Story = { name: 'P1 Symbol (Built)', render: () => shelf() };

/** P1b, a mock: the word Low or Out on its own line under the amount, and no symbol. */
export const ShelfWord: Story = { name: 'P1b Word', render: () => shelf('word') };

/** P1c, a mock: Low's threshold mark drawn heavier, and nothing added. */
export const ShelfMark: Story = { name: 'P1c Heavier Mark', render: () => shelf('mark') };

/**
 * A mock of the empty cupboard as a viewer sees it, with a second line saying who may add.
 * Today a viewer reads the first sentence alone (CovenCards/empty.tsx).
 */
export const ViewerEmpty: Story = {
  name: 'Viewer Empty Cupboard',
  render: () => (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- mirrors CovenCards/empty.tsx, which holds a paragraph
    <div role="status" aria-label="No Ingredients" className="coven-cards__empty">
      <p>There are no ingredients here yet.</p>
      <p>A member or owner of this coven can add them.</p>
    </div>
  ),
};
