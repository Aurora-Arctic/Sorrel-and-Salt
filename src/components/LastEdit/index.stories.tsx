import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { StatesGrid } from '../../../.storybook/states-grid';
import LastEdit from '.';

const meta = {
  title: 'Ingredients / Last Edit',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const AGO = (ms: number) => new Date(Date.now() - ms).toISOString();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const States: Story = {
  render: () => (
    <StatesGrid
      cell="14rem"
      states={{
        'Just Now': <LastEdit by="Fixture A" at={AGO(5 * 1000)} />,
        'Hours Ago': <LastEdit by="Fixture A" at={AGO(5 * HOUR)} />,
        'Days Ago': <LastEdit by="Fixture A" at={AGO(3 * DAY)} />,
        'Months Ago': <LastEdit by="Fixture A" at={AGO(75 * DAY)} />,
        'Years Ago': <LastEdit by="Fixture A" at={AGO(800 * DAY)} />,
        Unnamed: <LastEdit by={null} at={AGO(40 * DAY)} />,
        'Clock In The Future': <LastEdit by="Fixture A" at={AGO(-2 * DAY)} />,
        'Invalid Date: Nothing Drawn': (
          <>
            <LastEdit by="Fixture A" at="not a date" />
            <p style={{ margin: 0 }}>The date cannot be read, so nothing is drawn.</p>
          </>
        ),
      }}
    />
  ),
};
