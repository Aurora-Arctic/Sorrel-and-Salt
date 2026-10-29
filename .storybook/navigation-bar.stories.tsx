import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { type ReactElement, type ReactNode, useEffect, useState } from 'react';
import { BAR_FADE_MS, LOADING_DELAY_MS } from '../src/lib/navigation/timing';
import '../src/lib/navigation/navigation-bar.scss';
import { ShellFrame } from './shell-frame';

// The page bar's look, as static markup: the component's own timers and the
// navigation store are not needed to see how it is drawn. It is fixed along the
// bottom edge of the global bar, so each story sits in the shell frame, where
// that bar is drawn as in the app. Look for the thin accent line under the bar.
//
// Reduced motion: the sweep becomes a slow `loading-pulse`. The story pin
// (`meta.reducedMotion`) does not reach a CSS media query, so to see it turn on
// the OS "reduce motion" setting, or emulate `prefers-reduced-motion: reduce`
// in devtools (Rendering tab). The theme follows the workshop's toolbar switch.
const meta = {
  title: 'Feedback / Navigation Bar',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// The bar is `position: fixed` against the window, but the frame pads the shell
// in from the window's edge. A transformed box makes it the bar's containing
// block, so the bar lands on the bottom edge of the global bar as in the app.
// The box also becomes the skip link's, whose hiding (lifted above the page's
// top edge) then leaves it in view; the clip hides it again, and it still shows
// on focus, where it moves back inside the box.
const BarFrame = ({ children }: { children: ReactNode }): ReactElement => (
  <div style={{ transform: 'translateZ(0)', overflow: 'hidden' }}>
    <ShellFrame area="none">{children}</ShellFrame>
  </div>
);

export const Default: Story = {
  render: () => (
    <BarFrame>
      <div className="navigation-bar" aria-hidden="true" />
    </BarFrame>
  ),
};

// `hidden` and `data-leaving` together, the fade-out; reload to see it.
export const Leaving: Story = {
  render: () => (
    <BarFrame>
      <div className="navigation-bar" aria-hidden="true" hidden data-leaving="" />
    </BarFrame>
  ),
};

type Step = 'idle' | 'waiting' | 'shown' | 'leaving';

// How long the bar stays up, and how long the page sits idle between rounds.
const SHOWN_MS = 2500;
const IDLE_MS = 1500;

// Each step: how long it lasts, then the step after it.
const STEPS: Record<Step, readonly [number, Step]> = {
  idle: [IDLE_MS, 'waiting'],
  waiting: [LOADING_DELAY_MS, 'shown'],
  shown: [SHOWN_MS, 'leaving'],
  leaving: [BAR_FADE_MS, 'idle'],
};

const LABELS: Record<Step, string> = {
  idle: 'Idle',
  waiting: `Navigating, ${LOADING_DELAY_MS}ms delay: nothing shown yet`,
  shown: 'Navigating: the bar is shown',
  leaving: `Settled: the bar fades out over ${BAR_FADE_MS}ms`,
};

// The markup the component draws, with the story's own timer standing in for
// the navigation store: it plays the same four steps the component goes
// through (it has the same `hidden` / `data-leaving` states), on a loop.
const Looping = (): ReactElement => {
  const [step, setStep] = useState<Step>('idle');
  useEffect(() => {
    const [ms, next] = STEPS[step];
    const timer = setTimeout(() => setStep(next), ms);
    return () => clearTimeout(timer);
  }, [step]);
  return (
    <>
      <div
        className="navigation-bar"
        aria-hidden="true"
        hidden={step !== 'shown'}
        data-leaving={step === 'leaving' ? '' : undefined}
      />
      <output>{LABELS[step]}</output>
    </>
  );
};

export const Navigating: Story = {
  render: () => (
    <BarFrame>
      <Looping />
    </BarFrame>
  ),
};
