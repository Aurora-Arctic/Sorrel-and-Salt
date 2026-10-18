import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientEntry from '@/components/IngredientEntry';
import type { IngredientEntryProps } from '@/components/IngredientEntry/types';
import type { IngredientFormProps } from '@/components/IngredientForm/types';
import { EMPTY_VALUES } from '@/components/IngredientForm/values';
import { Navigating } from '../../support/navigating';
import type {
  IngredientRow,
  CategoryDetail,
  CitedReference,
  IngredientDetail,
  IngredientVariantRow,
  VariantDetail,
} from '@/modules/ingredients';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// The form is its own tests': a stand-in that reports what the dialog hands
// it, with a button for each way out it can take.
vi.mock('@/components/IngredientForm', () => ({
  default: ({ entry, onSaved, onDeleted, duplicateHref, entryHref }: IngredientFormProps) => (
    <form aria-label="Fixture Form">
      <output aria-label="Edited">{entry?.id}</output>
      <output aria-label="Duplicate Address">
        {duplicateHref({ slug: 'testwort-other' } as never)}
      </output>
      <output aria-label="Linked Address">
        {entryHref?.({ slug: 'testwort-linked', isGlobal: true })}
      </output>
      <button
        type="button"
        onClick={() => onSaved?.({ slug: 'testwort-renamed' } as never, 'open')}
      >
        Fixture Save
      </button>
      <button type="button" onClick={() => onDeleted?.()}>
        Fixture Delete
      </button>
    </form>
  ),
}));

// The page body both entry routes render (M8.19;
// claude-docs/components/ingredient-entry.md). Every name and value below is
// the test's own data, so finding one proves what rendered, never what the
// copy says; the formal-name line is asserted by its structure (a labelled
// value, italic or not), not by its sentences.

const STAMPS = {
  createdAt: new Date('2026-01-01T00:00:00Z'),
  createdBy: '00000000-0000-4000-8000-0000000000aa',
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  updatedBy: '00000000-0000-4000-8000-0000000000aa',
  deletedAt: null,
  deletedBy: null,
};

const COVEN = '00000000-0000-4000-8000-0000000000c1';

// Ids only need to differ, so each fixture row takes the next one.
let serial = 0;
const nextId = (): string => `00000000-0000-4000-8000-${(++serial).toString().padStart(12, '0')}`;

function entryRow(overrides: Partial<IngredientRow> = {}): IngredientRow {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    workspaceId: null,
    name: 'Testwort',
    slug: 'testwort-fixtura-testalis',
    canonicalName: 'Fixtura testalis',
    nomenclature: 'botanical',
    identityKey: 'fixtura testalis',
    description: 'A fixture herb.',
    elements: ['fire'],
    celestialBodies: ['Fixture Moon'],
    zodiacSigns: [],
    colors: null,
    safetyNotes: null,
    toxic: false,
    seedKey: null,
    ...STAMPS,
    ...overrides,
  };
}

function variantRow(form: string, overrides: Partial<IngredientVariantRow> = {}): VariantDetail {
  return {
    variant: {
      id: nextId(),
      ingredientId: '00000000-0000-4000-8000-000000000001',
      workspaceId: null,
      form,
      formId: null,
      description: null,
      safetyNotes: null,
      toxic: false,
      elements: null,
      celestialBodies: null,
      zodiacSigns: null,
      colors: null,
      ...STAMPS,
      ...overrides,
    },
    icon: null,
    categories: [],
    substitutes: [],
    references: [],
  };
}

/** A web page or book as the loader returns it: invented title, optional locator and url. */
function cited(
  title: string,
  locator: string | null = null,
  url: string | null = null,
): CitedReference {
  return {
    reference: {
      id: nextId(),
      workspaceId: null,
      kind: url ? 'web_page' : 'book',
      title,
      authors: 'Fixture, Ada',
      container: url ? 'Fixture Site' : null,
      contributors: null,
      edition: null,
      volume: null,
      issue: null,
      series: null,
      place: null,
      publisher: null,
      published: '1988',
      pages: null,
      host: null,
      url,
      modified: null,
      accessed: url ? '2026-01-01' : null,
      note: null,
      seedKey: null,
      ...STAMPS,
    },
    locator,
  };
}

function category(name: string): CategoryDetail {
  const groupId = '00000000-0000-4000-8000-0000000000b1';
  return {
    category: {
      id: nextId(),
      name,
      slug: name.toLowerCase(),
      description: 'A fixture category.',
      seedKey: null,
      groupId,
      ...STAMPS,
    },
    group: {
      id: groupId,
      name: 'Fixture Wards',
      slug: 'fixture-wards',
      description: 'A fixture group.',
      seedKey: null,
      colorDark: '#88aacc',
      colorLight: '#335577',
      ...STAMPS,
    },
  };
}

const LINKED = {
  id: '00000000-0000-4000-8000-000000000002',
  slug: 'fixture-mockroot',
  workspaceId: null,
};
const LINKED_HREF = '/compendium/ingredients/fixture-mockroot' as Route;

function detail(overrides: Partial<IngredientDetail> = {}): IngredientDetail {
  return {
    entry: entryRow(),
    folkNames: ['Fixture Bane', 'Testing Weed'],
    categories: [category('Testwards'), category('Mockcraft')],
    deities: [{ name: 'Fixtura', tradition: 'Fixture Pantheon' }],
    substitutes: [
      { name: 'Fixture Mockroot', ingredient: LINKED, form: null },
      { name: 'Typed Testleaf', ingredient: null, form: null },
      { name: 'Fixture Mockroot', ingredient: LINKED, form: 'testoil' },
    ],
    references: [],
    variants: [
      variantRow('testroot'),
      variantRow('testoil', { toxic: true, safetyNotes: 'Fixture oil caution.' }),
    ],
    ...overrides,
  };
}

const hrefOf: IngredientEntryProps['hrefOf'] = (ingredient) =>
  ingredient.id === LINKED.id ? LINKED_HREF : undefined;

const renderEntry = (props: Partial<IngredientEntryProps> = {}) =>
  render(<IngredientEntry detail={detail()} hrefOf={hrefOf} {...props} />);

/** The formal-name line's value: the definition its term labels. */
function formalValue(): HTMLElement {
  const term = screen.getAllByRole('term')[0]!;
  const definition = term.nextElementSibling as HTMLElement;
  expect(definition).toHaveRole('definition');
  return definition;
}

/** The innermost element holding every one of these: the column they share. */
function sharedColumn(elements: HTMLElement[]): HTMLElement {
  let column = elements[0]!.parentElement!;
  while (!elements.every((el) => column.contains(el))) column = column.parentElement!;
  return column;
}

const precedes = (a: Node, b: Node): boolean =>
  (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe('IngredientEntry', () => {
  it('heads the page with the entry name', () => {
    renderEntry();

    expect(screen.getByRole('heading', { level: 1, name: 'Testwort' })).toBeInTheDocument();
  });

  it.each([
    ['botanical', 'Fixtura testalis', true],
    ['fungal', 'Fixtura fungalis', true],
    ['zoological', 'Fixtura animalis', true],
    ['mineral', 'Fixture spar', false],
    ['chemical', 'Fixture oxide', false],
  ] as const)(
    'labels a %s formal name, in italics only for a binomial',
    (nomenclature, canonicalName, italic) => {
      render(
        <IngredientEntry
          detail={detail({ entry: entryRow({ nomenclature, canonicalName }) })}
          hrefOf={hrefOf}
        />,
      );

      const value = formalValue();
      expect(value).toHaveTextContent(canonicalName);
      expect(value.querySelector('i, em') !== null).toBe(italic);
      expect(formalValue().previousElementSibling?.textContent?.trim()).not.toBe('');
    },
  );

  it('sets an unconfirmed formal name upright, with more than the name beside it', () => {
    render(
      <IngredientEntry
        detail={detail({
          entry: entryRow({ nomenclature: 'unknown', canonicalName: 'Fixtura incerta' }),
        })}
        hrefOf={hrefOf}
      />,
    );

    const value = formalValue();
    expect(value).toHaveTextContent('Fixtura incerta');
    expect(value.textContent!.trim().length).toBeGreaterThan('Fixtura incerta'.length);
    expect(value.querySelector('i, em')).toBeNull();
  });

  it.each([
    ['none', 'none'],
    ['unknown, with no formal name', 'unknown'],
  ] as const)('never leaves the formal name blank for %s', (_, nomenclature) => {
    render(
      <IngredientEntry
        detail={detail({ entry: entryRow({ nomenclature, canonicalName: null }) })}
        hrefOf={hrefOf}
      />,
    );

    expect(formalValue().textContent!.trim()).not.toBe('');
    expect(formalValue().querySelector('i, em')).toBeNull();
  });

  it("badges a coven's own entry Local, and not a compendium entry", () => {
    const { unmount } = render(
      <IngredientEntry
        detail={detail({ entry: entryRow({ workspaceId: COVEN }) })}
        hrefOf={hrefOf}
      />,
    );
    expect(screen.getByText('Local', { exact: true })).toBeInTheDocument();
    unmount();

    renderEntry();
    expect(screen.queryByText('Local', { exact: true })).not.toBeInTheDocument();
  });

  it('marks the entry Toxic when a form is, though the ingredient is not', () => {
    const outsideForms = () =>
      screen
        .queryAllByText('Toxic', { exact: true })
        .filter((mark) => mark.closest('[id^="form-"]') === null);
    const { unmount } = render(
      <IngredientEntry detail={detail({ variants: [variantRow('testroot')] })} hrefOf={hrefOf} />,
    );
    expect(outsideForms()).toHaveLength(0);
    unmount();

    renderEntry();
    expect(outsideForms()).toHaveLength(1);
  });

  it('names its folk names, categories and substitutes lists, one item each', () => {
    renderEntry();
    const details = screen.getByRole('region', { name: 'Details' });

    expect(within(details).getAllByRole('list', { name: 'Folk Names' })).toHaveLength(1);
    expect(
      within(within(details).getByRole('list', { name: 'Folk Names' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(
      within(within(details).getByRole('list', { name: 'Categories' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(
      within(within(details).getByRole('list', { name: 'Substitutes' })).getAllByRole('listitem'),
    ).toHaveLength(3);
  });

  it('sets the correspondences and the three lists in a column of their own, after the text', () => {
    renderEntry({ detail: detail({ entry: entryRow({ safetyNotes: 'A fixture caution.' }) }) });
    const details = screen.getByRole('region', { name: 'Details' });
    const caution = within(details).getByRole('region', { name: 'Caution' });
    const description = within(details).getByText(detail().entry.description!);

    const side = sharedColumn([
      within(details).getByRole('heading', { name: 'Correspondences', level: 3 }),
      within(details).getByRole('list', { name: 'Folk Names' }),
      within(details).getByRole('list', { name: 'Categories' }),
      within(details).getByRole('list', { name: 'Substitutes' }),
    ]);
    // A column inside the section, not the section itself, holding none of the text.
    expect(details).toContainElement(side);
    expect(side).not.toBe(details);
    expect(side).not.toContainElement(caution);
    expect(side).not.toContainElement(description);
    expect(side).not.toContainElement(within(details).getByRole('heading', { level: 2 }));
    // Not a complementary landmark: one per section would be noise.
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    // Read after the text.
    expect(precedes(description, side)).toBe(true);
    expect(precedes(caution, side)).toBe(true);
  });

  it('links a linked substitute to its page, naming the form a form link names, and leaves a typed one as text', () => {
    renderEntry();
    const substitutes = screen.getByRole('list', { name: 'Substitutes' });

    const links = within(substitutes).getAllByRole('link');
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href', LINKED_HREF);
    expect(links[1]).toHaveTextContent('testoil');
    expect(within(substitutes).getByText('Typed Testleaf')).not.toHaveRole('link');
    expect(within(substitutes).getByText('Typed Testleaf').closest('a')).toBeNull();
  });

  it('leaves a linked substitute as text where the caller has no page for it', () => {
    render(<IngredientEntry detail={detail()} hrefOf={() => undefined} />);

    const substitutes = screen.getByRole('list', { name: 'Substitutes' });
    expect(within(substitutes).queryAllByRole('link')).toHaveLength(0);
  });

  it('gives each form a section anchored on its slug, headed by the form, after the details', () => {
    const { container } = renderEntry();

    const root = container.querySelector('#form-testroot')!;
    const oil = container.querySelector('#form-testoil')!;
    expect(root).toHaveRole('region');
    expect(oil).toHaveRole('region');
    expect(within(root as HTMLElement).getByRole('heading', { level: 3 })).toHaveTextContent(
      /testroot/i,
    );
    const oilHeading = within(oil as HTMLElement).getByRole('heading', { level: 3 });
    expect(oilHeading).toHaveTextContent(/testoil/i);
    expect(within(oilHeading).getByText('Toxic', { exact: true })).toBeInTheDocument();
    expect(within(oil as HTMLElement).getByRole('region', { name: 'Caution' })).toBeInTheDocument();

    const details = screen.getByRole('region', { name: 'Details' });
    expect(details.compareDocumentPosition(root) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The forms stand beneath one wrapper, which References follows.
    expect(document.getElementById('forms')).toContainElement(oil as HTMLElement);
  });

  it("still says something in a form's section when the form adds nothing", () => {
    const { container } = renderEntry();

    const root = container.querySelector('#form-testroot') as HTMLElement;
    const heading = within(root).getByRole('heading', { level: 3 });
    expect(root.textContent!.replace(heading.textContent!, '').trim()).not.toBe('');
  });

  it("lists only the rows and lists a form carries in that form's section", () => {
    render(
      <IngredientEntry
        detail={detail({
          variants: [
            {
              ...variantRow('testoil', { zodiacSigns: ['Fixture Sign'] }),
              categories: [category('Oilcraft')],
            },
          ],
        })}
        hrefOf={hrefOf}
      />,
    );

    const oil = screen.getByRole('region', { name: /testoil/i });
    expect(within(oil).getAllByRole('term')).toHaveLength(1);
    expect(within(oil).getByRole('definition')).toHaveTextContent('Fixture Sign');
    expect(within(oil).getAllByRole('list')).toHaveLength(1);
    expect(within(within(oil).getByRole('list')).getAllByRole('listitem')).toHaveLength(1);
    // The form's rows and list share a column apart from its heading.
    const side = sharedColumn([
      within(oil).getByRole('heading', { name: 'Correspondences', level: 4 }),
      within(oil).getByRole('list'),
    ]);
    expect(side).not.toBe(oil);
    expect(side).not.toContainElement(within(oil).getByRole('heading', { level: 3 }));
  });

  it('jumps to the details, each form and the references from the page nav', () => {
    renderEntry();

    const nav = screen.getByRole('navigation', { name: 'On this page' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['#details', '#form-testroot', '#form-testoil', '#references']);
    // The forms are grouped apart from the ingredient's own Details.
    const forms = within(nav).getByRole('list', { name: 'Forms' });
    expect(
      within(forms)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['#form-testroot', '#form-testoil']);
    expect(forms).not.toContainElement(within(nav).getByRole('link', { name: 'Details' }));
  });

  it('draws no page nav when there is no form to jump to', () => {
    render(<IngredientEntry detail={detail({ variants: [] })} hrefOf={hrefOf} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  describe('a coven entry that replaces compendium entries', () => {
    const ALL = '/compendium?query=Fixture%20Wort' as Route;
    const replacing = (
      count: number,
      total = count,
    ): NonNullable<IngredientEntryProps['replaces']> => ({
      tip: 'Fixture reason the entries are shown.',
      entries: Array.from({ length: count }, (_, at) => ({
        title: `Fixture Replaced ${at + 1}`,
        href: `/compendium/ingredients/fixture-replaced-${at + 1}` as Route,
      })),
      total,
      allHref: ALL,
    });
    const block = () => screen.queryByRole('heading', { name: 'In the Compendium' });
    const links = () =>
      within(screen.getByRole('list', { name: 'In the Compendium' })).getAllByRole('link');
    const seeAll = () => screen.queryByRole('link', { name: /^See All 4/ });
    const why = () => screen.queryByRole('button', { name: 'About In the Compendium' });

    it('heads a block of links, each to its entry’s public page by its title, above Correspondences', () => {
      renderEntry({ replaces: replacing(2) });

      expect(links().map((link) => link.getAttribute('href'))).toEqual([
        '/compendium/ingredients/fixture-replaced-1',
        '/compendium/ingredients/fixture-replaced-2',
      ]);
      expect(links()[0]).toHaveAccessibleName(/Fixture Replaced 1/);
      expect(
        precedes(block()!, screen.getAllByRole('heading', { name: 'Correspondences' })[0]!),
      ).toBe(true);
      // It is a block of the side column, not a section of the jump menu.
      expect(screen.queryByRole('link', { name: 'In the Compendium' })).not.toBeInTheDocument();
    });

    it('puts one ⓘ beside the heading, however many entries it links', () => {
      renderEntry({ replaces: replacing(3) });

      expect(screen.getAllByRole('button', { name: 'About In the Compendium' })).toHaveLength(1);
      expect(
        within(block()!.parentElement!).getByRole('button', { name: 'About In the Compendium' }),
      ).toBe(why());
    });

    it('describes the list by the ⓘ’s text, and opens that text when the ⓘ takes focus', () => {
      renderEntry({ replaces: replacing(1) });
      const list = screen.getByRole('list', { name: 'In the Compendium' });
      // The text is in the page while closed, so the list is described without opening it.
      expect(list).toHaveAccessibleDescription(/\S/);
      expect(screen.queryByRole('tooltip', { name: /\S/ })).not.toBeInTheDocument();
      const before = screen.queryAllByRole('tooltip').length;

      act(() => why()!.focus());

      expect(screen.getAllByRole('tooltip')).toHaveLength(before + 1);
    });

    it('links three entries and no See All when it replaces three', () => {
      renderEntry({ replaces: replacing(3) });

      expect(links()).toHaveLength(3);
      expect(seeAll()).not.toBeInTheDocument();
    });

    it('links the first three and a See All to the search for the label when it replaces four', () => {
      renderEntry({ replaces: replacing(3, 4) });

      expect(links()).toHaveLength(3);
      expect(seeAll()).toHaveAttribute('href', ALL);
      // It is the way on to the rest, not a fourth entry: it stands outside the list.
      expect(screen.getByRole('list', { name: 'In the Compendium' })).not.toContainElement(
        seeAll(),
      );
      expect(seeAll()).toHaveAccessibleName(/4/);
    });

    it('shows no block and no ⓘ when the entry replaces nothing', () => {
      renderEntry();

      expect(block()).not.toBeInTheDocument();
      expect(why()).not.toBeInTheDocument();
    });

    it('gives a compendium entry the same block: one link to its public page, the ⓘ, no See All', () => {
      const href = '/compendium/ingredients/testwort-fixtura-testalis' as Route;
      renderEntry({
        replaces: {
          tip: 'Fixture reason the entry is shown.',
          entries: [{ title: 'Testwort (Fixtura testalis)', href }],
          total: 1,
        },
      });

      expect(links().map((link) => link.getAttribute('href'))).toEqual([href]);
      expect(block()).toBeInTheDocument();
      expect(why()).toBeInTheDocument();
      expect(seeAll()).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Compendium Entry' })).not.toBeInTheDocument();
    });
  });

  it('links the entry that moved off this address to where it is now', () => {
    const href = '/compendium/ingredients/fixture-movedwort' as Route;
    const { unmount } = renderEntry();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    unmount();

    renderEntry({ movedAway: { name: 'Fixture Movedwort', href } });
    const notice = screen.getByRole('status');
    expect(within(notice).getByRole('link', { name: 'Fixture Movedwort' })).toHaveAttribute(
      'href',
      href,
    );
  });
});

describe('IngredientEntry references', () => {
  const noteMarks = (region: HTMLElement) =>
    within(region).queryAllByRole('link', { name: /^Note \d+$/ });
  const bibliography = () => screen.getByRole('list', { name: 'Bibliography' });
  const notes = () => screen.getByRole('list', { name: 'Notes' });

  /** The whole sample: two sources on the ingredient, one on the oil form, none on the root form. */
  function sample() {
    const herbal = cited('A Herbal of Testing', 'p. 12');
    const zeta = cited('Zeta Fixtures', null, 'https://fixtures.example/zeta');
    const oil = cited('Oil Fixtures', 'chap. 3');
    renderEntry({
      detail: detail({
        references: [herbal, zeta],
        variants: [{ ...variantRow('testoil'), references: [oil] }, variantRow('testroot')],
      }),
    });
    return { herbal, zeta, oil };
  }

  it('ends each section that cites sources with note numbers that link to their notes, in page order', () => {
    sample();

    const details = noteMarks(screen.getByRole('region', { name: 'Details' }));
    const oil = noteMarks(screen.getByRole('region', { name: /testoil/i }));
    expect(details.map((link) => link.getAttribute('href'))).toEqual(['#note-1', '#note-2']);
    expect(oil.map((link) => link.getAttribute('href'))).toEqual(['#note-3']);
    expect(noteMarks(screen.getByRole('region', { name: /testroot/i }))).toHaveLength(0);
    for (const link of [...details, ...oil]) {
      expect(link.closest('sup')).not.toBeNull();
      expect(document.getElementById(link.getAttribute('href')!.slice(1))).not.toBeNull();
    }
  });

  it('groups a section\x27s numbers under a References label that is not a heading', () => {
    sample();
    const details = screen.getByRole('region', { name: 'Details' });

    const group = within(details).getByRole('group', { name: 'References' });
    expect(within(group).getAllByRole('link')).toHaveLength(2);
    expect(within(details).queryByRole('heading', { name: 'References' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'References' })).toHaveLength(1);
    expect(
      within(screen.getByRole('region', { name: /testoil/i })).getByRole('group', {
        name: 'References',
      }),
    ).toBeInTheDocument();
  });

  it('puts the numbers after the text of their section', () => {
    sample();
    const details = screen.getByRole('region', { name: 'Details' });
    const description = within(details).getByText('A fixture herb.');

    expect(precedes(description, noteMarks(details)[0]!)).toBe(true);
  });

  it('lists one numbered note for each link, in page order, each linking back to its number', () => {
    sample();

    const items = within(notes()).getAllByRole('listitem');
    expect(notes().tagName).toBe('OL');
    expect(items).toHaveLength(3);
    items.forEach((item, at) => {
      expect(item.id).toBe(`note-${at + 1}`);
      const back = within(item).getByRole('link', { name: /^Back to/ });
      const mark = document.getElementById(back.getAttribute('href')!.slice(1));
      expect(mark).toHaveAttribute('href', `#note-${at + 1}`);
    });
    expect(within(items[0]!).getByRole('link', { name: /^Back to Details/ })).toBeInTheDocument();
    expect(within(items[2]!).getByRole('link', { name: /^Back to Testoil/ })).toBeInTheDocument();
  });

  it('gives a source its own note for each locator it is cited with in one section', () => {
    const herbal = cited('A Herbal of Testing', 'p. 12');
    const again = { reference: herbal.reference, locator: 'p. 99' };
    renderEntry({ detail: detail({ references: [herbal, again], variants: [] }) });

    const items = within(notes()).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('p. 12');
    expect(items[1]).toHaveTextContent('p. 99');
    expect(within(bibliography()).getAllByRole('listitem')).toHaveLength(1);
  });

  it("sets a note in short form with its locator, the title in a cite, and links it to the source's entry", () => {
    const { herbal } = sample();

    const [first] = within(notes()).getAllByRole('listitem');
    const entry = within(first!).getByRole('link', { name: /Herbal/ });
    expect(entry).toHaveAttribute('href', `#ref-${herbal.reference.id}`);
    expect(entry.querySelector('cite')?.textContent).toBe('Herbal of Testing');
    expect(first).toHaveTextContent('p. 12');
    const target = document.getElementById(`ref-${herbal.reference.id}`)!;
    expect(bibliography().contains(target)).toBe(true);
    expect(target).toHaveRole('listitem');
  });

  it('closes a note with its locator inside a short quoted title, and without one', () => {
    renderEntry({
      detail: detail({
        references: [{ ...cited('Located Fixtures', 'p. 7', 'https://fixtures.example/a') }],
        variants: [],
      }),
    });

    const text = within(notes()).getByRole('listitem').textContent!;
    expect(text).toMatch(/"Located Fixtures,"\s+p\. 7\./);
  });

  it('lists each source once in the bibliography, in alphabetical order, in full form', () => {
    const herbal = cited('A Herbal of Testing');
    const zeta = cited('Zeta Fixtures');
    const mid = cited('Mid Fixtures');
    renderEntry({
      detail: detail({
        references: [zeta, herbal],
        variants: [
          {
            ...variantRow('testoil'),
            references: [mid, { reference: zeta.reference, locator: null }],
          },
        ],
      }),
    });

    const items = within(bibliography()).getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('cite')?.textContent)).toEqual([
      'A Herbal of Testing',
      'Mid Fixtures',
      'Zeta Fixtures',
    ]);
    expect(within(notes()).getAllByRole('listitem')).toHaveLength(4);
  });

  it('sets only the italic parts of an entry in cite', () => {
    renderEntry({ detail: detail({ references: [cited('A Herbal of Testing')], variants: [] }) });

    const item = within(bibliography()).getByRole('listitem');
    expect(item.querySelectorAll('cite')).toHaveLength(1);
    expect(item.textContent).toContain('Fixture, Ada');
    expect(item.querySelector('cite')?.textContent).not.toContain('Fixture, Ada');
  });

  it('links each entry back to every note that cites it, and each of those reaches the entry', () => {
    const herbal = cited('A Herbal of Testing', 'p. 1');
    renderEntry({
      detail: detail({
        references: [herbal],
        variants: [
          {
            ...variantRow('testoil'),
            references: [{ reference: herbal.reference, locator: 'p. 2' }],
          },
        ],
      }),
    });

    const entry = within(bibliography()).getByRole('listitem');
    const backs = within(entry).getAllByRole('link', { name: /^Back to Note/ });
    expect(backs.map((link) => link.getAttribute('href'))).toEqual(['#note-1', '#note-2']);
    for (const back of backs) {
      const note = document.getElementById(back.getAttribute('href')!.slice(1))!;
      expect(notes().contains(note)).toBe(true);
      expect(within(note).getByRole('link', { name: /Herbal/ })).toHaveAttribute(
        'href',
        `#${entry.id}`,
      );
    }
  });

  it('links a url to its source, opened with rel noopener', () => {
    renderEntry({
      detail: detail({
        references: [cited('Linked Fixtures', null, 'https://fixtures.example/testwort')],
        variants: [],
      }),
    });

    const link = within(bibliography()).getByRole('link', { name: /source/i });
    expect(link).toHaveAttribute('href', 'https://fixtures.example/testwort');
    expect(link.getAttribute('rel')?.split(' ')).toContain('noopener');
  });

  it('links no source for a reference with no url', () => {
    renderEntry({ detail: detail({ references: [cited('Printed Fixtures')], variants: [] }) });

    expect(within(bibliography()).queryByRole('link', { name: /source/i })).not.toBeInTheDocument();
  });

  it('is one section at the foot of the page, after the forms, headed with its parts a level beneath', () => {
    sample();
    const section = screen.getByRole('region', { name: 'References' });

    expect(section).toHaveAttribute('id', 'references');
    expect(precedes(document.getElementById('forms')!, section)).toBe(true);
    expect(section.parentElement!.lastElementChild).toBe(section);
    expect(
      within(section).getByRole('heading', { name: 'References', level: 2 }),
    ).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: 'Notes', level: 3 })).toBeInTheDocument();
    expect(
      within(section).getByRole('heading', { name: 'Bibliography', level: 3 }),
    ).toBeInTheDocument();
    expect(notes()).toHaveAccessibleName('Notes');
  });

  it("leaves no reference in Details' side column or inside a form", () => {
    sample();

    for (const region of [
      screen.getByRole('region', { name: 'Details' }),
      screen.getByRole('region', { name: /testoil/i }),
    ]) {
      expect(
        within(region).queryByRole('heading', { name: /references/i }),
      ).not.toBeInTheDocument();
      expect(region.querySelector('cite')).toBeNull();
    }
  });

  it('shows the section with an empty state, and no lists, when the entry cites nothing', () => {
    renderEntry();
    const section = screen.getByRole('region', { name: 'References' });

    expect(within(section).queryByRole('list')).not.toBeInTheDocument();
    expect(within(section).queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
    expect(section.querySelector('p')).not.toBeNull();
    expect(noteMarks(document.body)).toHaveLength(0);
  });

  it('adds References to the jump menu, after Details and the forms', () => {
    sample();
    const links = within(screen.getByRole('navigation', { name: 'On this page' })).getAllByRole(
      'link',
    );

    expect(links[links.length - 1]).toHaveAttribute('href', '#references');
    expect(links[0]).toHaveAttribute('href', '#details');
  });
});

describe('IngredientEntry edit', () => {
  const PUBLIC = '/compendium/ingredients/testwort-fixtura-testalis';
  const edit = (overrides: Partial<NonNullable<IngredientEntryProps['edit']>> = {}) => ({
    href: `${PUBLIC}?edit` as Route,
    closeHref: PUBLIC as Route,
    deletedHref: '/compendium' as Route,
    ...overrides,
  });
  const opened = { id: '00000000-0000-4000-8000-000000000001', values: EMPTY_VALUES };
  const dialog = () => screen.queryByRole('dialog', { name: /Edit Ingredient/ });

  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
    router.refresh.mockReset();
  });

  it('offers Edit only when given where it goes, and never Delete', () => {
    const { unmount } = renderEntry();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    unmount();

    renderEntry({ edit: edit() });
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', `${PUBLIC}?edit`);
    expect(screen.queryByRole('link', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('opens the dialog on a press of Edit, over a status, while the page with the form is on its way', async () => {
    render(
      <Navigating push={router.push}>
        <IngredientEntry detail={detail()} hrefOf={hrefOf} edit={edit()} />
      </Navigating>,
    );
    expect(dialog()).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Edit' }));
    });

    expect(router.push).toHaveBeenCalledWith(`${PUBLIC}?edit`);
    expect(within(dialog()!).getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Fixture Form' })).not.toBeInTheDocument();
  });

  it('draws the form in a dialog when the page was opened with it, and no dialog otherwise', () => {
    const { unmount } = renderEntry({ edit: edit() });
    expect(dialog()).not.toBeInTheDocument();
    unmount();

    renderEntry({ edit: edit({ opened }) });
    const open = dialog()!;
    expect(open).toBeInTheDocument();
    expect(within(open).getByRole('form', { name: 'Fixture Form' })).toBeInTheDocument();
    expect(within(open).getByRole('status', { name: 'Edited' })).toHaveTextContent(opened.id);
  });

  it('links a near match and a linked substitute to their public pages', () => {
    renderEntry({ edit: edit({ opened }) });

    expect(screen.getByRole('status', { name: 'Duplicate Address' })).toHaveTextContent(
      '/compendium/ingredients/testwort-other',
    );
    expect(screen.getByRole('status', { name: 'Linked Address' })).toHaveTextContent(
      '/compendium/ingredients/testwort-linked',
    );
  });

  it('keeps the dialog open at the address its saved slug now spells', () => {
    renderEntry({ edit: edit({ opened }) });

    fireEvent.click(screen.getByRole('button', { name: 'Fixture Save' }));

    expect(router.replace).toHaveBeenCalledWith('/compendium/ingredients/testwort-renamed?edit');
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps to the page it was given after a save, where the slug is not in the address', () => {
    const savedHref = '/coven/fixture-coven/ingredients/fixture-id?edit' as Route;
    renderEntry({ edit: edit({ opened, savedHref }) });

    fireEvent.click(screen.getByRole('button', { name: 'Fixture Save' }));

    expect(router.replace).toHaveBeenCalledWith(savedHref);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it('leaves the page the entry no longer has once it is deleted', () => {
    renderEntry({ edit: edit({ opened }) });

    fireEvent.click(screen.getByRole('button', { name: 'Fixture Delete' }));

    expect(router.replace).toHaveBeenCalledWith('/compendium');
  });
});
