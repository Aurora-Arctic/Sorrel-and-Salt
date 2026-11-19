'use client';

import { usePathname } from 'next/navigation';
import { type ReactElement, useRef } from 'react';
import { useHydrated } from '../../lib/hydrated';
import { useMeasuredFit } from '../../lib/use-measured-fit';
import AccountMenu from '../AccountMenu';
import { firstFitting, navWidth, pixels, watched } from './bar-room';
import { PlusIcon } from '../IconTip/icons';
import ThemeToggle from '../ThemeToggle';
import { ADD_INGREDIENT_TITLE } from './add-href';
import AddIngredientButton, { addsIngredient } from './add-ingredient-button';
import NewSpellElsewhere from './new-spell-elsewhere';
import type { AddIngredientForm, AddIngredientHandle, ShellEndProps } from './types';

// The bar's end block, measured so the bar stays one line at every width and text size. Each step gives up a
// little more: the account's name goes first, then Add Ingredient's label for a plus, then Add Ingredient
// folds into the account panel as its first item, and last the bar's site links move into the panel too. The account button and the theme disc never fold
// (claude-docs/components/app-shell.md, "The end block").

const STEPS: readonly { form: AddIngredientForm; compact: boolean; links: boolean }[] = [
  { form: 'label', compact: false, links: false },
  { form: 'label', compact: true, links: false },
  { form: 'plus', compact: true, links: false },
  { form: 'folded', compact: true, links: false },
  { form: 'folded', compact: true, links: true },
];

type Natural = {
  // The width each step needs: the block's, and the site nav's beside it while the nav is in the bar.
  widths: number[];
  // The disc's own width, kept to tell a change of text size from a change of the window.
  disc: number;
  // Add Ingredient was in the block when measured: it can arrive after, once its boundary resolves.
  group: boolean;
};

const shownChildren = (end: HTMLElement): HTMLElement[] =>
  Array.from(end.children).filter(
    // A save's line gives up its width, so it never decides the form.
    (child): child is HTMLElement =>
      child instanceof HTMLElement && !child.matches('.app-shell__saved') && child.offsetWidth > 0,
  );

const measureEnd = (end: HTMLElement): Natural | null => {
  const disc = end.querySelector<HTMLElement>('.app-shell__theme');
  const children = shownChildren(end);
  // No layout (happy-dom): nothing to fit, so the label stays.
  if (!disc || disc.offsetWidth === 0) return null;
  const gap = pixels(getComputedStyle(end).columnGap);
  const full =
    children.reduce((sum, child) => sum + child.offsetWidth, 0) + gap * (children.length - 1);
  // The avatar alone is a square as tall as the account button (AccountMenu's `--compact`).
  const account = end.querySelector<HTMLElement>(':scope > .account-menu');
  const named = account
    ? account.offsetWidth - Math.min(account.offsetWidth, account.offsetHeight)
    : 0;
  const compact = full - named;
  const group = end.querySelector<HTMLElement>(':scope > .app-shell__add-group');
  const main = group?.querySelector<HTMLElement>('.app-shell__add');
  const nav = navWidth(end);
  if (!group || !main) {
    return {
      widths: [full + nav, compact + nav, compact + nav, compact + nav, compact],
      disc: disc.offsetWidth,
      group: false,
    };
  }
  // The plus is a square as tall as the label's button; its border can round up a pixel.
  const plus = compact - main.offsetWidth + main.offsetHeight + 1;
  return {
    widths: [
      full + nav,
      compact + nav,
      plus + nav,
      compact - group.offsetWidth - gap + nav,
      compact - group.offsetWidth - gap,
    ],
    disc: disc.offsetWidth,
    group: true,
  };
};

const chooseForm = ({ widths }: Natural, end: HTMLElement): number => firstFitting(widths, end);

const textSizeChanged = ({ disc, group }: Natural, end: HTMLElement): boolean => {
  const now = end.querySelector<HTMLElement>('.app-shell__theme');
  if (now !== null && now.offsetWidth !== disc) return true;
  return !group && end.querySelector(':scope > .app-shell__add-group') !== null;
};

const ShellEnd = ({ viewer, workspaces, links }: ShellEndProps): ReactElement => {
  const pathname = usePathname();
  const end = useRef<HTMLDivElement>(null);
  const add = useRef<AddIngredientHandle>(null);
  // The server's render, and a browser without script, is never measured: the stylesheet clips the block instead.
  const hydrated = useHydrated();
  const fit = useMeasuredFit({
    ref: end,
    enabled: hydrated,
    measure: measureEnd,
    choose: chooseForm,
    stale: textSizeChanged,
    watch: watched,
    fallback: 0,
    // A navigation changes the site links' weight, and so the room.
    resetKey: pathname,
  });
  // While measuring, everything shows in full, so its width is read.
  const { form, compact, links: linksInPanel } = STEPS[fit ?? 0];
  const folded = form === 'folded' && addsIngredient(viewer, workspaces);

  return (
    <div
      ref={end}
      className="app-shell__end"
      data-fit={fit ?? undefined}
      data-measuring={hydrated && fit === null ? '' : undefined}
    >
      {/* The shell's one global action; its target follows the area (add-ingredient-button.tsx). */}
      <AddIngredientButton viewer={viewer} workspaces={workspaces} form={form} handle={add} />
      <NewSpellElsewhere />
      <AccountMenu
        name={viewer.name}
        verified={viewer.verified}
        links={links}
        pendingInvitations={viewer.pendingInvitations}
        assignedSupport={viewer.assignedSupport}
        waitingSupport={viewer.waitingSupport}
        compact={compact}
        withLinks={linksInPanel}
        lead={
          folded
            ? {
                label: ADD_INGREDIENT_TITLE,
                icon: <PlusIcon />,
                onSelect: () => add.current?.add(),
              }
            : undefined
        }
      />
      {/* In the bar at every width. */}
      <span className="app-shell__theme">
        <ThemeToggle variant="inline" />
      </span>
    </div>
  );
};

export default ShellEnd;
