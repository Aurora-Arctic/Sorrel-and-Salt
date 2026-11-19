'use client';

import { usePathname } from 'next/navigation';
import { type ReactElement, Suspense, useRef } from 'react';
import { pixels } from '../../lib/css-pixels';
import { useHydrated } from '../../lib/hydrated';
import { signInPath } from '../../lib/sign-in';
import { useMeasuredFit } from '../../lib/use-measured-fit';
import { firstFitting, navWidth, useFocusKeptThroughFold, watched } from '../AppShell/bar-room';
import { DotsIcon } from '../IconTip/icons';
import MenuButton from '../MenuButton';
import type { MenuButtonItem } from '../MenuButton/types';
import ThemeToggle from '../ThemeToggle';
import { SignInLink, SignInLinkWithQuery, useSignInReturn } from './sign-in-link';
import type { PublicEndProps } from './types';

// The public bar's end block, measured so the bar stays one line at every width and text size, as the shell's is.
// The site links move first into a menu beside Sign In, then Sign In joins them: beside the brand, the room left at
// the narrowest window and largest text holds two squares, and Sign In's label alone is wider than one. The theme
// disc never folds (claude-docs/components/public-frame.md, "The end block").

const MENU = 1;
const SIGN_IN_IN_MENU = 2;

type Natural = {
  // The width each step needs: everything in the bar, the links in the menu, then Sign In in it too.
  widths: number[];
  // The disc's own width, kept to tell a change of text size from a change of the window.
  disc: number;
};

const measureEnd = (end: HTMLElement): Natural | null => {
  const disc = end.querySelector<HTMLElement>(':scope > .app-shell__theme');
  const menu = end.querySelector<HTMLElement>(':scope > .menu-button');
  // No layout (happy-dom): nothing to fit, so everything stays in the bar.
  if (!disc || !menu || disc.offsetWidth === 0) return null;
  const children = Array.from(end.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.offsetWidth > 0,
  );
  const gap = pixels(getComputedStyle(end).columnGap);
  const full =
    children.reduce((sum, child) => sum + child.offsetWidth, 0) + gap * (children.length - 1);
  return {
    widths: [
      full - menu.offsetWidth - gap + navWidth(end),
      full,
      menu.offsetWidth + gap + disc.offsetWidth,
    ],
    disc: disc.offsetWidth,
  };
};

const chooseStep = ({ widths }: Natural, end: HTMLElement): number => firstFitting(widths, end);

const textSizeChanged = ({ disc }: Natural, end: HTMLElement): boolean => {
  const now = end.querySelector<HTMLElement>(':scope > .app-shell__theme');
  return now !== null && now.offsetWidth !== disc;
};

type SiteMenuProps = Pick<PublicEndProps, 'links'> & { withSignIn: boolean };

const linkItems = (links: PublicEndProps['links']): MenuButtonItem[] =>
  links.map(({ label, href }) => ({ key: href, label, href }));

const MenuOf = ({ items }: { items: readonly MenuButtonItem[] }): ReactElement => (
  <MenuButton label="Menu" className="public-frame__menu" icon={<DotsIcon />} items={items} />
);

// Reads the query string for Sign In's return path, so it sits in its own Suspense; the menu is drawn only once
// the page has hydrated, where the query is already known.
const SiteMenu = ({ links, withSignIn }: SiteMenuProps): ReactElement => {
  const next = useSignInReturn();
  return (
    <MenuOf
      items={[
        ...linkItems(links),
        ...(withSignIn && next !== null
          ? [{ key: 'sign-in', label: 'Sign In', href: signInPath(next) }]
          : []),
      ]}
    />
  );
};

const PublicEnd = ({ configured, links }: PublicEndProps): ReactElement => {
  const pathname = usePathname();
  const end = useRef<HTMLDivElement>(null);
  // The server's render, and a browser without script, is never measured: the stylesheet clips the block instead.
  const hydrated = useHydrated();
  const fit = useMeasuredFit({
    ref: end,
    enabled: hydrated,
    measure: measureEnd,
    choose: chooseStep,
    stale: textSizeChanged,
    watch: watched,
    fallback: 0,
    // A navigation changes the site links' weight, and so the room.
    resetKey: pathname,
  });
  useFocusKeptThroughFold(end, fit, 'button.public-frame__menu');
  const measuring = hydrated && fit === null;
  const step = fit ?? 0;
  // While measuring, the menu shows beside everything else, so its width is read.
  const withMenu = measuring || step >= MENU;
  const signInInBar = measuring || step < SIGN_IN_IN_MENU;

  return (
    <div
      ref={end}
      className="public-frame__end"
      data-fit={fit ?? undefined}
      data-measuring={measuring ? '' : undefined}
    >
      {withMenu && (
        <Suspense fallback={<MenuOf items={linkItems(links)} />}>
          <SiteMenu links={links} withSignIn={!signInInBar} />
        </Suspense>
      )}
      {signInInBar && (
        <Suspense fallback={<SignInLink />}>
          <SignInLinkWithQuery configured={configured} />
        </Suspense>
      )}
      {/* The shell's wrapper (AppShell/index.scss), in the bar at every width. */}
      <span className="app-shell__theme">
        <ThemeToggle variant="inline" />
      </span>
    </div>
  );
};

export default PublicEnd;
