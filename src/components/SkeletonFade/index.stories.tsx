import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';
import { SkeletonOverlay, skeletonFadeHost, useLeavingSkeleton } from '.';

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
        <Skeleton shape="line" count={3} />
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
