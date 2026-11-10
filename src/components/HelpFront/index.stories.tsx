import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HelpFront from '.';

// Render-only; behaviour is asserted in tests/components/HelpFront and tests/e2e/help-pages.spec.ts.
const meta: Meta<typeof HelpFront> = {
  title: 'Pages / Help / HelpFront',
  component: HelpFront,
  args: {
    children: (
      <div className="help-page">
        <h2>Search Help</h2>
        <p>The page beneath the header.</p>
      </div>
    ),
  },
};
export default meta;

export const Default: StoryObj<typeof HelpFront> = {};
export const WithStaffHelp: StoryObj<typeof HelpFront> = { args: { staffHelp: true } };
