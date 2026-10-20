import type { Story } from '@ladle/react';
import { type ReactElement, useEffect, useRef } from 'react';
import EditStock from '.';
import type { EditStockJar } from './types';

// Render-only; behaviour is asserted in tests/components/EditStock. In the
// workshop the call reaches no server, so saving shows the failure. Every
// name is invented.
export default {
  title: 'Ingredients / Edit Stock',
};

const WORKSPACE = '00000000-0000-4000-8000-000000000001';

const JAR: EditStockJar = {
  id: '00000000-0000-4000-8000-0000000000a1',
  ingredient: 'Testwort',
  form: 'dried leaf',
  quantity: 250,
  unit: 'g',
  threshold: 30,
};

export const Default: Story = () => <EditStock workspaceId={WORKSPACE} jar={JAR} />;

// Pressed already, as after a click on the pencil: the dialog over the page.
const Pressed = ({ jar }: { jar: EditStockJar }): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => root.current?.querySelector('button')?.click(), []);
  return (
    <div ref={root}>
      <EditStock workspaceId={WORKSPACE} jar={jar} />
    </div>
  );
};

export const Open: Story = () => <Pressed jar={JAR} />;
export const OpenUnmeasured: Story = () => (
  <Pressed jar={{ ...JAR, quantity: null, unit: null, threshold: null }} />
);
export const OpenPhoneDark: Story = () => <Pressed jar={JAR} />;
export const OpenPhoneLight: Story = () => <Pressed jar={JAR} />;

// A modal draws in the page's own document, so its stories sit in a frame of
// their own (claude-docs/workshop.md).
Open.meta = { iframed: true };
OpenUnmeasured.meta = { iframed: true };
OpenPhoneDark.meta = { iframed: true, theme: 'dark', width: 375 };
OpenPhoneLight.meta = { iframed: true, theme: 'light', width: 375 };
