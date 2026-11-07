import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactNode, useEffect, useState } from 'react';
import { cardCategories, RECIPE_STEPS } from '../../../.storybook/grimoire-fixtures';
import { WorkshopSearch } from '../../../.storybook/navigation';
import { useSteps } from '../../../.storybook/press';
import { previewStepsOf } from './preview-steps';
import SpellPreview from '.';

const meta = {
  title: 'Grimoire / Spell Preview',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: ReactNode }>;

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
  Open: <Pane initial="?preview" />,
  'Screen Awake Off': <Pane initial="?preview" steps={[pressAwake]} />,
};

export const States: Story = {
  args: { state: 'Closed' },
  argTypes: { state: { control: 'select', options: Object.keys(STATES), mapping: STATES } },
  render: ({ state }) => <div>{state}</div>,
};
