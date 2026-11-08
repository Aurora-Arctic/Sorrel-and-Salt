'use client';

import { arrayMove } from '@dnd-kit/sortable';
import type { Route } from 'next';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { graphql } from '@/lib/graphql-document';
import { graphqlRequest } from '../../lib/graphql-client';
import { HELP_AUDIENCE_LABELS } from '../../lib/help-audience';
import { PendingLink, usePendingNavigation } from '../../lib/navigation';
import BusyButton from '../BusyButton';
import { useAnnounce } from '../ClickFeedback/status-region';
import { DiscardQuestion, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import HiddenEye from './eye';
import HelpGuideSelect from './guide-select';
import { HelpSortable, useHelpSortableRow } from './sortable';
import type { HelpGuidesBarProps, HelpOutlineGuide, HelpOutlineOrderGuide } from './types';

// The keepers' Guides bar: at rest the guides the filter admits, under a heading for each run of one audience; in
// Reorder Mode every live guide, flat, to move by its grip, saved whole by Save Order
// (claude-docs/components/help-outline.md, "The Guides bar").

export const OrderHelpGuidesDocument = graphql(`
  mutation OrderHelpGuides($ids: [ID!]!) {
    orderHelpGuides(ids: $ids) {
      id
    }
  }
`);

const FAILED = 'Could not save the order. Your order is still here; try again or cancel.';

/** Consecutive guides of one audience: a guide moved out of its audience's run starts a run of its own. */
function runsOf(guides: readonly HelpOutlineGuide[]): HelpOutlineGuide[][] {
  const runs: HelpOutlineGuide[][] = [];
  for (const guide of guides) {
    const last = runs[runs.length - 1];
    if (last && last[0].audience === guide.audience) last.push(guide);
    else runs.push([guide]);
  }
  return runs;
}

const ReorderRow = ({
  entry,
  place,
  disabled,
}: {
  entry: HelpOutlineOrderGuide;
  place: number;
  disabled: boolean;
}): ReactElement => {
  const { setNodeRef, style, dragging, grip } = useHelpSortableRow(entry.id, entry.title, disabled);
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={dragging ? 'help-outline__reorder-row is-dragging' : 'help-outline__reorder-row'}
    >
      <span className="help-outline__place">{place}.</span>
      {grip}
      <span className={entry.shown ? 'help-outline__label' : 'help-outline__label is-hidden'}>
        {entry.title}
      </span>
      <span className="help-outline__marks">
        {!entry.shown && <HiddenEye />}
        <span className="badge badge--muted">{HELP_AUDIENCE_LABELS[entry.audience]}</span>
      </span>
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
  const orderKey = order.map((entry) => entry.id).join(' ');

  // The order last saved: the page's until a save, then the saved one until the page's catches up.
  const [base, setBase] = useState(() => order.map((entry) => entry.id));
  const [seenKey, setSeenKey] = useState(orderKey);
  if (seenKey !== orderKey) {
    setSeenKey(orderKey);
    setBase(order.map((entry) => entry.id));
  }
  const [ids, setIds] = useState<string[]>(base);
  const [reordering, setReordering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const dirty = reordering && ids.join(' ') !== base.join(' ');
  const guard = useDiscardGuard(dirty);

  const listRef = useRef<HTMLUListElement>(null);
  const barButton = useRef<HTMLButtonElement>(null);
  const phoneButton = useRef<HTMLButtonElement>(null);
  const [focusBack, setFocusBack] = useState<'bar' | 'phone' | null>(null);

  useEffect(() => {
    if (reordering) listRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    else if (focusBack) (focusBack === 'phone' ? phoneButton : barButton).current?.focus();
  }, [reordering, focusBack]);

  const byId = new Map(order.map((entry) => [entry.id, entry]));
  const rows = ids.flatMap((key) => byId.get(key) ?? []);

  const open = (from: 'bar' | 'phone') => {
    setIds(base);
    setFailed(false);
    setFocusBack(from);
    setReordering(true);
    announce('Reorder mode. Drag a guide by its handle, or focus it and press Space.');
  };
  const cancel = () => {
    setIds(base);
    setFailed(false);
    setReordering(false);
    announce('Reordering cancelled. The order is as it was.');
  };
  const save = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await graphqlRequest(OrderHelpGuidesDocument, { ids });
      setBase(ids);
      setReordering(false);
      announce('Order saved.');
      refresh();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const reorderButton = (from: 'bar' | 'phone') => (
    <button
      type="button"
      ref={from === 'bar' ? barButton : phoneButton}
      className={`btn btn--quiet help-outline__reorder-open help-outline__reorder-open--${from}`}
      onClick={() => open(from)}
    >
      Reorder
    </button>
  );
  const canReorder = order.length > 1;

  const choices = [
    ...guides.map((guide) => ({
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
        {reordering ? (
          <div className="help-outline__mode">
            <div className="help-outline__heading">
              <p className="help-outline__group">Guides</p>
            </div>
            <HelpSortable
              ids={ids}
              names={rows.map((entry) => entry.title)}
              onMove={(from, to) => setIds((now) => arrayMove(now, from, to))}
            >
              <ul
                ref={listRef}
                className="help-outline__reorder"
                aria-label="Guides"
                aria-busy={saving || undefined}
              >
                {rows.map((entry, at) => (
                  <ReorderRow key={entry.id} entry={entry} place={at + 1} disabled={saving} />
                ))}
              </ul>
            </HelpSortable>
            {dirty && !failed && (
              <p className="help-outline__unsaved">The order is not saved yet.</p>
            )}
            {failed && (
              <Notice kind="error" block>
                {FAILED}{' '}
                <button type="button" className="btn btn--small" onClick={() => void save()}>
                  Try Again
                </button>
              </Notice>
            )}
            <div className="help-outline__mode-actions">
              <BusyButton
                className="btn btn--solid"
                busy={saving}
                busyLabel="Saving Order"
                disabled={!dirty || saving}
                onClick={() => void save()}
              >
                Save Order
              </BusyButton>
              <button type="button" className="btn" disabled={saving} onClick={cancel}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {(guides.length > 0 || canReorder) && (
              <div className="help-outline__heading">
                <p className="help-outline__group">Guides</p>
                {canReorder && reorderButton('bar')}
              </div>
            )}
            {runsOf(guides).map((run, at) => (
              <div key={run[0].id} className="help-outline__run">
                <p id={`${id}-run-${at}`} className="help-outline__group help-outline__group--sub">
                  {HELP_AUDIENCE_LABELS[run[0].audience]}
                </p>
                <ul aria-labelledby={`${id}-run-${at}`}>
                  {run.map((guide) => (
                    <li key={guide.id}>
                      <PendingLink
                        href={guide.href as Route}
                        aria-current={guide.current ? 'page' : undefined}
                        className={guide.shown ? undefined : 'is-hidden'}
                      >
                        <span className="help-outline__label">{guide.title}</span>
                        {!guide.shown && (
                          <>
                            {' '}
                            <span className="help-outline__marks">
                              <HiddenEye />
                            </span>
                          </>
                        )}
                      </PendingLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {others.length > 0 && (
              <ul className="help-outline__others">
                {others.map((other) => (
                  <li key={other.label}>
                    <PendingLink
                      href={other.href}
                      aria-current={other.current ? 'page' : undefined}
                    >
                      <span className="help-outline__label">{other.label}</span>
                    </PendingLink>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </nav>
      {select && choices.length > 0 && (
        <div className="help-outline__select">
          <HelpGuideSelect choices={choices} current={current} />
          {canReorder && !reordering && reorderButton('phone')}
        </div>
      )}
      {guard.asking && <DiscardQuestion guard={guard} />}
    </div>
  );
};

export default HelpGuidesBar;
