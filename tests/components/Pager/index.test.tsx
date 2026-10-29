import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ListFrame, { ListBody } from '@/components/ListFrame';
import Pager from '@/components/Pager';
import { Navigating } from '../../support/navigating';
import { stubLocationAssign } from '../../support/location';

// A soft end navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A paged list's Prev and Next (claude-docs/components/pager.md): an end with
// no page is disabled rather than hidden, and a lone page has no pager.

/** A pager where a list puts it, in its frame's body beneath the list. */
const paged = (pager: ReactElement) => (
  <ListFrame>
    <ListBody>
      <table aria-label="Fixtures" />
      {pager}
    </ListBody>
  </ListFrame>
);

const pages = () => screen.getByRole('navigation', { name: 'Pages' });
const end = (name: 'Prev' | 'Next') => within(pages()).getByRole('link', { name });

describe('Pager', () => {
  it('links both ends in the middle of a list', () => {
    render(paged(<Pager previousHref="/list?before=b" nextHref="/list?after=a" />));

    expect(end('Prev')).toHaveAttribute('href', '/list?before=b');
    expect(end('Next')).toHaveAttribute('href', '/list?after=a');
    expect(end('Prev')).not.toHaveAttribute('aria-disabled');
  });

  it.each([
    ['first', { nextHref: '/list?after=a' }, 'Prev', 'Next'],
    ['last', { previousHref: '/list?before=b' }, 'Next', 'Prev'],
  ] as const)(
    'disables the end with no page on the %s page, leaving it in place',
    (_page, props, off, on) => {
      render(paged(<Pager {...props} />));

      expect(end(off)).toHaveAttribute('aria-disabled', 'true');
      expect(end(off)).not.toHaveAttribute('href');
      expect(end(on)).toHaveAttribute('href');
      // Prev first and Next second whichever is off, so neither moves.
      expect(within(pages()).getAllByRole('link')).toEqual([end('Prev'), end('Next')]);
    },
  );

  it('says where the page stands between the two ends, when it is told', () => {
    render(
      paged(
        <Pager
          previousHref="/list?before=b"
          nextHref="/list?after=a"
          position={{ page: 2, pages: 3 }}
        />,
      ),
    );

    const [, middle] = within(pages()).getAllByRole('listitem');
    expect(middle).toHaveTextContent(/2\D+3/);
  });

  it('renders nothing for a list of one page', () => {
    render(paged(<Pager />));

    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
  });
});

// The owner's call: the end followed puts the tabs' skeleton, with
// its one status, in place of the list and the pager, until the page
// renders or the browser leaves, as a filter does.
describe('Pager, once an end is followed', () => {
  const assign = vi.fn();
  beforeEach(() => {
    router.push.mockReset();
  });
  afterEach(() => {
    assign.mockReset();
    vi.unstubAllGlobals();
  });

  const list = () => screen.queryByRole('table', { name: 'Fixtures' });

  it("pushes a soft end's page, a status in place of the list and the pager until it arrives", async () => {
    let arrive = () => {};
    const arrives = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    render(
      <Navigating push={router.push} arrives={arrives}>
        {paged(<Pager previousHref="/list?before=b" nextHref="/list?after=a" soft />)}
      </Navigating>,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(end('Next'));
    });

    expect(router.push).toHaveBeenCalledWith('/list?after=a', { scroll: false });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(list()).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();

    await act(async () => {
      arrive();
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(list()).toBeInTheDocument();
    expect(end('Next')).toBeInTheDocument();
  });

  it("leaves a soft end's modified click to the browser, the list staying", () => {
    render(paged(<Pager previousHref="/list?before=b" nextHref="/list?after=a" soft />));

    fireEvent.click(end('Next'), { ctrlKey: true });

    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(list()).toBeInTheDocument();
  });

  it("loads a plain end's page whole, a status in place of the list until the browser leaves, and the list back when Back restores the page from the cache", () => {
    stubLocationAssign(assign);
    render(paged(<Pager previousHref="/list?before=b" nextHref="/list?after=a" />));

    fireEvent.click(end('Next'));

    expect(assign).toHaveBeenCalledWith('/list?after=a');
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(list()).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(list()).toBeInTheDocument();
  });
});
