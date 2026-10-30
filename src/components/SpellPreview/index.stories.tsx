import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactNode, useEffect, useState } from 'react';
import { cardCategories, RECIPE_STEPS } from '../../../.storybook/grimoire-fixtures';
import { WorkshopSearch } from '../../../.storybook/navigation';
import { useSteps } from '../../../.storybook/press';
import { previewStepsOf } from './preview-steps';
import SpellPreview from '.';

// Render-only; what shows and when is asserted in tests/components/SpellPreview. The pane is open
// while the address carries `?preview`, which `WorkshopSearch` follows as the page's router would.
// The workshop's browser may refuse the Screen Wake Lock, so the stories give it one that is held at
// once: without it the Screen Awake button is not drawn.
const meta = {
  title: 'Grimoire / Spell Preview',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

// A stand-in for the browser's wake lock, set on `navigator` before the pane asks for it and taken
// off when the story goes.
function useHeldWakeLock(): void {
  useState(() => {
    const request = (): Promise<WakeLockSentinel> => {
      const sentinel = Object.assign(new EventTarget(), {
        released: false,
        type: 'screen' as const,
        onrelease: null,
        release: async () => {
          sentinel.released = true;
          sentinel.dispatchEvent(new Event('release'));
        },
      });
      return Promise.resolve(sentinel);
    };
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    return null;
  });
  useEffect(() => () => void Reflect.deleteProperty(navigator, 'wakeLock'), []);
}

const Pane = ({ initial, steps = [] }: { initial?: string; steps?: readonly (() => void)[] }) => {
  useHeldWakeLock();
  useSteps(steps, 300);
  return (
    <WorkshopSearch initial={initial}>
      <SpellPreview
        title="Fixture Working"
        intent="To see clearly through the winter."
        categories={cardCategories('Protection', 'Clarity', 'Healing')}
        note="Best made on a dry night."
        steps={previewStepsOf(RECIPE_STEPS)}
        jarDescription="Squat Amber Jar"
        sealWaxColor="Red"
        moonPhase="Waxing Gibbous"
        dayOfWeek="Friday"
      />
    </WorkshopSearch>
  );
};

const pressAwake = (): void =>
  document.querySelector<HTMLButtonElement>('.spell-preview__awake')?.click();

const STATES: Record<string, ReactNode> = {
  Closed: <Pane />,
  // Categories, a toxic step, a one-off and a step whose ingredient was deleted since, with the
  // screen kept awake, as the pane asks on opening.
  Open: <Pane initial="?preview" />,
  'Screen Awake Off': <Pane initial="?preview" steps={[pressAwake]} />,
};

// A dropdown, not a grid: the open pane covers the window.
export const States: Story = {
  args: { state: 'Closed' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
