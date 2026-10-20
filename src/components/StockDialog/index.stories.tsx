import type { Story } from '@ladle/react';
import { type ReactElement, useEffect, useRef } from 'react';
import StockDialog from '.';
import type { StockForm, StockJar } from './types';

// Render-only; behaviour is asserted in tests/components/StockDialog. In the
// workshop the call reaches no server, so saving shows the failure. Every
// name is invented.
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
  quantity: 250,
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

// Pressed already, as after a click on the pencil: the dialog over the page.
// `remove` then presses the first row's Remove, staging it.
// `save` then types into the first quantity and presses Save, which the workshop's missing
// server refuses: the alert over the rows, with what was typed kept.
const Pressed = ({
  jars,
  remove = false,
  save = false,
}: {
  jars: StockJar[];
  remove?: boolean;
  save?: boolean;
}): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelector('button')?.click();
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (remove) {
      timers.push(
        setTimeout(
          () =>
            document
              .querySelector<HTMLButtonElement>('.stock-dialog__row .icon-tip__remove')
              ?.click(),
          100,
        ),
      );
    }
    if (save) {
      timers.push(
        setTimeout(() => {
          const box = document.querySelector<HTMLInputElement>('.stock-dialog__row input');
          if (!box) return;
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(box, '7');
          box.dispatchEvent(new Event('input', { bubbles: true }));
        }, 100),
        setTimeout(() => {
          document.querySelector<HTMLButtonElement>('dialog button[type="submit"]')?.click();
        }, 300),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [remove, save]);
  return (
    <div ref={root}>
      <Dialog jars={jars} />
    </div>
  );
};

export const Open: Story = () => <Pressed jars={[LEAF, OIL]} />;
export const OpenNoneHeld: Story = () => <Pressed jars={[]} />;
export const OpenAllHeld: Story = () => <Pressed jars={[LEAF, OIL, RESIN]} />;
export const OpenRefused: Story = () => <Pressed jars={[LEAF, OIL]} save />;
export const OpenRemoving: Story = () => <Pressed jars={[LEAF, OIL]} remove />;
export const OpenPhoneDark: Story = () => <Pressed jars={[LEAF, OIL]} />;
export const OpenPhoneLight: Story = () => <Pressed jars={[LEAF, OIL]} />;

// A modal draws in the page's own document, so its stories sit in a frame of
// their own (claude-docs/workshop.md).
Open.meta = { iframed: true };
OpenNoneHeld.meta = { iframed: true };
OpenAllHeld.meta = { iframed: true };
OpenRemoving.meta = { iframed: true };
OpenPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };
OpenPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };
