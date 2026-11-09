import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HelpScreenshot from '.';

const meta: Meta<typeof HelpScreenshot> = {
  title: 'Pages / Help / HelpScreenshot',
  component: HelpScreenshot,
  args: {
    src: '/help/screens/spell-builder.png',
    dark: '/help/screens/spell-builder.dark.png',
    alt: 'The spell builder over a draft, every section open',
  },
  render: (args) => (
    <figure className="figure" style={{ margin: '2rem' }}>
      <HelpScreenshot {...args} />
      <figcaption>The spell builder, every section open.</figcaption>
    </figure>
  ),
};
export default meta;

export const Default: StoryObj<typeof HelpScreenshot> = {};
