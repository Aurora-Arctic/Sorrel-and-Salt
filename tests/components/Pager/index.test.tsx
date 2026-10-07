import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Pager from '@/components/Pager';

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
