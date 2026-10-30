import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ReactNode } from 'react';
import Skeleton from '.';
import SwapPanel from './swap-panel';

// Render-only; the skeleton announces itself once, as a status, and the shapes
// are hidden from assistive technology. Each story is one shape.
const meta = {
  title: 'Feedback / Skeleton',
} satisfies Meta;
export default meta;
type Story = StoryObj<{ state?: import('react').ReactNode }>;

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

const tabsNode = <Skeleton shape="table" title action tabs filter />;

const entryNode = <Skeleton shape="page" menu entry />;

const eyebrowHeadNode = <Skeleton shape="page" head="eyebrow" />;

const titleHeadNode = <Skeleton shape="page" head="title" />;

const contentsEyebrowNode = <Skeleton shape="contents" head="eyebrow" />;

const fewRowsNode = <Skeleton shape="table" count={3} />;

const manyCardsNode = <Skeleton shape="cards" count={8} />;

// What a panel shows while the next one loads: the skeleton in the panel's own place.
const swapPendingNode = (
  <SwapPanel pending className="tabbed-page__panel" shape="table" filter>
    <p>The content that replaces it.</p>
  </SwapPanel>
);

const pageWithMenuNode = <Skeleton shape="page" menu />;

const SKELETON_STATES: Record<string, ReactNode> = {
  Table: defaultNode,
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
  'Tabbed Page': tabsNode,
  'Entry With Menu': entryNode,
  'Page With Eyebrow Head': eyebrowHeadNode,
  'Page With Title Head': titleHeadNode,
  'Contents With Eyebrow Head': contentsEyebrowNode,
  'Table With Three Rows': fewRowsNode,
  'Cards With Eight': manyCardsNode,
  'Swap Panel Pending': swapPendingNode,
};

export const States: Story = {
  args: { state: 'Table' },
  argTypes: {
    state: { control: 'select', options: Object.keys(SKELETON_STATES), mapping: SKELETON_STATES },
  },
  render: ({ state }) => <div key={String(state)}>{state}</div>,
};
