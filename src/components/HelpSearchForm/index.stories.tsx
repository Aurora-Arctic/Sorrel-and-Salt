import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HelpSearchForm from '.';

const meta: Meta<typeof HelpSearchForm> = {
  title: 'Pages / Help / HelpSearchForm',
  component: HelpSearchForm,
};
export default meta;

export const Empty: StoryObj<typeof HelpSearchForm> = {};
export const WithQuery: StoryObj<typeof HelpSearchForm> = { args: { query: 'stock levels' } };
