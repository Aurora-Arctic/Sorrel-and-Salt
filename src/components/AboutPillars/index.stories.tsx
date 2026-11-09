import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BookIcon, CauldronIcon, StockIcon } from '../IconTip';
import AboutPillars from '.';

const meta = { title: 'Pages / About Pillars', component: AboutPillars } satisfies Meta<
  typeof AboutPillars
>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  args: {
    pillars: [
      {
        kicker: 'The Testwort',
        heading: 'What Is Fixed',
        text: 'The fixture reference.',
        icon: <BookIcon />,
        accent: 'accent',
      },
      {
        kicker: 'Fixture Stock',
        heading: 'What Is Held',
        text: 'The fixture stock.',
        icon: <StockIcon />,
        accent: 'clay',
      },
      {
        kicker: 'The Fixture Book',
        heading: 'What Is Made',
        text: 'The fixture spells.',
        icon: <CauldronIcon />,
        accent: 'sloe',
      },
    ],
  },
};
