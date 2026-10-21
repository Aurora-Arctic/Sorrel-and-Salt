import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Link from 'next/link';
import ErrorPage from '.';

// Render-only; behaviour is asserted in tests/components/ErrorPage. Each story
// carries its own `main.page-frame`, as the component does.
const meta = {
  title: 'Pages / Error Page',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ErrorPage title="Page Not Found" reason="There is nothing at this address.">
      <Link className="btn btn--quiet" href="/">
        Back to Sorrel &amp; Salt
      </Link>
    </ErrorPage>
  ),
};

const SomethingWentWrongView = () => (
  <ErrorPage
    title="Something Went Wrong"
    reason="The page could not be shown. Trying again often works."
    reference="1234567890"
  >
    <button type="button" className="btn btn--solid">
      Try Again
    </button>
    <Link className="btn btn--quiet" href="/">
      Back to Sorrel &amp; Salt
    </Link>
  </ErrorPage>
);

export const SomethingWentWrong: Story = { render: SomethingWentWrongView };
