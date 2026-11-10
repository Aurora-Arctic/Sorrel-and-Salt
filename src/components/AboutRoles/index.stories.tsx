import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AnnotateIcon, KeyIcon, SigilIcon } from '../IconTip';
import AboutRoles from '.';

const meta = { title: 'Pages / About Roles', component: AboutRoles } satisfies Meta<
  typeof AboutRoles
>;
export default meta;

export const Default: StoryObj<typeof meta> = {
  args: {
    roles: [
      { heading: 'The Fixture Owner', text: 'Holds the fixture account.', icon: <SigilIcon /> },
      { heading: 'A Fixture Keeper', text: 'Manages the fixture invitations.', icon: <KeyIcon /> },
      {
        heading: 'A Fixture Curator',
        text: 'Curates the fixture reference.',
        icon: <AnnotateIcon />,
      },
    ],
  },
};
