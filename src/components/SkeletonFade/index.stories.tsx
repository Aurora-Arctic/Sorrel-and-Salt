import type { Story } from '@ladle/react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';
import { SkeletonOverlay, skeletonFadeHost, useLeavingSkeleton } from '.';

// Render-only; behaviour is asserted in tests/components/SkeletonFade. Press
// the button to start a wait (the skeleton) and again to end it: the page
// shows through as the skeleton fades over it for 200ms and goes.
export default {
  title: 'Shell / Skeleton Fade',
};

const Page = (): ReactElement => (
  <main className="page-column">
    <h1>Ingredients</h1>
    <p className="lede">The page that arrived, in the place the skeleton stood.</p>
    <p>Testwort</p>
  </main>
);

export const Crossfade: Story = () => {
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
        <button type="button" onClick={() => setBusy((on) => !on)}>
          {busy ? 'Arrive' : 'Start a Wait'}
        </button>
      </p>
      <div className={skeletonFadeHost(leaving !== null)}>
        {skeleton ?? <Page />}
        {leaving && <SkeletonOverlay>{leaving}</SkeletonOverlay>}
      </div>
    </>
  );
};
