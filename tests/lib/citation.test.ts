import { describe, expect, it } from 'vitest';
import { byCitation, citationText, renderCitation } from '@/lib/citation';
import type { CitationFields, CitationPart } from '@/lib/types';

// DESIGN.md §5, "The citation is rendered, never stored": one renderer, its
// parts joined back with `_` around the italic ones so each case compares
// against the seed doc's own Markdown (claude-docs/db/references.md, "The
// renderer"). Each kind's examples are copied from
// claude-docs/db/deity-vocabulary-seed.md; the rest use invented names.

/** The parts as the seed doc writes them: `_` around each italic run. */
const marked = (parts: CitationPart[]) =>
  parts.map(({ text, italic }) => (italic ? `_${text}_` : text)).join('');

const render = (fields: CitationFields) => marked(renderCitation(fields));

describe('renderCitation, per kind, against the seed doc', () => {
  it('renders a book with its translator', () => {
    expect(
      render({
        kind: 'book',
        authors: 'Simek, Rudolf',
        title: 'Dictionary of Northern Mythology',
        contributors: 'Translated by Angela Hall',
        place: 'Cambridge',
        publisher: 'D. S. Brewer',
        published: '1993',
      }),
    ).toBe(
      'Simek, Rudolf. _Dictionary of Northern Mythology_. Translated by Angela Hall. Cambridge: D. S. Brewer, 1993.',
    );
  });

  it('renders a book read through a host, its authors’ own period kept single', () => {
    expect(
      render({
        kind: 'book',
        authors: 'Smith, William, ed.',
        title: 'A Dictionary of Greek and Roman Biography and Mythology',
        place: 'London',
        publisher: 'John Murray',
        published: '1873',
        host: 'Perseus Digital Library, Tufts University',
        accessed: '2026-10-06',
        url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0104',
      }),
    ).toBe(
      'Smith, William, ed. _A Dictionary of Greek and Roman Biography and Mythology_. London: John Murray, 1873. Perseus Digital Library, Tufts University. Accessed October 6, 2026. https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:1999.04.0104.',
    );
  });

  it('renders a book’s note in parentheses after the citation', () => {
    expect(
      render({
        kind: 'book',
        authors: 'Cunningham, Scott',
        title: "Cunningham's Encyclopedia of Magical Herbs",
        place: 'St. Paul, MN',
        publisher: 'Llewellyn Publications',
        published: '1985',
        note: "Each entry names the herb's deities.",
      }),
    ).toBe(
      "Cunningham, Scott. _Cunningham's Encyclopedia of Magical Herbs_. St. Paul, MN: Llewellyn Publications, 1985. (Each entry names the herb's deities.)",
    );
  });

  it('renders a chapter: its title quoted, its book italic after "In"', () => {
    expect(
      render({
        kind: 'chapter',
        authors: 'Pope, Marvin H.',
        title: 'Anath',
        container: 'Encyclopaedia Judaica',
        host: 'Encyclopedia.com',
        accessed: '2026-10-06',
        url: 'https://www.encyclopedia.com/people/philosophy-and-religion/biblical-proper-names-biographies/anath',
      }),
    ).toBe(
      'Pope, Marvin H. "Anath." In _Encyclopaedia Judaica_. Encyclopedia.com. Accessed October 6, 2026. https://www.encyclopedia.com/people/philosophy-and-religion/biblical-proper-names-biographies/anath.',
    );
  });

  it('renders an article without a volume: the journal, then its date', () => {
    expect(
      render({
        kind: 'article',
        authors: 'Nwokocha, Eziaku Atuama',
        title: 'An Equilibrist Vodou Goddess',
        container: 'Harvard Divinity Bulletin',
        published: 'Summer/Autumn 2013',
        accessed: '2026-10-06',
        url: 'https://bulletin.hds.harvard.edu/an-equilibrist-vodou-goddess/',
      }),
    ).toBe(
      'Nwokocha, Eziaku Atuama. "An Equilibrist Vodou Goddess." _Harvard Divinity Bulletin_, Summer/Autumn 2013. Accessed October 6, 2026. https://bulletin.hds.harvard.edu/an-equilibrist-vodou-goddess/.',
    );
  });

  it('renders an article with a volume: number, issue, the date in parentheses, then pages', () => {
    expect(
      render({
        kind: 'article',
        authors: 'Testwort, Fixtura',
        title: 'A Note on Fixture Covens',
        container: 'Journal of Invented Botany',
        volume: '51',
        issue: '2',
        published: '1988',
        pages: '399',
      }),
    ).toBe(
      'Testwort, Fixtura. "A Note on Fixture Covens." _Journal of Invented Botany_ 51, no. 2 (1988): 399.',
    );
  });

  it('renders an entry under a reference work, its site roman', () => {
    expect(
      render({
        kind: 'entry',
        title: 'Guanyin',
        container: 'Wikipedia',
        modified: '2024-12-28',
        accessed: '2026-10-06',
        url: 'https://en.wikipedia.org/wiki/Guanyin',
      }),
    ).toBe(
      'Wikipedia, s.v. "Guanyin." Last modified December 28, 2024. Accessed October 6, 2026. https://en.wikipedia.org/wiki/Guanyin.',
    );
  });

  it('renders an entry whose reference work is marked italic', () => {
    expect(
      render({
        kind: 'entry',
        title: 'Perkūnas',
        container: '_Visuotinė lietuvių enciklopedija_',
        place: 'Vilnius',
        publisher: 'Mokslo ir enciklopedijų leidybos centras',
        accessed: '2026-10-06',
        url: 'https://www.vle.lt/straipsnis/perkunas/',
      }),
    ).toBe(
      '_Visuotinė lietuvių enciklopedija_, s.v. "Perkūnas." Vilnius: Mokslo ir enciklopedijų leidybos centras. Accessed October 6, 2026. https://www.vle.lt/straipsnis/perkunas/.',
    );
  });

  it('renders a web page, its site roman and an underscore in its URL left alone', () => {
    expect(
      render({
        kind: 'web_page',
        authors: 'Cartwright, Mark',
        title: 'Greek Mythology',
        container: 'World History Encyclopedia',
        published: 'July 29, 2012',
        accessed: '2026-10-06',
        url: 'https://www.worldhistory.org/Greek_Mythology/',
      }),
    ).toBe(
      'Cartwright, Mark. "Greek Mythology." World History Encyclopedia. July 29, 2012. Accessed October 6, 2026. https://www.worldhistory.org/Greek_Mythology/.',
    );
  });

  it('renders a web page carrying both dates, the second lowercase after a semicolon', () => {
    expect(
      render({
        kind: 'web_page',
        authors: 'Cartwright, Mark',
        title: 'Seven Lucky Gods',
        container: 'World History Encyclopedia',
        published: 'June 24, 2013',
        modified: '2024-09-27',
        accessed: '2026-10-06',
        url: 'https://www.worldhistory.org/Shichifukujin/',
      }),
    ).toBe(
      'Cartwright, Mark. "Seven Lucky Gods." World History Encyclopedia. June 24, 2013; last modified September 27, 2024. Accessed October 6, 2026. https://www.worldhistory.org/Shichifukujin/.',
    );
  });
});

describe('renderCitation, field by field', () => {
  const WEB_PAGE: CitationFields = {
    kind: 'web_page',
    title: 'Testwort',
    url: 'https://example.org/testwort',
    accessed: '2026-10-06',
  };

  it('renders the least a row may hold: a book with a title alone', () => {
    expect(render({ kind: 'book', title: 'A Herbal of Fixture Covens' })).toBe(
      '_A Herbal of Fixture Covens_.',
    );
  });

  it('capitalises "Last modified" on a web page with no published date', () => {
    expect(render({ ...WEB_PAGE, modified: '2025-01-02' })).toBe(
      '"Testwort." Last modified January 2, 2025. Accessed October 6, 2026. https://example.org/testwort.',
    );
  });

  it('prints a web page’s publisher as its own sentence after the site', () => {
    expect(render({ ...WEB_PAGE, container: 'Fixture Wiki', publisher: 'Fixture Society' })).toBe(
      '"Testwort." Fixture Wiki. Fixture Society. Accessed October 6, 2026. https://example.org/testwort.',
    );
  });

  it('renders every book field in Chicago’s order', () => {
    expect(
      render({
        kind: 'book',
        authors: 'Testwort, Fixtura, ed.',
        title: 'A Herbal of Fixture Covens',
        contributors: 'Translated by Mock Fixture',
        edition: '2nd ed.',
        volume: '2 vols.',
        series: 'Handbooks of Invented Botany',
        place: 'Testford',
        publisher: 'Fixture Press',
        published: '1988',
        host: 'Invented Digital Library',
        modified: '2024-12-28',
        accessed: '2026-10-06',
        url: 'https://example.org/herbal',
        note: 'Each entry names the herb’s _Fixtura_',
      }),
    ).toBe(
      'Testwort, Fixtura, ed. _A Herbal of Fixture Covens_. Translated by Mock Fixture. 2nd ed. 2 vols. Handbooks of Invented Botany. Testford: Fixture Press, 1988. Invented Digital Library. Last modified December 28, 2024. Accessed October 6, 2026. https://example.org/herbal. (Each entry names the herb’s _Fixtura_.)',
    );
  });

  it('renders a chapter’s editors and pages after its book', () => {
    expect(
      render({
        kind: 'chapter',
        authors: 'Testwort, Fixtura',
        title: 'On Mockleaf',
        container: 'The Fixture Reader',
        contributors: 'edited by Mock Fixture',
        pages: '12–30',
        place: 'Testford',
        publisher: 'Fixture Press',
        published: '1990',
      }),
    ).toBe(
      'Testwort, Fixtura. "On Mockleaf." In _The Fixture Reader_, edited by Mock Fixture, 12–30. Testford: Fixture Press, 1990.',
    );
  });

  it('renders an entry’s edition after its reference work', () => {
    expect(
      render({
        kind: 'entry',
        title: 'Testwort',
        container: '_Encyclopaedia Fixturalis_',
        edition: '3rd ed.',
        published: '2001',
      }),
    ).toBe('_Encyclopaedia Fixturalis_, 3rd ed., s.v. "Testwort." 2001.');
  });

  it('renders an article with a volume and no date or issue', () => {
    expect(
      render({
        kind: 'article',
        title: 'Fixture Notes',
        container: 'Journal of Invented Botany',
        volume: '7',
        pages: '1–9',
      }),
    ).toBe('"Fixture Notes." _Journal of Invented Botany_ 7: 1–9.');
  });

  it('drops each missing piece of the publication clause with its punctuation', () => {
    const book = { kind: 'book', title: 'Fixtures' } as const;

    expect(render({ ...book, place: 'Testford', publisher: 'Fixture Press' })).toBe(
      '_Fixtures_. Testford: Fixture Press.',
    );
    expect(render({ ...book, publisher: 'Fixture Press', published: '1988' })).toBe(
      '_Fixtures_. Fixture Press, 1988.',
    );
    expect(render({ ...book, place: 'Testford', published: '1988' })).toBe(
      '_Fixtures_. Testford, 1988.',
    );
    expect(render({ ...book, published: '1988' })).toBe('_Fixtures_. 1988.');
  });

  it('adds no period after a title that ends in its own punctuation', () => {
    expect(render({ kind: 'book', title: 'Who Was Testwort?' })).toBe('_Who Was Testwort?_');
    expect(render({ ...WEB_PAGE, title: 'Why Testwort?' })).toBe(
      '"Why Testwort?" Accessed October 6, 2026. https://example.org/testwort.',
    );
  });

  it('treats a blank field as absent', () => {
    expect(render({ kind: 'book', title: 'Fixtures', authors: '  ', place: '' })).toBe(
      '_Fixtures_.',
    );
  });
});

// CommonMark's rule for `_`: a mark opens where no letter or digit precedes
// it and closes where none follows, so an underscore inside a word is text.
describe('renderCitation, italic marks', () => {
  it('italicises a span marked in a roman field', () => {
    expect(
      renderCitation({
        kind: 'web_page',
        title: 'On Testwort',
        container: '_Internet Encyclopedia of Fixtures_',
        url: 'https://example.org/a',
        accessed: '2026-10-06',
      }).filter((part) => part.italic),
    ).toEqual([{ text: 'Internet Encyclopedia of Fixtures', italic: true }]);
  });

  it('renders a span marked in an italic field roman, a title inside a title', () => {
    expect(render({ kind: 'book', title: 'Reading _Mockleaf_ Again' })).toBe(
      '_Reading _Mockleaf_ Again_.',
    );
    expect(renderCitation({ kind: 'book', title: 'Reading _Mockleaf_ Again' })).toEqual([
      { text: 'Reading ', italic: true },
      { text: 'Mockleaf', italic: false },
      { text: ' Again', italic: true },
      { text: '.', italic: false },
    ]);
  });

  it('italicises a marked span inside a quoted title', () => {
    expect(
      render({ kind: 'chapter', title: 'Notes on _Mockleaf_', container: 'The Fixture Reader' }),
    ).toBe('"Notes on _Mockleaf_." In _The Fixture Reader_.');
  });

  it('leaves an underscore inside a word as text', () => {
    expect(render({ kind: 'entry', title: 'Snake_case_word', container: 'Fixture_Wiki' })).toBe(
      'Fixture_Wiki, s.v. "Snake_case_word."',
    );
  });

  it('leaves an unclosed or empty mark as text', () => {
    expect(citationText({ kind: 'entry', title: 'Testwort', container: '_Fixture Wiki' })).toBe(
      '_Fixture Wiki, s.v. "Testwort."',
    );
    expect(citationText({ kind: 'entry', title: 'Testwort', container: 'A __ B' })).toBe(
      'A __ B, s.v. "Testwort."',
    );
  });

  it('reads a mark beside punctuation', () => {
    expect(
      renderCitation({ kind: 'entry', title: 'Testwort', container: '(_Fixturalis_)' }),
    ).toEqual([
      { text: '(', italic: false },
      { text: 'Fixturalis', italic: true },
      { text: '), s.v. "Testwort."', italic: false },
    ]);
  });

  it('never reads a mark in the URL, the authors or any other field', () => {
    const parts = renderCitation({
      kind: 'web_page',
      authors: '_Testwort_, Fixtura',
      title: 'Testwort',
      url: 'https://example.org/_a_/',
      accessed: '2026-10-06',
    });

    expect(parts.some((part) => part.italic)).toBe(false);
    expect(citationText({ kind: 'book', title: 'T', publisher: '_Fixture Press_' })).toBe(
      'T. _Fixture Press_.',
    );
  });

  it('merges neighbouring runs of one style', () => {
    const parts = renderCitation({
      kind: 'book',
      authors: 'Testwort, Fixtura',
      title: 'Fixtures',
      place: 'Testford',
    });

    expect(parts).toEqual([
      { text: 'Testwort, Fixtura. ', italic: false },
      { text: 'Fixtures', italic: true },
      { text: '. Testford.', italic: false },
    ]);
  });
});

describe('citationText', () => {
  it('joins the parts plain, italics dropped', () => {
    expect(
      citationText({
        kind: 'book',
        authors: 'Simek, Rudolf',
        title: 'Dictionary of Northern Mythology',
        published: '1993',
      }),
    ).toBe('Simek, Rudolf. Dictionary of Northern Mythology. 1993.');
  });
});

// CMOS 14.67: a bibliography files a work by its first word, less a leading
// article, and a quotation mark is not a letter.
describe('byCitation', () => {
  const sorted = (citations: string[]) => [...citations].sort(byCitation);

  it('sorts alphabetically, case- and accent-insensitively', () => {
    expect(sorted(['zeta.', 'Émile.', 'beta.', 'Alpha.'])).toEqual([
      'Alpha.',
      'beta.',
      'Émile.',
      'zeta.',
    ]);
  });

  it('files a citation under its first word less an initial A, An or The', () => {
    expect(sorted(['The Zebra.', 'Mockleaf.', 'An Ant.', 'A Bee.', 'Theory.', 'Anvil.'])).toEqual([
      'An Ant.',
      'Anvil.',
      'A Bee.',
      'Mockleaf.',
      'Theory.',
      'The Zebra.',
    ]);
  });

  it('ignores a leading quotation mark', () => {
    expect(sorted(['"Zest."', 'Mockleaf.', '“The Apple.”', '"Bee."'])).toEqual([
      '“The Apple.”',
      '"Bee."',
      'Mockleaf.',
      '"Zest."',
    ]);
  });
});
