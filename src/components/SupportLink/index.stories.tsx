import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SupportLink from '.';

const meta = { title: 'Shell / Support Link' } satisfies Meta;
export default meta;

export const OpensDialog: StoryObj = { render: () => <SupportLink>Support</SupportLink> };
