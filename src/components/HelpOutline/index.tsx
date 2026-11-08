import type { Route } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { HELP_AUDIENCE_LABELS } from '../../lib/help-audience';
import { PendingLink } from '../../lib/navigation';
import StackTable from '../DataTable';
import type { StackColumn } from '../DataTable/types';
import HelpShownSwitch from './shown-switch';
import { EditLink } from '../IconTip';
import ListFrame, { ListBody } from '../ListFrame';
import Pager from '../Pager';
import HelpOutlineFilterRow from './filter';
import HelpGuideSelect from './guide-select';
import HelpMoveButtons from './move-buttons';
import { HelpOutlineBodySkeleton } from './skeleton';
import type {
  HelpOutlineChosen,
  HelpOutlineFilter,
  HelpOutlineHit,
  HelpOutlineProps,
  HelpOutlineRow,
} from './types';
import './index.scss';

// The keepers' help list as an outline: the guides in order on the left, the chosen one's sub pages on the right,
// ordered by pressing Move Up and Move Down (claude-docs/components/help-outline.md). Render-only but for its
// islands: the filter, the phone's guide select, the moves and the shown switches.

const KIND_LABELS = { faq: 'FAQ Entry', article: 'Article', term: 'Term' } as const;

/** The audience, drawn only when it is not Public, which every reader may read. */
export const AudienceBadge = ({ audience }: Pick<HelpOutlineRow, 'audience'>): ReactNode =>
  audience === 'public' ? null : (
    <span className="badge badge--muted">{HELP_AUDIENCE_LABELS[audience]}</span>
  );

/** The third of a hidden row's three marks, beside its lidded eye and its muted title. */
export const HiddenBadge = ({ shown }: Pick<HelpOutlineRow, 'shown'>): ReactNode =>
  shown ? null : <span className="badge badge--muted help-outline__hidden">Hidden</span>;

const Title = ({ row, children }: { row: HelpOutlineRow; children?: ReactNode }): ReactElement => (
  <span className={row.shown ? 'help-outline__title' : 'help-outline__title is-hidden'}>
    {children ?? row.title} <HiddenBadge shown={row.shown} />
  </span>
);

function corner<Row extends HelpOutlineRow>(): StackColumn<Row> {
  return {
    heading: 'Edit',
    hiddenHeading: true,
    action: 'corner',
    className: 'help-outline__corner',
    headingClassName: 'help-outline__corner',
    cell: (row) => (
      <>
        <EditLink href={row.editHref} name={row.title} />
        <HelpShownSwitch id={row.id} title={row.title} shown={row.shown} />
      </>
    ),
  };
}

const audienceColumn = <Row extends HelpOutlineRow>(): StackColumn<Row> => ({
  heading: 'Audience',
  cell: (row) => (row.audience === 'public' ? 'Public' : <AudienceBadge audience={row.audience} />),
});

const GuidePane = ({ guide }: { guide: HelpOutlineChosen }): ReactElement => (
  <>
    <div className="help-outline__head">
      <h2 id="help-outline-pane">
        <Title row={guide} />
      </h2>
      <span className="help-outline__head-actions">
        <HelpShownSwitch id={guide.id} title={guide.title} shown={guide.shown} label="Shown" />
        <PendingLink className="btn btn--quiet" href={guide.editHref}>
          Edit Guide
        </PendingLink>
      </span>
    </div>
    <p className="help-outline__facts">
      <span>{HELP_AUDIENCE_LABELS[guide.audience]}</span>
      <span>
        Position {guide.place} of {guide.of}
      </span>
      <span>
        {guide.order.length} {guide.order.length === 1 ? 'Sub Page' : 'Sub Pages'}
      </span>
      {guide.shown ? (
        <PendingLink href={guide.address as Route}>{guide.address}</PendingLink>
      ) : (
        <span>{guide.address}</span>
      )}
    </p>
    <StackTable
      aria-label={`Sub Pages of ${guide.title}`}
      columns={[
        { heading: 'Position', cell: (row) => row.index + 1, className: 'help-outline__number' },
        { heading: 'Sub Page', cell: (row) => <Title row={row} /> },
        audienceColumn(),
        {
          heading: 'Order',
          className: 'help-outline__order',
          cell: (row) => (
            <HelpMoveButtons
              guideId={guide.id}
              order={guide.order}
              index={row.index}
              title={row.title}
            />
          ),
        },
        corner(),
      ]}
      rows={guide.subPages}
      rowKey={(row) => row.id}
      empty={
        guide.order.length === 0
          ? `${guide.title} has no sub pages.`
          : 'No sub page of this guide matches the filter.'
      }
      emptyQuiet
    />
    <p className="help-outline__add">
      <PendingLink className="btn" href={guide.addSubPageHref}>
        Add Sub Page to {guide.title}
      </PendingLink>
    </p>
  </>
);

const RowsPane = ({
  heading,
  rows,
  positioned,
}: {
  heading: string;
  rows: readonly HelpOutlineRow[];
  positioned: boolean;
}): ReactElement => (
  <>
    <div className="help-outline__head">
      <h2 id="help-outline-pane">{heading}</h2>
    </div>
    <StackTable
      aria-label={heading}
      columns={[
        positioned && {
          heading: 'Position',
          cell: (row: HelpOutlineRow) => row.position ?? '',
          className: 'help-outline__number',
        },
        { heading: positioned ? 'Question' : 'Term', cell: (row) => <Title row={row} /> },
        positioned && audienceColumn(),
        corner(),
      ]}
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

const HelpOutline = ({ filter, guides, others, pane }: HelpOutlineProps): ReactElement => {
  const choices = [
    ...guides.map((guide) => ({
      label: `${guide.position ?? ''}. ${guide.title} · ${guide.subPages} ${guide.subPages === 1 ? 'Sub Page' : 'Sub Pages'}`,
      href: guide.href,
    })),
    ...others.map((other) => ({ label: `${other.label} · ${other.count}`, href: other.href })),
  ];
  const current = [...guides, ...others].find((entry) => entry.current)?.href;
  return (
    <ListFrame>
      <HelpOutlineFilterRow key={filterKey(filter)} filter={filter} />
      <ListBody skeleton={<HelpOutlineBodySkeleton />}>
        <div className="help-outline">
          <nav className="help-outline__nav" aria-label="Help Outline">
            {guides.length > 0 && (
              <>
                <p className="help-outline__group">Guides</p>
                <ul>
                  {guides.map((guide) => (
                    <li key={guide.id}>
                      <PendingLink
                        href={guide.href}
                        aria-current={guide.current ? 'page' : undefined}
                        className={guide.shown ? undefined : 'is-hidden'}
                      >
                        <span className="help-outline__label">
                          {guide.position ?? ''}. {guide.title}{' '}
                          <AudienceBadge audience={guide.audience} />{' '}
                          <HiddenBadge shown={guide.shown} />
                        </span>
                        <span className="help-outline__count">{guide.subPages}</span>
                      </PendingLink>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {others.length > 0 && (
              <>
                <p className="help-outline__group">Other Kinds</p>
                <ul>
                  {others.map((other) => (
                    <li key={other.label}>
                      <PendingLink
                        href={other.href}
                        aria-current={other.current ? 'page' : undefined}
                      >
                        <span className="help-outline__label">{other.label}</span>
                        <span className="help-outline__count">{other.count}</span>
                      </PendingLink>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </nav>
          {pane.kind !== 'search' && choices.length > 0 && (
            <HelpGuideSelect choices={choices} current={current} />
          )}
          <section className="help-outline__pane" aria-labelledby="help-outline-pane">
            {pane.kind === 'guide' && <GuidePane guide={pane.guide} />}
            {pane.kind === 'faq' && <RowsPane heading="FAQ" rows={pane.rows} positioned />}
            {pane.kind === 'glossary' && (
              <RowsPane heading="Glossary" rows={pane.rows} positioned={false} />
            )}
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
};

export default HelpOutline;
