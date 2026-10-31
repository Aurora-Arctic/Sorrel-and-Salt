'use client';

import { type KeyboardEvent, type ReactElement, type ReactNode, useId, useRef } from 'react';
import { PendingLink, usePendingNavigation } from '../../lib/navigation';
import { SUPPORT_VIEWS, type SupportView } from '../../lib/support-path';
import { supportHref } from './href';
import type { SupportRequestsFilter } from './types';

// The six views of the queue as the tab pattern: a tab list whose selected tab is the only one in the tab order, the arrow
// keys, Home and End moving between tabs, and the list beneath as the tab panel. Each tab is a link to its own address
// (`?view=`), so a press navigates and the list is read on the server.

const SupportViews = ({
  filter,
  counts,
  children,
}: {
  filter: SupportRequestsFilter;
  counts?: Record<SupportView, number>;
  children: ReactNode;
}): ReactElement => {
  const id = useId();
  const { navigate } = usePendingNavigation();
  const tabs = useRef<(HTMLAnchorElement | null)[]>([]);
  const at = SUPPORT_VIEWS.findIndex(({ value }) => value === filter.view);
  const tabId = (value: string): string => `${id}-tab-${value}`;

  function move(event: KeyboardEvent, from: number) {
    const last = SUPPORT_VIEWS.length - 1;
    const to =
      event.key === 'ArrowRight'
        ? (from + 1) % SUPPORT_VIEWS.length
        : event.key === 'ArrowLeft'
          ? (from + last) % SUPPORT_VIEWS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : undefined;
    if (to === undefined) return;
    event.preventDefault();
    tabs.current[to]?.focus();
    navigate(supportHref({ ...filter, view: SUPPORT_VIEWS[to].value }));
  }

  return (
    <>
      <div role="tablist" aria-label="Support Views" className="support-views">
        {SUPPORT_VIEWS.map(({ value, label }, index) => (
          <PendingLink
            key={value}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            id={tabId(value)}
            role="tab"
            aria-selected={index === at}
            aria-controls={`${id}-panel`}
            tabIndex={index === at ? 0 : -1}
            href={supportHref({ ...filter, view: value })}
            className="support-views__tab"
            onKeyDown={(event) => move(event, index)}
          >
            {label}
            {counts && (
              <>
                {' '}
                <span className="support-views__count">({counts[value]})</span>
              </>
            )}
          </PendingLink>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={tabId(filter.view)}>
        {children}
      </div>
    </>
  );
};

export default SupportViews;
