import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import LocalTime from '.';

// Render-only; the text is the viewer's own zone once hydrated, so the stories pin a zone.
const meta = {
  title: 'Display / Local Time',
  component: LocalTime,
} satisfies Meta<typeof LocalTime>;
export default meta;
type Story = StoryObj<typeof meta>;

const AT = new Date('2026-10-30T23:05:00.000Z');

export const Default: Story = { args: { at: AT } };

// The same instant in Tokyo, a day later.
export const InAnotherZone: Story = { args: { at: AT, timeZone: 'Asia/Tokyo' } };
