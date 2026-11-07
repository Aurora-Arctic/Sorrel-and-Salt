import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import { StockBadge } from '.';

const meta = {
  title: 'Ingredients / Stock Badge',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Nothing = ({ why }: { why: string }) => <p style={{ margin: 0 }}>{why}</p>;

export const States: Story = {
  render: () => (
    <div style={{ paddingBlockStart: '3rem' }}>
      <StatesGrid
        cell="12rem"
        states={{
          Low: <StockBadge quantity={6} threshold={10} unit="g" />,
          'Low Without A Unit': <StockBadge quantity={6} threshold={10} />,
          'Quantity Equal To The Threshold': <StockBadge quantity={10} threshold={10} unit="g" />,
          Out: <StockBadge quantity={0} threshold={10} unit="g" />,
          'Stocked: Nothing Drawn': (
            <>
              <StockBadge quantity={25} threshold={10} unit="g" />
              <Nothing why="Above the threshold, so no badge." />
            </>
          ),
          'No Quantity: Nothing Drawn': (
            <>
              <StockBadge quantity={null} threshold={10} unit="g" />
              <Nothing why="No quantity, so no badge." />
            </>
          ),
          'No Threshold: Nothing Drawn': (
            <>
              <StockBadge quantity={6} threshold={null} unit="g" />
              <Nothing why="No threshold, so no badge." />
            </>
          ),
        }}
      />
    </div>
  ),
};
