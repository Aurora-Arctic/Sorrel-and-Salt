import type { Route } from 'next';
import { Fragment, type ReactElement, type ReactNode } from 'react';
import { HELP_AUDIENCE_LABELS } from '../../lib/help-audience';
import { PendingLink } from '../../lib/navigation';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import HelpShownSwitch from './shown-switch';
import { EditLink } from '../IconTip';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import HelpOutlineFilterRow from './filter';
import HiddenEye from './eye';
import HelpGuidesBar from './guides-bar';
import HelpOrderTable from './order-table';
import { HelpOutlineBodySkeleton } from './skeleton';
import type {
  HelpOutlineChosen,
  HelpOutlineFilter,
  HelpOutlineHit,
  HelpOrderColumn,
  HelpOrderRow,
  HelpOutlineProps,
  HelpOutlineRow,
  HelpOutlineSubPage,
} from './types';
import './index.scss';

// The keepers' help list as an outline: the Guides bar on the left, the chosen guide's sub pages on the right
// (claude-docs/components/help-outline.md). Render-only but for its islands: the filter, the bar, the sortable tables and the
// shown switches.

const KIND_LABELS = { faq: 'FAQ Entry', article: 'Article', guide: 'Guide', term: 'Term' } as const;

/** The audience as a badge: green for Public, which every reader may read, muted for Staff and Keeper. */
export const AudienceBadge = ({ audience }: Pick<HelpOutlineRow, 'audience'>): ReactNode => (
  <span className={audience === 'public' ? 'badge badge--public' : 'badge badge--muted'}>
    {HELP_AUDIENCE_LABELS[audience]}
  </span>
);

const Title = ({ row, children }: { row: HelpOutlineRow; children?: ReactNode }): ReactElement => (
  <span className={row.shown ? 'help-outline__title' : 'help-outline__title is-hidden'}>
    {children ?? row.title}
    {!row.shown && (
      <>
        {' '}
        <HiddenEye />
      </>
    )}
  </span>
);

const cornerCell = (row: HelpOutlineRow): ReactElement => (
  <>
    <EditLink href={row.editHref} name={row.title} />
    <HelpShownSwitch id={row.id} title={row.title} shown={row.shown} />
  </>
);

function corner<Row extends HelpOutlineRow>(): StackColumn<Row> {
  return {
    heading: 'Edit',
    hiddenHeading: true,
    action: 'corner',
    className: 'help-outline__corner',
    headingClassName: 'help-outline__corner',
    cell: cornerCell,
  };
}

const audienceCell = (row: HelpOutlineRow): ReactNode => <AudienceBadge audience={row.audience} />;

/** A sortable table's columns after Order and Position: the row's title, its audience and its corner. */
const orderColumns = (title: string): HelpOrderColumn[] => [
  { heading: title, rowHeader: true },
  { heading: 'Audience' },
  { heading: 'Edit', hiddenHeading: true, corner: true, className: 'help-outline__corner' },
];

const orderRows = (rows: readonly HelpOutlineSubPage[]): HelpOrderRow[] =>
  rows.map((row) => ({
    id: row.id,
    title: row.title,
    index: row.index,
    cells: [
      <Title key="title" row={row} />,
      <Fragment key="audience">{audienceCell(row)}</Fragment>,
      <Fragment key="corner">{cornerCell(row)}</Fragment>,
    ],
  }));

const audienceColumn = <Row extends HelpOutlineRow>(): StackColumn<Row> => ({
  heading: 'Audience',
  cell: audienceCell,
});

const GuidePane = ({ guide }: { guide: HelpOutlineChosen }): ReactElement => (
  <>
    <div className="help-outline__head">
      <h2 id="help-outline-pane">
        <Title row={guide} />
      </h2>
      <span className="help-outline__head-actions">
        <HelpShownSwitch id={guide.id} title={guide.title} shown={guide.shown} label="Shown" />
        <EditLink href={guide.editHref} name={KIND_LABELS[guide.kind]} />
      </span>
    </div>
    <p className="help-outline__facts">
      <span>{HELP_AUDIENCE_LABELS[guide.audience]}</span>
      <span>
        Position {guide.place} of {guide.of}
      </span>
      {guide.order.length > 0 && (
        <span>
          {guide.order.length} {guide.order.length === 1 ? 'Sub Page' : 'Sub Pages'}
        </span>
      )}
      {guide.shown ? (
        <PendingLink href={guide.address as Route}>{guide.address}</PendingLink>
      ) : (
        <span>{guide.address}</span>
      )}
    </p>
    {guide.kind === 'guide' ? (
      <>
        <HelpOrderTable
          aria-label={`Sub Pages of ${guide.title}`}
          list={{ kind: 'subPages', guideId: guide.id }}
          order={guide.order}
          columns={orderColumns('Sub Page')}
          rows={orderRows(guide.subPages)}
          empty={
            guide.order.length === 0
              ? `${guide.title} has no sub pages.`
              : 'No sub page of this guide matches the filter.'
          }
        />
        <p className="help-outline__add">
          <PendingLink className="btn" href={guide.addSubPageHref}>
            Add Sub Page
          </PendingLink>
        </p>
      </>
    ) : (
      <p>An article holds no sub pages. To give it some, make it a guide in its editor.</p>
    )}
  </>
);

const ReaderAddress = ({ address }: { address: string }): ReactElement => (
  <p className="help-outline__facts">
    <PendingLink href={address as Route}>{address}</PendingLink>
  </p>
);

const FaqPane = ({
  rows,
  order,
  address,
}: {
  rows: readonly HelpOutlineSubPage[];
  order: readonly string[];
  address: string;
}): ReactElement => (
  <>
    <div className="help-outline__head">
      <h2 id="help-outline-pane">FAQ</h2>
    </div>
    <ReaderAddress address={address} />
    <HelpOrderTable
      aria-label="FAQ"
      list={{ kind: 'faq' }}
      order={order}
      columns={orderColumns('Question')}
      rows={orderRows(rows)}
      empty="Nothing here matches the filter."
    />
  </>
);

const GlossaryPane = ({
  rows,
  address,
}: {
  rows: readonly HelpOutlineRow[];
  address: string;
}): ReactElement => (
  <>
    <div className="help-outline__head">
      <h2 id="help-outline-pane">Glossary</h2>
    </div>
    <ReaderAddress address={address} />
    <StackTable
      aria-label="Glossary"
      columns={[{ heading: 'Term', cell: (row: HelpOutlineRow) => <Title row={row} /> }, corner()]}
      rows={rows}
      rowKey={(row) => row.id}
      empty="Nothing here matches the filter."
      emptyQuiet
    />
  </>
);

const SearchPane = ({
  rows,
  previousHref,
  nextHref,
}: {
  rows: readonly HelpOutlineHit[];
  previousHref?: Route;
  nextHref?: Route;
}): ReactElement => (
  <>
    <div className="help-outline__head">
      <h2 id="help-outline-pane">Search Results</h2>
    </div>
    <StackTable
      aria-label="Search Results"
      columns={[
        {
          heading: 'Title',
          cell: (row: HelpOutlineHit) => (
            <>
              <Title row={row} />
              {row.guideTitle && <span className="help-outline__in">In {row.guideTitle}</span>}
            </>
          ),
        },
        {
          heading: 'Kind',
          cell: (row) => (row.guideTitle ? 'Sub Page' : KIND_LABELS[row.kind]),
        },
        audienceColumn(),
        corner(),
      ]}
      rows={rows}
      rowKey={(row) => row.id}
      empty="No help row matches the search."
      emptyQuiet
    />
    <Pager previousHref={previousHref} nextHref={nextHref} soft />
  </>
);

const filterKey = (filter: HelpOutlineFilter): string =>
  [filter.query, filter.kind, filter.audience, filter.shown].join('\n');

const HelpOutline = ({ filter, guides, others, order, pane }: HelpOutlineProps): ReactElement => (
  <ListFrame>
    <HelpOutlineFilterRow key={filterKey(filter)} filter={filter} />
    <ListBody skeleton={<HelpOutlineBodySkeleton />}>
      <div className="help-outline">
        <HelpGuidesBar
          guides={guides}
          order={order}
          others={others}
          select={pane.kind !== 'search'}
        />
        <section className="help-outline__pane" aria-labelledby="help-outline-pane">
          {pane.kind === 'guide' && <GuidePane guide={pane.guide} />}
          {pane.kind === 'faq' && (
            <FaqPane rows={pane.rows} order={pane.order} address={pane.address} />
          )}
          {pane.kind === 'glossary' && <GlossaryPane rows={pane.rows} address={pane.address} />}
          {pane.kind === 'search' && (
            <SearchPane
              rows={pane.rows}
              previousHref={pane.previousHref}
              nextHref={pane.nextHref}
            />
          )}
          {pane.kind === 'empty' && (
            <>
              <div className="help-outline__head">
                <h2 id="help-outline-pane">No Matches</h2>
              </div>
              <p>No help row matches the filter. Add one with Add Help Article.</p>
            </>
          )}
        </section>
      </div>
    </ListBody>
  </ListFrame>
);

export default HelpOutline;
