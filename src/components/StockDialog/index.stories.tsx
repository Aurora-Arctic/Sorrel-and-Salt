import type { Story } from '@ladle/react';
import { type ReactElement, useEffect, useLayoutEffect, useRef } from 'react';
import StockDialog from '.';
import type { StockForm, StockJar } from './types';

// Render-only; behaviour is asserted in tests/components/StockDialog. In the
// workshop the call reaches no server: OpenRefused and OpenFailed each
// answer it with a canned refusal the real server can send. Every name is
// invented.
export default {
  title: 'Ingredients / Stock Dialog',
};

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

const Dialog = ({ jars }: { jars: StockJar[] }): ReactElement => (
  <StockDialog
    workspaceId={WORKSPACE}
    ingredientId={INGREDIENT}
    ingredientName="Testwort"
    forms={FORMS}
    jars={jars}
  />
);

export const Default: Story = () => <Dialog jars={[LEAF, OIL]} />;

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

// Where the printed SaveStock document puts its one field, as Yoga locates
// an error: `saveStock` opens the document's second line, indented two.
const AT_SAVE_STOCK = { locations: [{ line: 2, column: 3 }], path: ['saveStock'] };

// The field issues a batch of two edits and a removal can earn, in the shape
// src/graphql/errors.ts sends a ValidationError
// (claude-docs/components/stock-dialog.md, "Saving"): an issue on each edited
// jar's box, by its place in `update`. The server checks every row before it
// reads a jar, so a refusal of this kind carries field issues only, and the
// removal staged beside them earns none.
const REFUSAL = {
  data: null,
  errors: [
    {
      message: 'Invalid input',
      ...AT_SAVE_STOCK,
      extensions: {
        code: 'VALIDATION',
        fieldErrors: [
          {
            path: ['update', 0, 'input', 'quantityOnHand'],
            message: 'Quantity cannot be negative',
          },
          {
            path: ['update', 1, 'input', 'lowStockThreshold'],
            message: 'Low Stock At cannot be negative',
          },
        ],
      },
    },
  ],
};

// The refusal of the whole batch, in the shape src/graphql/errors.ts sends a
// NotFound: a jar it names is gone, or another coven's, so nothing is saved.
// No path in the batch, so no field is marked and the sentence is the alert.
const NOT_FOUND = {
  data: null,
  errors: [
    {
      message: 'No such stock in this coven',
      ...AT_SAVE_STOCK,
      extensions: { code: 'NOT_FOUND' },
    },
  ],
};

/** Answers SaveStock with `answer` while the story is on screen. */
function useRefusingApi(answer: object | null): void {
  useLayoutEffect(() => {
    if (!answer) return;
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const body = typeof init?.body === 'string' ? init.body : '';
      if (body.includes('"operationName":"SaveStock"')) {
        return new Response(JSON.stringify(answer), {
          headers: { 'content-type': 'application/json' },
        });
      }
      return original(input, init);
    };
    return () => {
      window.fetch = original;
    };
  }, [answer]);
}

// Pressed already, as after a click on the stock button: the dialog over the
// page, Dried Leaf chosen and badged Low Stock (with every form held, Resin
// is listed as unmeasured). With no jar, the fields' column holds its place
// with the three shut, so the dialog is the size it will be once a form is
// added.
// `remove` then presses the chosen jar's bin, so its removal waits for Save.
// `save` then types into the chosen jar's Quantity and presses Save, which
// NOT_FOUND answers: the server's sentence in the alert above the fields, no
// form marked, and what was typed kept.
// `refuse` then edits Dried Leaf's Quantity and Oil's Low Stock At, removes
// Resin and presses Save, which REFUSAL answers: both forms marked, Dried
// Leaf (the first) chosen with its error in view, Resin still staged, and no
// alert.
const Pressed = ({
  jars,
  remove = false,
  save = false,
  refuse = false,
}: {
  jars: StockJar[];
  remove?: boolean;
  save?: boolean;
  refuse?: boolean;
}): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  useRefusingApi(refuse ? REFUSAL : save ? NOT_FOUND : null);
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
      <Dialog jars={jars} />
    </div>
  );
};

export const Open: Story = () => <Pressed jars={[LEAF, OIL]} />;
export const OpenNoneHeld: Story = () => <Pressed jars={[]} />;
export const OpenAllHeld: Story = () => <Pressed jars={[LEAF, OIL, RESIN]} />;
export const OpenRefused: Story = () => <Pressed jars={[LEAF, OIL, RESIN]} refuse />;
export const OpenFailed: Story = () => <Pressed jars={[LEAF, OIL]} save />;
export const OpenRemoving: Story = () => <Pressed jars={[LEAF, OIL]} remove />;
export const OpenPhoneDark: Story = () => <Pressed jars={[LEAF, OIL]} />;
export const OpenPhoneLight: Story = () => <Pressed jars={[LEAF, OIL]} />;
export const OpenPhoneNoneHeld: Story = () => <Pressed jars={[]} />;

// A modal draws in the page's own document, so its stories sit in a frame of
// their own (claude-docs/workshop.md).
Open.meta = { iframed: true };
OpenNoneHeld.meta = { iframed: true };
OpenAllHeld.meta = { iframed: true };
OpenRefused.meta = { iframed: true };
OpenFailed.meta = { iframed: true };
OpenRemoving.meta = { iframed: true };
OpenPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };
OpenPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };
OpenPhoneNoneHeld.meta = { iframed: true, theme: 'dark', width: 375 };
