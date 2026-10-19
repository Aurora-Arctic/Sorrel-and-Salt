import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Skeleton from '@/components/Skeleton';
import type { SkeletonShape } from '@/components/Skeleton/types';

const SHAPES: SkeletonShape[] = ['table', 'cards', 'form', 'page', 'contents', 'line'];

// A skeleton is announced once, as a status, whatever it draws; the shapes
// are for the eye and add nothing to the accessibility tree.
describe('Skeleton', () => {
  it.each(SHAPES)('the %s shape renders exactly one status', (shape) => {
    render(<Skeleton shape={shape} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('draws a filter row only when asked, for a list', () => {
    const { container, rerender } = render(<Skeleton shape="table" />);
    const before = container.querySelectorAll('span').length;
    rerender(<Skeleton shape="table" filter />);
    expect(container.querySelectorAll('span').length).toBeGreaterThan(before);
  });
});

// A page's heading row, with its action where it has one, so a list's wait
// looks like the page that arrives (M12.33).
describe('Skeleton heading row', () => {
  const bars = (container: HTMLElement): number =>
    container.querySelectorAll('.skeleton__header > span').length;

  it.each(['table', 'cards'] as const)(
    'draws a heading on the %s shape only when asked',
    (shape) => {
      const { container, rerender } = render(<Skeleton shape={shape} />);
      expect(container.querySelector('.skeleton__header')).toBeNull();
      rerender(<Skeleton shape={shape} title />);
      expect(bars(container)).toBe(1);
    },
  );

  it('adds an action beside the heading only when asked', () => {
    const { container, rerender } = render(<Skeleton shape="table" title />);
    expect(bars(container)).toBe(1);
    rerender(<Skeleton shape="table" title action />);
    expect(bars(container)).toBe(2);
  });

  it('draws no action without a heading', () => {
    const { container } = render(<Skeleton shape="table" action />);
    expect(container.querySelector('.skeleton__header')).toBeNull();
  });

  it('puts the heading above the filter and the list', () => {
    const { container } = render(<Skeleton shape="table" title filter />);
    const order = [
      ...container.querySelectorAll('.skeleton__header, .skeleton__filter, .skeleton__table'),
    ];
    expect(order.map((node) => node.className)).toEqual([
      'page-header skeleton__header',
      'skeleton__filter',
      'skeleton__table',
    ]);
  });

  it('still announces once', () => {
    render(<Skeleton shape="table" title action filter />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });
});

// The tab row and the side menu are drawn where the page that arrives has them.
describe('Skeleton tabs and menu', () => {
  it('draws the tab track between the heading and the action, only when asked', () => {
    const { container, rerender } = render(<Skeleton shape="table" title action />);
    expect(container.querySelector('.skeleton__tabs')).toBeNull();
    rerender(<Skeleton shape="table" title action tabs />);
    const kids = [...container.querySelectorAll('.skeleton__header > span')];
    expect(kids.map((node) => node.className.split(' ')[0])).toEqual([
      'skeleton__title',
      'skeleton__tabs',
      'skeleton__action',
    ]);
  });

  it('draws no tabs without a heading', () => {
    const { container } = render(<Skeleton shape="table" tabs />);
    expect(container.querySelector('.skeleton__tabs')).toBeNull();
  });

  it('draws a menu column beside the page shape only when asked', () => {
    const { container, rerender } = render(<Skeleton shape="page" />);
    expect(container.querySelector('.skeleton__menu')).toBeNull();
    rerender(<Skeleton shape="page" menu />);
    expect(container.querySelector('.page-with-nav .skeleton__menu')).not.toBeNull();
  });

  it('keeps the menu out of other shapes and still announces once', () => {
    const { container } = render(<Skeleton shape="table" menu />);
    expect(container.querySelector('.skeleton__menu')).toBeNull();
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  // The menu sits where the real page puts it: the page's own
  // `.page-with-nav` grid, its children the head, the menu, then the
  // sections, so the menu is in the same column and rows as the page that
  // arrives.
  it("lays the page out with the page's own grid classes", () => {
    const { container } = render(<Skeleton shape="page" menu />);
    const grid = container.querySelector('.page-with-nav');
    expect(grid).not.toBeNull();
    const kids = [...(grid?.children ?? [])];
    expect(kids[0]?.classList.contains('skeleton__intro')).toBe(true);
    expect(kids[1]?.classList.contains('page-nav')).toBe(true);
    expect(kids[1]?.classList.contains('skeleton__menu')).toBe(true);
    expect(kids.slice(2).every((node) => node.classList.contains('page-frame__section'))).toBe(
      true,
    );
  });

  // An ingredient's entry fills the wide column beside its menu
  // (`.ingredient-entry--with-nav`), not the narrow column of the coven
  // home's `.page-with-nav`: the wait uses the entry's own grid.
  it("lays an entry out with the entry's own grid class, not the narrow page's", () => {
    const { container } = render(<Skeleton shape="page" menu entry />);
    const grid = container.querySelector('.ingredient-entry--with-nav');
    expect(grid).not.toBeNull();
    expect(container.querySelector('.page-with-nav')).toBeNull();
    const kids = [...(grid?.children ?? [])];
    expect(kids[1]?.classList.contains('page-nav')).toBe(true);
  });
});

// The head is drawn at the size of the real one, so what is under it does not
// jump on arrival: a title bar and a lede of two lines, with an eyebrow bar
// above them where the page has an eyebrow, and the title alone where the
// page has no lede (the account page).
describe('Skeleton page head', () => {
  const head = (container: HTMLElement): Element | null =>
    container.querySelector('.skeleton__intro');

  it('draws a title and a lede of two lines by default', () => {
    const { container } = render(<Skeleton shape="page" menu />);
    expect(head(container)?.querySelector('.skeleton__title')).not.toBeNull();
    expect(head(container)?.querySelector('.skeleton__eyebrow')).toBeNull();
    expect(head(container)?.querySelectorAll('.skeleton__lede > span')).toHaveLength(2);
  });

  it('draws an eyebrow above the title only for the eyebrow head', () => {
    const { container } = render(<Skeleton shape="page" menu head="eyebrow" />);
    expect(
      [...(head(container)?.children ?? [])].map((node) => node.className.split(' ')[0]),
    ).toEqual(['skeleton__eyebrow', 'skeleton__title', 'skeleton__lede']);
  });

  it('draws the title alone for the title head', () => {
    const { container } = render(<Skeleton shape="page" menu head="title" />);
    expect(head(container)?.querySelector('.skeleton__title')).not.toBeNull();
    expect(head(container)?.querySelector('.skeleton__lede')).toBeNull();
  });
});

// The wait for a page of linked sections (the admin index) draws what that
// page is: a heading, a line, then titled lists of links each with a line
// beneath, and no card blocks, which that page does not have.
describe('Skeleton contents', () => {
  it('draws sections of links and their lines, and no blocks', () => {
    const { container } = render(<Skeleton shape="contents" />);
    expect(container.querySelector('.skeleton__title')).not.toBeNull();
    expect(container.querySelector('.skeleton__lede')).not.toBeNull();
    expect(container.querySelectorAll('.skeleton__section').length).toBeGreaterThan(1);
    expect(container.querySelectorAll('.skeleton__entry').length).toBeGreaterThan(1);
    expect(container.querySelector('.skeleton__block')).toBeNull();
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });
});

// A card list's wait: the filter row is the search box and a Filters button, and
// the count line ("9 ingredients") stands between the row and the cards, as
// they do on the real list (IngredientSearch), so the cards start where they do.
describe('Skeleton for a card list', () => {
  it('draws the count line between the filter row and the cards', () => {
    const { container } = render(<Skeleton shape="cards" title filter />);
    const order = [
      ...container.querySelectorAll(
        '.skeleton__header, .skeleton__filter, .skeleton__count, .skeleton__cards',
      ),
    ];
    expect(order.map((node) => node.className.split(' ')[0])).toEqual([
      'page-header',
      'skeleton__filter',
      'skeleton__count',
      'skeleton__cards',
    ]);
  });

  it("sizes the filter row's second control as the Filters button, not a select", () => {
    const { container } = render(<Skeleton shape="cards" filter />);
    expect(container.querySelector('.skeleton__filter .skeleton__field--button')).not.toBeNull();
    expect(container.querySelector('.skeleton__filter .skeleton__field--short')).toBeNull();
  });

  it('keeps the table skeleton with its select and no count line', () => {
    const { container } = render(<Skeleton shape="table" filter />);
    expect(container.querySelector('.skeleton__filter .skeleton__field--short')).not.toBeNull();
    expect(container.querySelector('.skeleton__count')).toBeNull();
  });
});

// An ingredient's page, below its head: a Details section of text beside a side
// column of headed lists, as the entry lays it, and a Forms section; never the
// card-surface blocks the other pages' skeletons draw.
describe('Skeleton for an ingredient entry', () => {
  it('draws the text beside a side column, in a section of its own', () => {
    const { container } = render(<Skeleton shape="page" menu entry />);
    const section = container.querySelector('.ingredient-entry .skeleton__entry-section');
    expect(section).not.toBeNull();
    expect(section?.querySelector('.skeleton__entry-text')).not.toBeNull();
    expect(section?.querySelectorAll('.skeleton__entry-side > *').length).toBeGreaterThan(1);
  });

  // Both ingredient pages (the Compendium's and a coven's) always show the way
  // back above the heading, so the wait holds a bar for it, ahead of the eyebrow.
  it("draws a bar for the way back above the head's eyebrow", () => {
    const { container } = render(<Skeleton shape="page" menu entry head="eyebrow" />);
    const intro = container.querySelector('.skeleton__intro');
    const bar = intro?.querySelector('.skeleton__entry-bar');
    expect(bar).not.toBeNull();
    expect(intro?.firstElementChild).toBe(bar);
  });

  // The real head has its own padding above and its own gap between rows, so
  // the entry's wait takes the class that sets the same, or the title lands higher.
  it("sets the entry's head with the entry's own head class", () => {
    const { container } = render(<Skeleton shape="page" menu entry head="eyebrow" />);
    expect(container.querySelector('.skeleton__intro--entry')).not.toBeNull();
  });

  it('keeps the plain head for a page that is not an entry', () => {
    const { container } = render(<Skeleton shape="page" menu head="eyebrow" />);
    expect(container.querySelector('.skeleton__intro--entry')).toBeNull();
  });

  it('draws no bar for the way back on a page that is not an entry', () => {
    const { container } = render(<Skeleton shape="page" menu head="eyebrow" />);
    expect(container.querySelector('.skeleton__entry-bar')).toBeNull();
  });

  it('draws no card blocks', () => {
    const { container } = render(<Skeleton shape="page" menu entry />);
    expect(container.querySelector('.skeleton__block')).toBeNull();
  });

  it('keeps the card blocks for a page without a menu', () => {
    const { container } = render(<Skeleton shape="page" />);
    expect(container.querySelector('.skeleton__block')).not.toBeNull();
    expect(container.querySelector('.skeleton__entry-section')).toBeNull();
  });
});

// The wait for a page with a jump menu (the coven home, the account page)
// draws the page's sections as bare bars, or as the account's panels, and
// never the card blocks, which neither page has (owner's report, 2026-10-19).
describe('Skeleton page with a menu', () => {
  it('draws the coven home as headed sections, with no card blocks', () => {
    const { container } = render(<Skeleton shape="page" menu head="eyebrow" />);
    expect(container.querySelector('.skeleton__block')).toBeNull();
    const sections = container.querySelectorAll('.page-with-nav > .page-frame__section');
    expect(sections.length).toBeGreaterThan(1);
    sections.forEach((section) => {
      expect(section.querySelector('.skeleton__heading')).not.toBeNull();
    });
    expect(container.querySelectorAll('.skeleton__entry').length).toBeGreaterThan(1);
    expect(container.querySelector('.panel')).toBeNull();
  });

  it('draws the account as headed panels, with no card blocks', () => {
    const { container } = render(<Skeleton shape="page" menu head="title" />);
    expect(container.querySelector('.skeleton__block')).toBeNull();
    const panels = container.querySelectorAll('.page-with-nav > .page-frame__section.panel');
    expect(panels).toHaveLength(4);
    panels.forEach((panel) => {
      expect(panel.querySelector('.skeleton__heading')).not.toBeNull();
    });
  });
});
