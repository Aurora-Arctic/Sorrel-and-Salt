'use client';

import { arrayMove } from '@dnd-kit/sortable';
import type { Route } from 'next';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { byAudience, HELP_AUDIENCE_LABELS } from '../../lib/help-audience';
import { PendingLink, usePendingNavigation } from '../../lib/navigation';
import { useAnnounce } from '../ClickFeedback/status-region';
import { ReorderButton } from '../IconTip';
import Notice from '../Notice';
import Spinner from '../Spinner';
import HiddenEye from './eye';
import HelpGuideSelect from './guide-select';
import { HelpSortable, useHelpSortableRow } from './sortable';
import type { HelpGuidesBarProps, HelpOutlineAudience, HelpOutlineOrderGuide } from './types';

// The keepers' Guides bar: the guides under their audience, Public, then Staff, then Keeper, once each. At rest it
// lists those the filter admits; in Reorder Mode every live guide, each moved by its grip among its own audience's
// alone, the whole order saved at every move (claude-docs/components/help-outline.md, "The Guides bar").

export const OrderHelpGuidesDocument = graphql(`
  mutation OrderHelpGuides($ids: [ID!]!) {
    orderHelpGuides(ids: $ids) {
      id
    }
  }
`);

const AUDIENCES: readonly HelpOutlineAudience[] = ['public', 'staff', 'keeper'];

/** The entries of each audience that has any, in the order given, Public first. */
const byGroup = <Entry extends { audience: HelpOutlineAudience }>(entries: readonly Entry[]) =>
  AUDIENCES.map((audience) => ({
    audience,
    entries: entries.filter((entry) => entry.audience === audience),
  })).filter((group) => group.entries.length > 0);

interface Move {
  id: string;
  title: string;
  /** Where it lands among its audience's, from 1. */
  place: number;
  /** The whole order before the move, to spring back to, and after it, to send. */
  from: string[];
  to: string[];
}

const ReorderRow = ({
  entry,
  place,
  busy,
  disabled,
}: {
  entry: HelpOutlineOrderGuide;
  place: number;
  busy: boolean;
  disabled: boolean;
}): ReactElement => {
  const { setNodeRef, style, dragging, grip } = useHelpSortableRow(entry.id, entry.title, disabled);
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={dragging ? 'help-outline__reorder-row is-dragging' : 'help-outline__reorder-row'}
    >
      {grip}
      <span className="help-outline__place" aria-busy={busy || undefined}>
        {busy ? <Spinner /> : `${place}.`}
      </span>
      <span className={entry.shown ? 'help-outline__label' : 'help-outline__label is-hidden'}>
        {entry.title}
      </span>
      {!entry.shown && (
        <span className="help-outline__marks">
          <HiddenEye />
        </span>
      )}
    </li>
  );
};

const HelpGuidesBar = ({
  guides,
  order,
  others,
  select = false,
}: HelpGuidesBarProps & {
  /** Draws the phone's Guide select, which a search's results stand without. */
  select?: boolean;
}): ReactElement => {
  const id = useId();
  const { refresh } = usePendingNavigation();
  const announce = useAnnounce();
  const grouped = byAudience(order).map((entry) => entry.id);
  const orderKey = grouped.join(' ');

  // The order shown: the page's, or a moved one from the move until the page's catches up.
  const [ids, setIds] = useState<string[]>(grouped);
  const [seenKey, setSeenKey] = useState(orderKey);
  if (seenKey !== orderKey) {
    setSeenKey(orderKey);
    setIds(grouped);
  }
  const [reordering, setReordering] = useState(false);
  const [saving, setSaving] = useState<string>();
  const [failed, setFailed] = useState<Move>();

  const modeRef = useRef<HTMLDivElement>(null);
  const barButton = useRef<HTMLButtonElement>(null);
  const phoneButton = useRef<HTMLButtonElement>(null);
  const [focusBack, setFocusBack] = useState<'bar' | 'phone' | null>(null);

  useEffect(() => {
    if (reordering)
      modeRef.current?.querySelector<HTMLButtonElement>('.help-outline__grip')?.focus();
    else if (focusBack) (focusBack === 'phone' ? phoneButton : barButton).current?.focus();
  }, [reordering, focusBack]);

  const byId = new Map(order.map((entry) => [entry.id, entry]));
  const rows = ids.flatMap((key) => byId.get(key) ?? []);
  /** The whole order with a guide moved within its audience's run, every other audience's left as it is. */
  const moved = (
    now: readonly string[],
    audience: HelpOutlineAudience,
    from: number,
    to: number,
  ) => {
    const audienceOf = (key: string) => byId.get(key)?.audience;
    const run = arrayMove(
      now.filter((key) => audienceOf(key) === audience),
      from,
      to,
    );
    return AUDIENCES.flatMap((each) =>
      each === audience ? run : now.filter((key) => audienceOf(key) === each),
    );
  };

  const open = (from: 'bar' | 'phone') => {
    setFailed(undefined);
    setFocusBack(from);
    setReordering(true);
    announce('Reorder mode. Drag a guide by its handle, or focus it and press Space.');
  };
  const close = () => {
    setFailed(undefined);
    setReordering(false);
    announce('Reorder mode ended.');
  };
  // Escape leaves the mode as the Reorder button does, since on a phone the mode is a sheet; not mid-drag, where
  // Escape puts the guide back, nor while a save runs.
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!reordering || saving) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (modeRef.current?.querySelector('.is-dragging')) return;
      closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [reordering, saving]);

  // A move saves at once, in the whole order; a failure puts the order back as it was.
  const save = async (move: Move) => {
    setIds(move.to);
    setSaving(move.id);
    setFailed(undefined);
    try {
      await graphqlRequest(OrderHelpGuidesDocument, { ids: move.to });
      announce(`Moved ${move.title} to position ${move.place}.`);
      refresh();
    } catch {
      setIds(move.from);
      setFailed(move);
    } finally {
      setSaving(undefined);
    }
  };
  const onMove = (audience: HelpOutlineAudience, from: number, to: number) => {
    const run = rows.filter((row) => row.audience === audience);
    const move = run[from];
    if (!move) return;
    void save({
      id: move.id,
      title: move.title,
      place: to + 1,
      from: ids,
      to: moved(ids, audience, from, to),
    });
  };

  const reorderButton = (from: 'bar' | 'phone') => (
    <ReorderButton
      ref={from === 'bar' ? barButton : phoneButton}
      className={`help-outline__reorder-open help-outline__reorder-open--${from}`}
      pressed={reordering}
      onClick={() => (reordering ? close() : open(from))}
    />
  );
  const canReorder = order.length > 1;

  const choices = [
    ...byGroup(guides)
      .flatMap(({ entries }) => entries)
      .map((guide) => ({
        label: guide.title,
        href: guide.href,
        group: HELP_AUDIENCE_LABELS[guide.audience],
      })),
    ...others.map((other) => ({ label: other.label, href: other.href })),
  ];
  const current = [...guides, ...others].find((entry) => entry.current)?.href;

  return (
    <div className={reordering ? 'help-outline__side is-reordering' : 'help-outline__side'}>
      <nav className="help-outline__nav" aria-label="Help Outline">
        {others.length > 0 && (
          <>
            <div className="help-outline__heading">
              <p id={`${id}-others`} className="help-outline__group">
                Reference
              </p>
            </div>
            <ul aria-labelledby={`${id}-others`}>
              {others.map((other) => (
                <li key={other.label}>
                  <PendingLink href={other.href} aria-current={other.current ? 'page' : undefined}>
                    <span className="help-outline__label">{other.label}</span>
                  </PendingLink>
                </li>
              ))}
            </ul>
          </>
        )}
        {(guides.length > 0 || canReorder) && (
          <div className="help-outline__heading">
            <p className="help-outline__group">Guides</p>
            {canReorder && reorderButton('bar')}
          </div>
        )}
        {reordering ? (
          <div className="help-outline__mode" ref={modeRef}>
            {byGroup(rows).map(({ audience, entries }) => (
              <div key={audience} className="help-outline__run">
                <p
                  id={`${id}-mode-${audience}`}
                  className="help-outline__group help-outline__group--sub"
                >
                  {HELP_AUDIENCE_LABELS[audience]}
                </p>
                {/* One sortable per audience, so neither a pointer nor a key carries a guide out of its own. */}
                <HelpSortable
                  ids={entries.map((entry) => entry.id)}
                  names={entries.map((entry) => entry.title)}
                  onMove={(from, to) => onMove(audience, from, to)}
                >
                  <ul
                    className="help-outline__reorder"
                    aria-labelledby={`${id}-mode-${audience}`}
                    aria-busy={saving !== undefined || undefined}
                  >
                    {entries.map((entry, at) => (
                      <ReorderRow
                        key={entry.id}
                        entry={entry}
                        place={at + 1}
                        busy={saving === entry.id}
                        disabled={saving !== undefined}
                      />
                    ))}
                  </ul>
                </HelpSortable>
              </div>
            ))}
            {failed && (
              <Notice kind="error" block>
                Could not move {failed.title}. It is back where it was.{' '}
                <button type="button" className="btn btn--small" onClick={() => void save(failed)}>
                  Try Again
                </button>
              </Notice>
            )}
          </div>
        ) : (
          <>
            {byGroup(guides).map(({ audience, entries }) => (
              <div key={audience} className="help-outline__run">
                <p
                  id={`${id}-run-${audience}`}
                  className="help-outline__group help-outline__group--sub"
                >
                  {HELP_AUDIENCE_LABELS[audience]}
                </p>
                <ul aria-labelledby={`${id}-run-${audience}`}>
                  {entries.map((guide) => (
                    <li key={guide.id}>
                      <PendingLink
                        href={guide.href as Route}
                        aria-current={guide.current ? 'page' : undefined}
                        className={guide.shown ? undefined : 'is-hidden'}
                      >
                        <span className="help-outline__label">{guide.title}</span>
                        {(!guide.shown || guide.subPages > 0) && (
                          <>
                            {' '}
                            <span className="help-outline__marks">
                              {!guide.shown && <HiddenEye />}
                              {!guide.shown && guide.subPages > 0 && ' '}
                              {guide.subPages > 0 && (
                                <span className="badge help-outline__count">
                                  {`${guide.subPages} `}
                                  <span className="visually-hidden">
                                    {guide.subPages === 1 ? 'Sub Page' : 'Sub Pages'}
                                  </span>
                                </span>
                              )}
                            </span>
                          </>
                        )}
                      </PendingLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}
      </nav>
      {select && choices.length > 0 && (
        <div className="help-outline__select">
          <HelpGuideSelect choices={choices} current={current} />
          {canReorder && !reordering && reorderButton('phone')}
        </div>
      )}
    </div>
  );
};

export default HelpGuidesBar;
