import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ReportThis from '.';

const meta = { title: 'Support / Report This', component: ReportThis } satisfies Meta<
  typeof ReportThis
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OutsideTheShell: Story = { args: { code: 500 } };
