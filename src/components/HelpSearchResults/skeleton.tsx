import type { ReactElement } from 'react';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import Skeleton from '../Skeleton';
import './index.scss';

// The search page with its results still to come: the page's own heading, search box and title, and bars for the
// count and the results. The words searched are in the address, which a skeleton does not read.
export const HelpSearchSkeleton = (): ReactElement => (
  <div className="help-page help-results">
    <PageHeader title="Help" />
    <HelpSearchForm />
    <h2>Search Help</h2>
    <Skeleton shape="line" count={4} quiet />
  </div>
);
