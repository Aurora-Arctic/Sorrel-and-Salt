import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DocumentPage from '@/components/DocumentPage';
import { slugify } from '@/lib/slugify';

// The public document page (claude-docs/components/document-page.md): a heading, the date the text was last changed, and a
// version's markdown rendered beneath on the server, with nothing read from a session.

const DAY = new Date('2026-03-04T00:00:00Z');

type Props = Parameters<typeof DocumentPage>[0];

const show = (body: string, extra: Partial<Props> = {}) =>
  render(<DocumentPage title="Fixture Policy" updatedOn={DAY} body={body} {...extra} />);

/** The element a fragment link points at. */
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

  // The menu is read from the markdown's own headings: an `##` with `###`s under it is a group, each `###` an entry in it; an `##`
  // with none is an entry itself; a deeper heading is in no menu.
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
    // The deeper heading is still on the page, just not in the menu.
    expect(screen.getByRole('heading', { level: 4, name: 'Fixture Deep' })).toBeTruthy();
  });

  // Each source is a footnote: its marks link down to its entry in the Sources list, and the entry links back to every mark.
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
      // The list sits under the Sources heading.
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

  // HTML written in a body is text, never an element, so a body can run nothing.
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

  // The earlier published versions, newest first, each linked to its own page and dated by its own publish.
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
});
