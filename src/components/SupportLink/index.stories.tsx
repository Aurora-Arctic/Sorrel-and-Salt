import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SupportLink from '.';

// Render-only; behaviour is asserted in tests/components/SupportLink.
const meta = { title: 'Shell / Support Link' } satisfies Meta;
export default meta;

export const OpensDialog: StoryObj = { render: () => <SupportLink>Support</SupportLink> };
export const Plain: StoryObj = { render: () => <SupportLink plain>Support</SupportLink> };
