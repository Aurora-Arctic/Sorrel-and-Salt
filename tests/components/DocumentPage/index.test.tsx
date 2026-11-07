import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DocumentPage from '@/components/DocumentPage';
import { slugify } from '@/lib/slugify';

// claude-docs/components/document-page.md

const DAY = new Date('2026-03-04T00:00:00Z');

type Props = Parameters<typeof DocumentPage>[0];

const show = (body: string, extra: Partial<Props> = {}) =>
  render(<DocumentPage title="Fixture Policy" updatedOn={DAY} body={body} {...extra} />);

function targetOf(link: HTMLElement): HTMLElement {
  const href = link.getAttribute('href') ?? '';
  expect(href).toMatch(/^#./);
  const target = document.getElementById(decodeURIComponent(href.slice(1)));
  expect(target, href).not.toBeNull();
  return target as HTMLElement;
}

describe('DocumentPage', () => {
  it('heads the document with its title and says when it was last updated, as a dated time', () => {
    show('## Fixture Section\n\nFixture text.');
    const article = screen.getByRole('article', { name: 'Fixture Policy' });
    expect(within(article).getByRole('heading', { level: 1, name: 'Fixture Policy' })).toBeTruthy();
    const updated = within(article).getByText(/last updated/i);
    const time = within(updated).getByText('4 March 2026');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', '2026-03-04');
    expect(
      within(article).getByRole('heading', { level: 2, name: 'Fixture Section' }),
    ).toBeTruthy();
  });

  it('shows the lede under the heading when the document has one', () => {
    show('Body.', { lede: 'What the fixture keeps.' });
    expect(screen.getByText('What the fixture keeps.')).toBeTruthy();
  });

  it('builds the On This Page menu from the ## and ### headings, each linking to its heading', () => {
    show(
      [
        'Opening paragraph.',
        '## Fixture Alone',
        'Text.',
        '## Fixture Group',
        '### Fixture *First* Part',
        'Text.',
        '### Fixture Second Part',
        'Text.',
        '#### Fixture Deep',
        'Text.',
      ].join('\n\n'),
    );
    const nav = screen.getByRole('navigation', { name: 'On This Page' });
    const links = within(nav).getAllByRole('link');

    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Fixture Alone', `#${slugify('Fixture Alone')}`],
      ['Fixture First Part', `#${slugify('Fixture First Part')}`],
      ['Fixture Second Part', `#${slugify('Fixture Second Part')}`],
    ]);
    const group = within(nav).getByRole('list', { name: 'Fixture Group' });
    expect(
      within(group)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Fixture First Part', 'Fixture Second Part']);
    expect(targetOf(links[0])).toBe(
      screen.getByRole('heading', { level: 2, name: 'Fixture Alone' }),
    );
    expect(targetOf(links[1])).toBe(
      screen.getByRole('heading', { level: 3, name: 'Fixture First Part' }),
    );
    expect(screen.getByRole('heading', { level: 4, name: 'Fixture Deep' })).toBeTruthy();
  });

  // On a phone the menu folds into a disclosure (tests/components/PageNav covers the fold); the environment reports a narrow viewport.
  it('folds the On This Page menu into a closed disclosure on a narrow viewport, opened by its summary', () => {
    show('## Fixture Section\n\nFixture text.');
    const nav = screen.getByRole('navigation', { name: 'On This Page' });

    const fold = within(nav).getByRole('group');
    expect(fold).not.toHaveAttribute('open');
    expect(within(fold).getByRole('link', { name: 'Fixture Section' })).toBeTruthy();

    // The summary has no ARIA role, so it is found as the disclosure group's own toggle. happy-dom
    // toggles a disclosure before React's listener can cancel it, so the native toggle is cancelled
    // here, as the component does in a browser, leaving `open` to the component.
    const summary = fold.querySelector(':scope > summary') as HTMLElement;
    summary.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(summary);
    expect(fold).toHaveAttribute('open');
  });

  // A heading's text need not be unique in a document, but an id must be, or the menu's second link lands on the first heading.
  describe('two headings with the same text', () => {
    function repeatedIds(): string[] {
      const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
      return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    }

    function expectMenuLandsOn(label: string, headings: HTMLElement[]): void {
      const nav = screen.getByRole('navigation', { name: 'On This Page' });
      const targets = within(nav).getAllByRole('link', { name: label }).map(targetOf);
      expect(targets).toHaveLength(headings.length);
      targets.forEach((target, index) => expect(target, `link ${index + 1}`).toBe(headings[index]));
    }

    it('gives each its own id, and the menu links each to its own heading', () => {
      show(
        [
          '## Fixture First Group',
          '### Fixture Scope',
          'Text.',
          '## Fixture Second Group',
          '### Fixture Scope',
          'Text.',
        ].join('\n\n'),
      );
      const headings = screen.getAllByRole('heading', { level: 3, name: 'Fixture Scope' });
      // Precondition: both headings are drawn and both are in the menu.
      expect(headings).toHaveLength(2);

      expectMenuLandsOn('Fixture Scope', headings);
      expect(repeatedIds()).toEqual([]);
    });

    it('keeps a body heading named Sources apart from the Sources heading over the footnotes', () => {
      show(
        ['## Sources', 'How the fixture chose them.[^one]', '[^one]: Fixture, Author.'].join(
          '\n\n',
        ),
      );
      const headings = screen.getAllByRole('heading', { level: 2, name: 'Sources' });
      expect(headings).toHaveLength(2);

      expectMenuLandsOn('Sources', headings);
      expect(repeatedIds()).toEqual([]);
    });

    it("keeps a body heading apart from the page's own Earlier Versions heading", () => {
      show('## Document History\n\nText.', {
        history: [{ number: 1, publishedAt: DAY, href: '/fixture/versions/1' }],
      });
      // Precondition: the page draws its own heading, whose id the body heading's text slugifies to.
      expect(screen.getByRole('heading', { level: 2, name: 'Earlier Versions' })).toBeTruthy();

      expectMenuLandsOn('Document History', [
        screen.getByRole('heading', { level: 2, name: 'Document History' }),
      ]);
      expect(repeatedIds()).toEqual([]);
    });
  });

  describe('sources', () => {
    const BODY = [
      '## Fixture Claims',
      'First claim.[^herbal] Second claim.[^second]',
      'Third claim.[^herbal]',
      '[^herbal]: Fixture, Author. *A Fixture Herbal*. Fixture Press, 1988.',
      '[^second]: Fixture, Other. *A Second Fixture*. Fixture Press, 1990.',
    ].join('\n\n');

    it('marks each citing sentence with a link to its source in the Sources list', () => {
      show(BODY);
      const sources = screen.getByRole('heading', { level: 2, name: 'Sources' });

      const firstMarks = screen.getAllByRole('link', { name: 'Source 1' });
      expect(firstMarks).toHaveLength(2);
      const [secondMark] = screen.getAllByRole('link', { name: 'Source 2' });
      const herbal = targetOf(firstMarks[0]);
      expect(targetOf(firstMarks[1])).toBe(herbal);
      expect(herbal.tagName).toBe('LI');
      expect(herbal).toHaveTextContent('A Fixture Herbal');
      expect(targetOf(secondMark)).toHaveTextContent('A Second Fixture');
      expect(
        sources.compareDocumentPosition(herbal) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('links each source back to every mark that cites it', () => {
      show(BODY);
      const firstMarks = screen.getAllByRole('link', { name: 'Source 1' });
      const [secondMark] = screen.getAllByRole('link', { name: 'Source 2' });

      const herbal = targetOf(firstMarks[0]);
      const backs = [
        within(herbal).getByRole('link', { name: 'Back to citation 1' }),
        within(herbal).getByRole('link', { name: 'Back to citation 2' }),
      ];
      expect(backs.map(targetOf)).toEqual(firstMarks);
      const once = within(targetOf(secondMark)).getByRole('link', { name: 'Back to the text' });
      expect(targetOf(once)).toBe(secondMark);
    });

    it('lists Sources in the On This Page menu, and no heading under the name markdown gives footnotes', () => {
      show(BODY);
      const nav = screen.getByRole('navigation', { name: 'On This Page' });
      const entry = within(nav).getByRole('link', { name: 'Sources' });

      expect(targetOf(entry)).toBe(screen.getByRole('heading', { level: 2, name: 'Sources' }));
      expect(screen.queryByRole('heading', { name: 'Footnotes' })).toBeNull();
    });
  });

  it('prints raw HTML as text, never as elements', () => {
    const { container } = show(
      [
        '<script>window.fixtureRan = true</script>',
        'Before <b>bold</b> after.',
        '<img src="https://example.test/fixture.png" alt="Fixture Image">',
      ].join('\n\n'),
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.queryByRole('img', { name: 'Fixture Image' })).toBeNull();
    expect(screen.getByText(/<script>window\.fixtureRan = true<\/script>/)).toBeTruthy();
    expect(screen.getByText(/Before <b>bold<\/b> after\./)).toBeTruthy();
  });

  describe('links', () => {
    it('makes relative, https: and mailto: addresses links', () => {
      show(
        [
          '## Fixture Section',
          '[Fixture Terms](/terms), [Fixture Anchor](#fixture-section) and [Fixture Support](?support=accessibility).',
          '[Fixture Site](https://example.test/a), [Fixture Mail](mailto:fixture@example.test) and https://example.test/auto.',
        ].join('\n\n'),
      );

      const names = [
        'Fixture Terms',
        'Fixture Anchor',
        'Fixture Support',
        'Fixture Site',
        'Fixture Mail',
        'https://example.test/auto',
      ];
      const hrefs = Object.fromEntries(
        names.map((name) => [name, screen.getByRole('link', { name }).getAttribute('href')]),
      );
      expect(hrefs).toEqual({
        'Fixture Terms': '/terms',
        'Fixture Anchor': '#fixture-section',
        'Fixture Support': '?support=accessibility',
        'Fixture Site': 'https://example.test/a',
        'Fixture Mail': 'mailto:fixture@example.test',
        'https://example.test/auto': 'https://example.test/auto',
      });
    });

    // robots.txt blocks the account pages and a signed-out crawler is sent to sign-in from them, so a
    // crawler that followed the link would report a blocked page.
    it('asks a crawler not to follow a link into the account pages, and follows any other', () => {
      show(
        [
          '[Fixture Agreement](/account/terms), [Fixture Account](/account) and [Fixture Return](/account?tab=email).',
          '[Fixture Terms](/terms), [Fixture Accounting](/accounting) and [Fixture Site](https://example.test/account/terms).',
        ].join('\n\n'),
      );

      for (const name of ['Fixture Agreement', 'Fixture Account', 'Fixture Return']) {
        expect(screen.getByRole('link', { name }), name).toHaveAttribute('rel', 'nofollow');
      }
      for (const name of ['Fixture Terms', 'Fixture Accounting', 'Fixture Site']) {
        expect(screen.getByRole('link', { name }), name).not.toHaveAttribute('rel');
      }
    });

    it('prints any other address as plain text, keeping the words', () => {
      const refused = {
        'Fixture Script': 'javascript:alert(1)',
        'Fixture Shouting': 'JavaScript:alert(1)',
        'Fixture Data': 'data:text/html,fixture',
        'Fixture Plain': 'http://example.test/b',
        'Fixture Elsewhere': '//example.test/c',
        'Fixture Phone': 'tel:+15550100',
      };
      show(
        Object.entries(refused)
          .map(([name, href]) => `[${name}](${href})`)
          .join('\n\n'),
      );

      for (const name of Object.keys(refused)) {
        expect(screen.queryByRole('link', { name }), name).toBeNull();
        expect(screen.getByText(name), name).toBeTruthy();
      }
      expect(screen.queryAllByRole('link')).toEqual([]);
    });
  });

  it('renders a GFM table as a table', () => {
    show(
      [
        '| Fixture Role | Fixture Reach |',
        '| --- | --- |',
        '| Fixture Viewer | Reads |',
        '| Fixture Member | Writes |',
      ].join('\n'),
    );

    const table = screen.getByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Fixture Role', 'Fixture Reach']);
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(
      within(rows[2])
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['Fixture Member', 'Writes']);
  });

  it('links each earlier version it is given to that version, dated, newest first', () => {
    show('## Fixture Section\n\nFixture text.', {
      history: [
        { number: 2, publishedAt: new Date('2026-02-01T00:00:00Z'), href: '/privacy/versions/2' },
        { number: 1, publishedAt: new Date('2026-01-15T00:00:00Z'), href: '/privacy/versions/1' },
      ],
    });

    const second = screen.getByRole('link', { name: /1 February 2026/ });
    const first = screen.getByRole('link', { name: /15 January 2026/ });
    expect(second).toHaveAttribute('href', '/privacy/versions/2');
    expect(first).toHaveAttribute('href', '/privacy/versions/1');
    expect(second.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  describe('a placeholder paragraph', () => {
    const cards = (
      <aside aria-label="Fixture Cards">
        <p>Fixture card text.</p>
      </aside>
    );

    it('draws the node the page maps to its name in place of the paragraph, in the text’s order', () => {
      show(
        ['## Fixture Section', 'Fixture opening.', '{fixture-cards}', 'Fixture closing.'].join(
          '\n\n',
        ),
        { placeholders: { 'fixture-cards': cards } },
      );

      const drawn = screen.getByRole('complementary', { name: 'Fixture Cards' });
      expect(drawn.closest('p')).toBeNull();
      expect(screen.queryByText('{fixture-cards}')).toBeNull();
      const opening = screen.getByText('Fixture opening.');
      const closing = screen.getByText('Fixture closing.');
      expect(
        opening.compareDocumentPosition(drawn) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        drawn.compareDocumentPosition(closing) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('prints a placeholder the page does not map as the text it was written as', () => {
      show('{fixture-missing}', { placeholders: { 'fixture-cards': cards } });

      // Precondition: the map holds a node, so only the name decides it is not drawn.
      expect(screen.queryByRole('complementary')).toBeNull();
      expect(screen.getByText('{fixture-missing}').tagName).toBe('P');
    });

    it('prints a mapped name inside other text as the text it was written as', () => {
      show('See {fixture-cards} below.', { placeholders: { 'fixture-cards': cards } });

      expect(screen.queryByRole('complementary')).toBeNull();
      expect(screen.getByText('See {fixture-cards} below.').tagName).toBe('P');
    });

    it('prints every placeholder as text on a page that maps none', () => {
      show('{fixture-cards}');

      expect(screen.queryByRole('complementary')).toBeNull();
      expect(screen.getByText('{fixture-cards}').tagName).toBe('P');
    });
  });
});
