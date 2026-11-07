import type { ReactElement } from 'react';
import StackTable from '../DataTable';
import { EditLink } from '../IconTip';
import ListFrame, { ListBody } from '../ListFrame';
import { HelpListBodySkeleton } from './skeleton';
import Pager from '../Pager';
import { emptyList } from '../../lib/text';
import type { HelpListProps } from './types';

// The keepers' help rows as a table and pager; render-only. Each Edit is an address, so Back closes its modal.

const KIND_LABELS = { faq: 'FAQ', article: 'Article', term: 'Term' } as const;
const AUDIENCE_LABELS = { public: 'Public', staff: 'Staff', keeper: 'Keeper' } as const;

const HelpList = ({ articles, previousHref, nextHref }: HelpListProps): ReactElement => (
  <ListFrame>
    <ListBody skeleton={<HelpListBodySkeleton />}>
      <StackTable
        columns={[
          { heading: 'Title', cell: (article) => article.title },
          { heading: 'Kind', cell: (article) => KIND_LABELS[article.kind] },
          {
            heading: 'Audience',
            cell: (article) => (article.kind === 'term' ? '' : AUDIENCE_LABELS[article.audience]),
          },
          { heading: 'Position', cell: (article) => article.position ?? '' },
          {
            heading: 'Edit',
            hiddenHeading: true,
            action: 'corner',
            cell: (article) => (
              <EditLink
                href={article.editHref}
                name={article.title}
                heading={article.editHeading}
              />
            ),
          },
        ]}
        rows={articles}
        rowKey={(article) => article.id}
        empty={`${emptyList('help articles')} Add one with Add Help Article.`}
        aria-label="Help Articles"
      />
      <Pager previousHref={previousHref} nextHref={nextHref} soft />
    </ListBody>
  </ListFrame>
);

export default HelpList;
