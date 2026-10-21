import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import LastEdit from '.';

// Render-only; what shows and when is asserted in tests/components/LastEdit.
const meta = {
  title: 'Ingredients / Last Edit',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const DAYS_AGO = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export const Default: Story = { render: () => <LastEdit by="Fixture A" at={DAYS_AGO(3)} /> };

// An editor the viewer cannot name: the time stays, the name goes.
export const Unnamed: Story = { render: () => <LastEdit by={null} at={DAYS_AGO(40)} /> };
