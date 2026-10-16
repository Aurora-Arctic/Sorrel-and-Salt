import type { Story } from '@ladle/react';
import Link from 'next/link';
import ErrorPage from '.';

// Render-only; behaviour is asserted in tests/components/ErrorPage. Each story
// carries its own `main.page-frame`, as the component does.
export default {
  title: 'Pages / Error Page',
};

export const NotFound: Story = () => (
  <ErrorPage title="Page Not Found" reason="There is nothing at this address.">
    <Link className="btn btn--quiet" href="/">
      Back to Sorrel &amp; Salt
    </Link>
  </ErrorPage>
);

export const SomethingWentWrong: Story = () => (
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

export const PhoneDark: Story = () => <SomethingWentWrong />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <SomethingWentWrong />;
PhoneLight.meta = { theme: 'light', width: 375 };
