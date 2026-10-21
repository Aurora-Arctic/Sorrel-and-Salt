import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Skeleton from '.';

// Render-only; the skeleton announces itself once, as a status, and the shapes
// are hidden from assistive technology. Each story is one shape.
const meta = {
  title: 'Feedback / Skeleton',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <Skeleton shape="table" /> };

export const TableWithFilter: Story = { render: () => <Skeleton shape="table" filter /> };

export const Cards: Story = { render: () => <Skeleton shape="cards" /> };

export const CardsWithFilter: Story = { render: () => <Skeleton shape="cards" filter /> };

export const Form: Story = { render: () => <Skeleton shape="form" /> };

export const Page: Story = { render: () => <Skeleton shape="page" /> };

export const Line: Story = { render: () => <Skeleton shape="line" /> };

export const TableWithTitleAndFilter: Story = {
  render: () => <Skeleton shape="table" title action filter />,
};

export const CardsWithTitleAndFilter: Story = {
  render: () => <Skeleton shape="cards" title action filter />,
};

export const Contents: Story = { render: () => <Skeleton shape="contents" /> };

export const PageWithMenu: Story = { render: () => <Skeleton shape="page" menu /> };
