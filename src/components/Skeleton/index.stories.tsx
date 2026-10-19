import type { Story } from '@ladle/react';
import Skeleton from '.';

// Render-only; the skeleton announces itself once, as a status, and the shapes
// are hidden from assistive technology. Each story is one shape.
export default {
  title: 'Feedback / Loading / Skeleton',
};

export const Table: Story = () => <Skeleton shape="table" />;

export const TableWithFilter: Story = () => <Skeleton shape="table" filter />;

export const Cards: Story = () => <Skeleton shape="cards" />;

export const CardsWithFilter: Story = () => <Skeleton shape="cards" filter />;

export const Form: Story = () => <Skeleton shape="form" />;

export const Page: Story = () => <Skeleton shape="page" />;

export const Line: Story = () => <Skeleton shape="line" />;

export const TableWithTitleAndFilter: Story = () => <Skeleton shape="table" title action filter />;

export const CardsWithTitleAndFilter: Story = () => <Skeleton shape="cards" title action filter />;

export const Contents: Story = () => <Skeleton shape="contents" />;

export const PageWithMenu: Story = () => <Skeleton shape="page" menu />;
