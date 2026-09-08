import type { Story } from '@ladle/react';
import ThemeToggle from '.';

// M0.30 ships this one story so the workshop pipeline has something real to
// compile — ThemeToggle's index.scss opens with `@use '../../scss/variables'
// as *;`, so rendering the component here proves Sass resolves in the workshop
// the way it does under `next dev`.
//
// The component's meaningful states — light selected, dark selected,
// reduced-motion — are M0.32's job. This file stays a single default render
// until then.
export default {
  title: 'ThemeToggle',
};

export const Default: Story = () => <ThemeToggle />;
