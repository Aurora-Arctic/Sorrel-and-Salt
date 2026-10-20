'use client';

import type { Route } from 'next';
import { type ReactElement, useRef, useState } from 'react';
import { usePendingNavigation } from '../../lib/navigation';
import MenuButton from '../MenuButton';
import type { MenuButtonItem } from '../MenuButton/types';
import { ConfirmQuestion } from '../Modal';
import Notice from '../Notice';
import { CUPBOARD_MENU_LABEL } from './cupboard-writes';
import { UNSAVED_CHANGES_LOST } from './link-confirm';

// The coven edit dialog's foot (M8.17): Link to the Compendium and Delete
// Ingredient, set apart in Delete's place, in a More menu drawn as the
// Annotate dialog's is (annotate-more.tsx), opening upward so it stays inside
// the dialog; with one allowed, that one as a button of its own, so a menu
// never holds a single choice. Delete asks the form's own confirmation. Link
// asks in the same card, then replaces this dialog with the Link dialog at
// its address, as Make It Ours replaces the Annotate dialog, so its
// confirmation warns, in a warning notice, that the form's unsaved changes
// are lost while it holds some (the owner's calls, 2026-10-20).

interface EditMoreProps {
  /** The entry as the coven calls it, for Link's confirmation. */
  name: string;
  /** The Link dialog's address; left out where the role may not link. */
  linkHref?: Route;
  /** The form holds unsaved changes. */
  dirty: boolean;
  /** The form's unsaved-changes confirmation is asking: Link's steps aside. */
  discardAsking: boolean;
  /** Asks the form's Delete confirmation. */
  requestDelete: () => void;
}

export default function EditMore({
  name,
  linkHref,
  dirty,
  discardAsking,
  requestDelete,
}: EditMoreProps): ReactElement {
  const { navigate } = usePendingNavigation();
  const [asking, setAsking] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // The card hands the focus back to whatever held it as it opened, and a
  // menu item that chose goes with its menu, so the focus is put here first.
  const trigger = useRef<HTMLButtonElement>(null);
  const items: MenuButtonItem[] = [
    ...(linkHref
      ? [
          {
            key: 'link',
            label: 'Link to the Compendium',
            onSelect: () => {
              trigger.current?.focus();
              setAsking(true);
            },
          },
        ]
      : []),
    {
      key: 'delete',
      label: 'Delete Ingredient',
      destructive: true,
      onSelect: () => {
        trigger.current?.focus();
        requestDelete();
      },
    },
  ];
  return (
    <>
      {items.length > 1 ? (
        <MenuButton
          ref={trigger}
          label={CUPBOARD_MENU_LABEL}
          className="btn btn--quiet"
          items={items}
          opens="above"
          buttonType
        />
      ) : (
        <button
          ref={trigger}
          type="button"
          className="btn btn--destructive"
          onClick={requestDelete}
        >
          Delete Ingredient
        </button>
      )}
      {linkHref && (
        <ConfirmQuestion
          key="link"
          asked={asking && !discardAsking}
          question={<>Link {name} to the compendium?</>}
          details={
            <>
              <p>
                Next, choose the compendium entries it becomes. Nothing moves until you press Link.
              </p>
              {dirty && <Notice kind="warn">{UNSAVED_CHANGES_LOST}</Notice>}
            </>
          }
          tone="solid"
          confirmLabel="Continue"
          busyLabel="Opening"
          keepLabel="Cancel"
          busy={leaving}
          onConfirm={async () => {
            setLeaving(true);
            navigate(linkHref, { replace: true });
          }}
          onKeep={() => setAsking(false)}
        />
      )}
    </>
  );
}
