import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { router } from '../../support/next-navigation';
import { Navigating } from '../../support/navigating';
import { isBefore } from '../../support/interact';

// The address the help layout is showing, set by each test before it renders.
const here = vi.hoisted(() => ({ pathname: '/help' }));
vi.mock('next/navigation', async () => ({
  ...(await import('../../support/next-navigation')),
  usePathname: () => here.pathname,
  useSearchParams: () => new URLSearchParams(''),
}));
// The help pages' own skeletons, so a test sees the headings a reader would while a page is on its way.
vi.mock('@/app/skeletons', async () => {
  const { HelpSkeleton } = await import('@/app/(public)/help/skeleton');
  const { HelpGlossaryPageSkeleton } = await import('@/app/(public)/help/glossary/skeleton');
  const { HelpSearchPageSkeleton } = await import('@/app/(public)/help/search/skeleton');
  const { HelpArticlePageSkeleton } = await import('@/app/(public)/help/[slug]/skeleton');
  const { HelpSubPageSkeleton } = await import('@/app/(public)/help/[slug]/[child]/skeleton');
  return {
    skeletons: {
      '/help': { host: 'help', Skeleton: HelpSkeleton },
      '/help/glossary': { host: 'help', Skeleton: HelpGlossaryPageSkeleton },
      '/help/search': { host: 'help', Skeleton: HelpSearchPageSkeleton },
      '/help/[slug]': { host: 'help', Skeleton: HelpArticlePageSkeleton },
      '/help/[slug]/[child]': { host: 'help', Skeleton: HelpSubPageSkeleton },
      '/compendium': { host: 'main', Skeleton: () => null },
    },
  };
});

const { default: HelpFront } = await import('@/components/HelpFront');
const { default: HelpArticleView } = await import('@/components/HelpArticleView');
const { default: HelpGlossary } = await import('@/components/HelpGlossary');
const { default: HelpIndex } = await import('@/components/HelpIndex');
const { usePendingNavigation } = await import('@/lib/navigation');
const { skeletonFor } = await import('@/lib/navigation/skeleton-for');

// Each public help page has one level-one heading, naming what the page is about: Help on the index and the search
// page, the article's title on an article, Glossary on the glossary. On an article and the glossary the help header
// still shows the word Help above the title, as a label rather than a heading. The header is mounted once by the help
// layout and stays up between pages, so it has to be right on arrival and while a move is on its way.

const ARTICLE = '/help/testwort-guide';
const SUB_PAGE = '/help/testwort-guide/testwort-step';

/** A control that starts a navigation to `href`, as a link inside the page does. */
function Go({ href }: { href: string }) {
  const { navigate } = usePendingNavigation();
  return (
    <button type="button" onClick={() => navigate(href)}>
      Go
    </button>
  );
}

let arrive = () => {};
const arrival = () =>
  new Promise<void>((resolve) => {
    arrive = resolve;
  });

function renderAt(pathname: string, page: ReactNode, goTo?: string) {
  here.pathname = pathname;
  return render(
    <Navigating push={router.push} arrives={arrival()}>
      <HelpFront>
        {goTo && <Go href={goTo} />}
        {page}
      </HelpFront>
    </Navigating>,
  );
}

const article = (title: string) => (
  <HelpArticleView title={title} body="A fixture body." subpages={[]} />
);
const levelOne = () => screen.queryAllByRole('heading', { level: 1 });
const helpHeadings = () => screen.queryAllByRole('heading', { name: 'Help' });

beforeEach(() => {
  for (const call of Object.values(router)) call.mockReset();
});

afterEach(async () => {
  await act(async () => arrive());
});

describe('the help pages’ main heading, on arrival', () => {
  it('is Help on the help index, its one level-one heading', () => {
    renderAt('/help', <HelpIndex faq={[]} articles={[]} />);

    expect(levelOne().map((heading) => heading.textContent)).toEqual(['Help']);
  });

  it('is Help on the search page, its one level-one heading', () => {
    renderAt(
      '/help/search',
      <ul aria-label="Results">
        <li>Testwort</li>
      </ul>,
    );

    expect(levelOne().map((heading) => heading.textContent)).toEqual(['Help']);
  });

  it.each([
    [ARTICLE, 'Testwort Guide'],
    [SUB_PAGE, 'Testwort Step'],
  ])('is the article’s title on %s, its one level-one heading', (pathname, title) => {
    renderAt(pathname, article(title));

    expect(levelOne().map((heading) => heading.textContent)).toEqual([title]);
    expect(helpHeadings()).toEqual([]);
  });

  it('is Glossary on the glossary, its one level-one heading', () => {
    renderAt('/help/glossary', <HelpGlossary terms={[]} />);

    expect(levelOne().map((heading) => heading.textContent)).toEqual(['Glossary']);
    expect(helpHeadings()).toEqual([]);
  });

  it.each([
    [ARTICLE, article('Testwort Guide'), 'Testwort Guide'],
    ['/help/glossary', <HelpGlossary key="glossary" terms={[]} />, 'Glossary'],
  ])('shows Help above the title on %s, as a label and not a heading', (pathname, page, title) => {
    renderAt(pathname, page);

    const label = screen.getByText('Help', { exact: true });
    expect(isBefore(label, screen.getByRole('heading', { level: 1, name: title }))).toBeTruthy();
    expect(helpHeadings()).toEqual([]);
  });
});

describe('the help pages’ main heading, while a move within them is on its way', () => {
  const press = () =>
    act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    });

  it('drops Help as a heading over an article’s skeleton, leaving the skeleton’s title the one level-one heading', async () => {
    renderAt('/help', <HelpIndex faq={[]} articles={[]} />, ARTICLE);
    // Precondition: the index stood under Help as its heading.
    expect(levelOne().map((heading) => heading.textContent)).toEqual(['Help']);

    await press();

    // Why the headings changed: the article's skeleton is up.
    expect(router.push).toHaveBeenCalledWith(ARTICLE);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(levelOne()).toHaveLength(1);
    expect(helpHeadings()).toEqual([]);
    expect(screen.getByText('Help', { exact: true })).toBeInTheDocument();
  });

  it('draws Help as the one level-one heading over the index’s skeleton, on the way back from an article', async () => {
    renderAt(ARTICLE, article('Testwort Guide'), '/help');
    // Precondition: the article stood under its own title as its heading.
    expect(levelOne().map((heading) => heading.textContent)).toEqual(['Testwort Guide']);

    await press();

    expect(router.push).toHaveBeenCalledWith('/help');
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(levelOne().map((heading) => heading.textContent)).toEqual(['Help']);
  });

  it('draws Glossary as the one level-one heading over the glossary’s skeleton', async () => {
    renderAt('/help', <HelpIndex faq={[]} articles={[]} />, '/help/glossary');

    await press();

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(levelOne().map((heading) => heading.textContent)).toEqual(['Glossary']);
    expect(helpHeadings()).toEqual([]);
  });
});

describe('a help page’s skeleton drawn from outside the help pages', () => {
  // A move in from the compendium draws the whole help header with the page's skeleton beneath it.
  const drawn = (href: string) => {
    const Shown = skeletonFor('main', href, '/compendium');
    // Precondition: the shell's body draws this page's skeleton in its help frame.
    expect(Shown).not.toBeNull();
    const Skeleton = Shown!;
    return render(
      <Navigating push={router.push} arrives={arrival()}>
        <Skeleton />
      </Navigating>,
    );
  };

  it.each(['/help', '/help/search?q=stock'])(
    'has Help as its one level-one heading for %s',
    (href) => {
      drawn(href);

      expect(levelOne().map((heading) => heading.textContent)).toEqual(['Help']);
    },
  );

  it.each([ARTICLE, SUB_PAGE])(
    'has the title still to come as its one level-one heading for %s, with Help a label above it',
    (href) => {
      drawn(href);

      expect(levelOne()).toHaveLength(1);
      expect(helpHeadings()).toEqual([]);
      expect(isBefore(screen.getByText('Help', { exact: true }), levelOne()[0]!)).toBeTruthy();
    },
  );

  it('has Glossary as its one level-one heading for the glossary, with Help a label above it', () => {
    drawn('/help/glossary');

    expect(levelOne().map((heading) => heading.textContent)).toEqual(['Glossary']);
    expect(helpHeadings()).toEqual([]);
    expect(screen.getByText('Help', { exact: true })).toBeInTheDocument();
  });
});
