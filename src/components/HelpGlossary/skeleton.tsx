import type { ReactElement } from 'react';
import HelpSearchForm from '../HelpSearchForm';
import PageHeader from '../PageHeader';
import Skeleton from '../Skeleton';
import './index.scss';

// The glossary with its terms still to come: the page's own heading, search box and title, and a bar per row.
export const HelpGlossarySkeleton = (): ReactElement => (
  <div className="help-page help-glossary">
    <PageHeader title="Help" />
    <HelpSearchForm />
    <h2>Glossary</h2>
    <Skeleton shape="line" count={6} quiet />
  </div>
);
