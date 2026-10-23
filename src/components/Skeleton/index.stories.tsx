import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import Skeleton from '.';

// Render-only; the skeleton announces itself once, as a status, and the shapes
// are hidden from assistive technology. Each story is one shape.
const meta = {
  title: 'Feedback / Skeleton',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const defaultNode = <Skeleton shape="table" />;

const tableWithFilterNode = <Skeleton shape="table" filter />;

const cardsNode = <Skeleton shape="cards" />;

const cardsWithFilterNode = <Skeleton shape="cards" filter />;

const formNode = <Skeleton shape="form" />;

const pageNode = <Skeleton shape="page" />;

const lineNode = <Skeleton shape="line" />;

const tableWithTitleAndFilterNode = <Skeleton shape="table" title action filter />;

const cardsWithTitleAndFilterNode = <Skeleton shape="cards" title action filter />;

const contentsNode = <Skeleton shape="contents" />;

const pageWithMenuNode = <Skeleton shape="page" menu />;

// One story with a control to choose the state: each is a whole page or list,
// too big to sit beside the others (claude-docs/workshop.md, rule 5).
const STATES_STATES: Record<string, ReactNode> = {
  Default: defaultNode,
  'Table With Filter': tableWithFilterNode,
  Cards: cardsNode,
  'Cards With Filter': cardsWithFilterNode,
  Form: formNode,
  Page: pageNode,
  Line: lineNode,
  'Table With Title And Filter': tableWithTitleAndFilterNode,
  'Cards With Title And Filter': cardsWithTitleAndFilterNode,
  Contents: contentsNode,
  'Page With Menu': pageWithMenuNode,
};

export const States: Story = {
  args: { state: 'Default' },
  argTypes: {
    state: { control: 'select', options: Object.keys(STATES_STATES), mapping: STATES_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
