import type { Story } from '@ladle/react';
import Backdrop from '.';

// Render-only. The element is fixed to the viewport corner, so the story frame
// itself is not where it appears — look at the bottom right of the preview.
export default {
  title: 'Backdrop',
};

// The size every page but the front door gets.
export const Default: Story = () => <Backdrop />;

// The front door's size: `.welcome-page` on an ancestor is the hook, as on the real page.
export const FrontDoor: Story = () => (
  <div className="welcome-page">
    <Backdrop />
  </div>
);
