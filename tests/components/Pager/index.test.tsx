import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Pager from '@/components/Pager';
import { Navigating } from '../../support/navigating';

// A soft end navigates through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// A paged list's Prev and Next (claude-docs/components/pager.md): an end with
// no page is disabled rather than hidden, and a lone page has no pager.

const pages = () => screen.getByRole('navigation', { name: 'Pages' });
const end = (name: 'Prev' | 'Next') => within(pages()).getByRole('link', { name });

describe('Pager', () => {
  it('links both ends in the middle of a list', () => {
    render(<Pager previousHref="/list?before=b" nextHref="/list?after=a" />);

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
      render(<Pager {...props} />);

      expect(end(off)).toHaveAttribute('aria-disabled', 'true');
      expect(end(off)).not.toHaveAttribute('href');
      expect(end(on)).toHaveAttribute('href');
      // Prev first and Next second whichever is off, so neither moves.
      expect(
        within(pages())
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual(['‹Prev', 'Next›']);
    },
  );

  it('says where the page stands between the two ends, when it is told', () => {
    render(
      <Pager
        previousHref="/list?before=b"
        nextHref="/list?after=a"
        position={{ page: 2, pages: 3 }}
      />,
    );

    expect(within(pages()).getByText('Page 2 of 3')).toBeInTheDocument();
    expect(
      within(pages())
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['‹Prev', 'Page 2 of 3', 'Next›']);
  });

  it('renders nothing for a list of one page', () => {
    const { container } = render(<Pager />);

    expect(container).toBeEmptyDOMElement();
  });

  it('names each end by its label alone, the chevrons hidden', () => {
    render(<Pager previousHref="/list?before=b" nextHref="/list?after=a" soft />);

    expect(end('Prev')).toHaveAccessibleName('Prev');
    expect(end('Next')).toHaveAccessibleName('Next');
  });
});

// The end clicked shows its page is on the way: the spinner in its chevron's
// place, the same size, and `aria-busy`. The other end is left as it was.
describe('Pager, once an end is followed', () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  it("pushes a soft end's page, the spinner in its chevron's place until it arrives", async () => {
    render(
      <Navigating push={router.push}>
        <Pager previousHref="/list?before=b" nextHref="/list?after=a" soft />
      </Navigating>,
    );

    await act(async () => {
      fireEvent.click(end('Next'));
    });

    expect(router.push).toHaveBeenCalledWith('/list?after=a');
    expect(end('Next')).toHaveAttribute('aria-busy', 'true');
    expect(end('Next')).toHaveTextContent(/^Next$/);
    expect(end('Prev')).not.toHaveAttribute('aria-busy');
    expect(end('Prev')).toHaveTextContent(/^‹Prev$/);
  });

  it("leaves a soft end's modified click to the browser, a new tab showing nothing here", () => {
    render(<Pager previousHref="/list?before=b" nextHref="/list?after=a" soft />);

    fireEvent.click(end('Next'), { ctrlKey: true });

    expect(router.push).not.toHaveBeenCalled();
    expect(end('Next')).not.toHaveAttribute('aria-busy');
  });

  it('marks a plain end busy while the browser loads its page', () => {
    // A fragment, which jsdom follows: it implements no other navigation.
    render(<Pager previousHref="#before" nextHref="#after" />);

    fireEvent.click(end('Prev'));

    expect(end('Prev')).toHaveAttribute('aria-busy', 'true');
    expect(end('Prev')).toHaveTextContent(/^Prev$/);
    expect(end('Next')).not.toHaveAttribute('aria-busy');
  });

  it('clears a plain end when Back restores the page from the cache', () => {
    render(<Pager previousHref="#before" nextHref="#after" />);
    fireEvent.click(end('Next'));
    expect(end('Next')).toHaveAttribute('aria-busy', 'true');

    act(() => {
      window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    });

    expect(end('Next')).not.toHaveAttribute('aria-busy');
    expect(end('Next')).toHaveTextContent(/^Next›$/);
  });
});
