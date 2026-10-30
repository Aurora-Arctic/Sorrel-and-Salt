import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import { type ReactElement, useEffect, useRef } from 'react';
import type { RequestHandler } from 'msw';
import { SaveStockDocument } from '@/gql/graphql';
import { answerMutation, refusal, useMockHandlers } from '../../../.storybook/mock-api';
import StockDialog from '.';
import type { StockForm, StockJar } from './types';

// Render-only; behaviour is asserted in tests/components/StockDialog. The fake API
// (.storybook/mock-api.ts) answers the call, and the two refused states each get a
// refusal the real server can send. Every name is invented.
const meta = {
  title: 'Ingredients / Stock Dialog',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

const WORKSPACE = '00000000-0000-4000-8000-000000000001';
const INGREDIENT = '00000000-0000-4000-8000-000000000002';

const FORMS: StockForm[] = [
  { variantId: '00000000-0000-4000-8000-0000000000f1', label: 'Dried Leaf' },
  { variantId: '00000000-0000-4000-8000-0000000000f2', label: 'Oil' },
  { variantId: '00000000-0000-4000-8000-0000000000f3', label: 'Resin' },
];

const LEAF: StockJar = {
  id: '00000000-0000-4000-8000-0000000000a1',
  variantId: FORMS[0].variantId,
  quantity: 20,
  unit: 'g',
  threshold: 30,
};
const OIL: StockJar = {
  id: '00000000-0000-4000-8000-0000000000a2',
  variantId: FORMS[1].variantId,
  quantity: 50,
  unit: 'ml',
  threshold: null,
};
const RESIN: StockJar = {
  id: '00000000-0000-4000-8000-0000000000a3',
  variantId: FORMS[2].variantId,
  quantity: null,
  unit: null,
  threshold: null,
};

const Dialog = ({ jars, openOn }: { jars: StockJar[]; openOn?: string }): ReactElement => (
  <StockDialog
    workspaceId={WORKSPACE}
    ingredientId={INGREDIENT}
    ingredientName="Testwort"
    forms={FORMS}
    jars={jars}
    openOn={openOn}
  />
);

/** Sets a box's value as typing would, so react-hook-form hears it. */
function type(box: HTMLInputElement | null | undefined, value: string): void {
  if (!box) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(box, value);
  box.dispatchEvent(new Event('input', { bubbles: true }));
}

const fieldBoxes = (): NodeListOf<HTMLInputElement> =>
  document.querySelectorAll<HTMLInputElement>('.stock-dialog__fields input');

const choose = (index: number): void =>
  document.querySelectorAll<HTMLButtonElement>('.stock-dialog__choose')[index]?.click();

const press = (selector: string): void =>
  document.querySelector<HTMLButtonElement>(selector)?.click();

// The field issues a batch of two edits and a removal can earn, in the shape
// src/graphql/errors.ts sends a ValidationError (claude-docs/components/stock-dialog.md,
// "Saving"): an issue on each edited jar's box. The server checks every row before
// reading a jar, so this refusal carries field issues only.
const REFUSED = [
  answerMutation(SaveStockDocument, () =>
    refusal({
      message: 'Invalid input',
      path: ['saveStock'],
      code: 'VALIDATION',
      fieldErrors: [
        { path: ['update', 0, 'input', 'quantityOnHand'], message: 'Quantity cannot be negative' },
        {
          path: ['update', 1, 'input', 'lowStockThreshold'],
          message: 'Low Stock At cannot be negative',
        },
      ],
    }),
  ),
];

// The refusal of the whole batch, in the shape src/graphql/errors.ts sends a
// NotFound: a jar it names is gone, or another coven's, so nothing is saved.
// No path in the batch, so no field is marked and the sentence is the alert.
const GONE = [
  answerMutation(SaveStockDocument, () =>
    refusal({ message: 'No such stock in this coven', code: 'NOT_FOUND', path: ['saveStock'] }),
  ),
];

// With neither state, a save is answered as accepted.
const NONE: RequestHandler[] = [];

// Pressed already, as after a click on the stock button: Dried Leaf chosen and
// badged Low Stock (with every form held, Resin is listed as unmeasured). With no
// jar, the fields' column holds its place so the dialog keeps its size.
// `remove` presses the chosen jar's bin, so its removal waits for Save.
// `save` types into the chosen jar's Quantity and presses Save, which NOT_FOUND
// answers: the server's sentence in the alert, no form marked, input kept.
// `refuse` edits Dried Leaf's Quantity and Oil's Low Stock At, removes Resin and
// presses Save, which REFUSAL answers: both forms marked, Dried Leaf chosen with
// its error in view, Resin still staged, no alert.
const Pressed = ({
  jars,
  remove = false,
  save = false,
  refuse = false,
  openOn,
}: {
  jars: StockJar[];
  remove?: boolean;
  save?: boolean;
  refuse?: boolean;
  openOn?: string;
}): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  useMockHandlers(refuse ? REFUSED : save ? GONE : NONE);
  useEffect(() => {
    root.current?.querySelector('button')?.click();
    const steps: (() => void)[] = [];
    if (remove) steps.push(() => press('.stock-dialog__head .icon-tip__remove'));
    if (save) {
      steps.push(
        () => type(fieldBoxes()[0], '7'),
        () => press('dialog button[type="submit"]'),
      );
    }
    if (refuse) {
      steps.push(
        () => type(fieldBoxes()[0], '-1'),
        () => choose(1),
        () => type(fieldBoxes()[1], '-2'),
        () => choose(2),
        () => press('.stock-dialog__head .icon-tip__remove'),
        () => press('dialog button[type="submit"]'),
      );
    }
    // One step a tick, each after the render the last one caused.
    const timers = steps.map((step, at) => setTimeout(step, 100 * (at + 1)));
    return () => timers.forEach(clearTimeout);
  }, [remove, save, refuse]);
  return (
    <div ref={root}>
      <Dialog jars={jars} openOn={openOn} />
    </div>
  );
};

const openNode = <Pressed jars={[LEAF, OIL]} />;
const openNoneHeldNode = <Pressed jars={[]} />;
const openAllHeldNode = <Pressed jars={[LEAF, OIL, RESIN]} />;
const openRefusedNode = <Pressed jars={[LEAF, OIL, RESIN]} refuse />;
const openFailedNode = <Pressed jars={[LEAF, OIL]} save />;
const openRemovingNode = <Pressed jars={[LEAF, OIL]} remove />;
// `openOn` names the form chosen as the dialog opens; a form with no jar is added as a new row.
const openOnAHeldFormNode = <Pressed jars={[LEAF, OIL]} openOn={FORMS[1].variantId} />;
const openOnAFormNotHeldNode = <Pressed jars={[LEAF, OIL]} openOn={FORMS[2].variantId} />;

// A modal draws in the page's own document, so its stories sit in a frame of
// their own (claude-docs/workshop.md).

const STOCK_STATES: Record<string, ReactNode> = {
  Open: openNode,
  'Open On A Held Form': openOnAHeldFormNode,
  'Open On A Form Not Held': openOnAFormNotHeldNode,
  'Open None Held': openNoneHeldNode,
  'Open All Held': openAllHeldNode,
  // Refused rows carry the Needs a Fix flag in the form list.
  'Open Refused': openRefusedNode,
  'Open Failed': openFailedNode,
  'Open Removing': openRemovingNode,
};

export const States: Story = {
  args: { state: 'Open' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STOCK_STATES), mapping: STOCK_STATES },
  },
  render: ({ state }) => <div>{state}</div>,
};
