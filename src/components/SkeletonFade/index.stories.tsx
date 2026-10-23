import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';
import { SkeletonOverlay, skeletonFadeHost, useLeavingSkeleton } from '.';

// Render-only; behaviour is asserted in tests/components/SkeletonFade. Press
// the button to start a wait (the skeleton) and again to end it: the page
// shows through as the skeleton fades over it for 200ms and goes.
const meta = {
  title: 'Feedback / Skeleton Fade',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Page = (): ReactElement => (
  <main className="page-column">
    <h1>Ingredients</h1>
    <p className="lede">The page that arrived, in the place the skeleton stood.</p>
    <p>Testwort</p>
  </main>
);

export const Default: Story = {
  render: () => {
    const [busy, setBusy] = useState(false);
    const skeleton = busy ? (
      <main className="page-column">
        <Skeleton shape="page" head="title" />
      </main>
    ) : null;
    const leaving = useLeavingSkeleton(skeleton);

    return (
      <>
        <p>
          <button type="button" className="btn" onClick={() => setBusy((on) => !on)}>
            {busy ? 'Arrive' : 'Start a Wait'}
          </button>
        </p>
        <div className={skeletonFadeHost(leaving !== null)}>
          {skeleton ?? <Page />}
          {leaving && <SkeletonOverlay>{leaving}</SkeletonOverlay>}
        </div>
      </>
    );
  },
};
