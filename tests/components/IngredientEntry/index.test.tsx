import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { makeQueryClient } from '@/lib/graphql-client';
import type { ReactElement } from 'react';
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
  default: ({
    entry,
    workspaceId,
    mayPromote,
    onSaved,
    onDeleted,
    duplicateHref,
    entryHref,
  }: IngredientFormProps) => (
    <form aria-label="Fixture Form">
      <output aria-label="Edited">{entry?.id}</output>
      <output aria-label="Written To">{workspaceId ?? 'compendium'}</output>
      <output aria-label="May Promote">{String(Boolean(mayPromote))}</output>
      <output aria-label="Duplicate Address">
        {duplicateHref({ id: 'fixture-other-id', slug: 'testwort-other' } as never)}
      </output>
      <output aria-label="Linked Address">
        {entryHref?.({ slug: 'testwort-linked', isGlobal: true })}
      </output>
      <output aria-label="Own Linked Address">
        {entryHref?.({ slug: 'testwort-own', isGlobal: false }) ?? 'none'}
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

// The page body both entry routes render (
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

/**
 * The status badges that say where an entry lives, Compendium; not the curators' review mark
 * (Needs Review or Reviewed By Curator), which every compendium entry wears and
 * which the review-mark tests below own.
 */
const provenanceMarks = (): (string | null)[] =>
  screen
    .queryAllByRole('status')
    .map((mark) => mark.textContent)
    .filter((text) => !/Review/.test(text ?? ''));

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
    curatorReviewedAt: null,
    description: 'A fixture herb.',
    elements: ['fire'],
    celestialBodies: ['Fixture Moon'],
    zodiacSigns: [],
    colors: null,
    safetyNotes: null,
    toxic: false,
    seedKey: null,
    seedContentHash: null,
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
    retired: false,
    cupboardEntry: null,
    folkNames: ['Fixture Bane', 'Testing Weed'],
    categories: [category('Testwards'), category('Mockcraft')],
    deities: [{ name: 'Fixtura', tradition: 'Fixture Pantheon', otherNames: [] }],
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

/** The Caution badge in the page's head, apart from the Caution notes in the text. */
const headCaution = () =>
  within(screen.getByRole('heading', { level: 1 }).closest('header')!).queryByText('Caution', {
    exact: true,
  });

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
  it('draws the latest edit when given one, and none when not', () => {
    const { unmount } = renderEntry({
      lastEdit: { by: 'Fixture A', at: '2026-09-01T10:30:00.000Z' },
    });
    expect(screen.getByRole('button', { name: /^Edited/ })).toHaveAccessibleDescription(
      /Fixture A/,
    );
    unmount();

    renderEntry({ lastEdit: null });
    expect(screen.queryByRole('button', { name: /^Edited/ })).not.toBeInTheDocument();
  });

  it('heads the page with the entry name', () => {
    renderEntry();

    expect(screen.getByRole('heading', { level: 1, name: 'Testwort' })).toBeInTheDocument();
  });

  // One row for each of the two paths; which kinds are binomials is
  // tests/modules/ingredients/schema/ingredient-enums.test.ts's.
  it.each([
    ['botanical', 'Fixtura testalis', true],
    ['mineral', 'Fixture spar', false],
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

  it('marks a retired entry with a Retired button in its head, and a live one with none', () => {
    const { unmount } = renderEntry();
    expect(screen.queryByRole('button', { name: 'Retired' })).not.toBeInTheDocument();
    unmount();

    renderEntry({ detail: detail({ retired: true }) });
    expect(screen.getByRole('button', { name: 'Retired' }).closest('header')).not.toBeNull();
  });

  it('names its folk names, categories and substitutes lists, one item each', () => {
    renderEntry();
    const details = screen.getByRole('region', { name: 'Details' });
    // Details' side column stands after its section in the body, level with the first section.
    const body = details.parentElement!;

    expect(within(body).getAllByRole('list', { name: 'Folk Names' })).toHaveLength(1);
    expect(
      within(within(body).getByRole('list', { name: 'Folk Names' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(
      within(within(body).getByRole('list', { name: 'Categories' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(
      within(within(body).getByRole('list', { name: 'Substitutes' })).getAllByRole('listitem'),
    ).toHaveLength(3);
  });

  it('says each empty block and correspondence is empty, where the details modal hides them', () => {
    renderEntry({
      detail: detail({
        entry: entryRow({ elements: null, celestialBodies: null, zodiacSigns: null, colors: null }),
        folkNames: [],
        categories: [],
        deities: [],
      }),
    });
    const details = screen.getByRole('region', { name: 'Details' });
    // Details' side column stands after its section in the body, level with the first section.
    const body = details.parentElement!;

    expect(within(body).getByRole('heading', { name: 'Correspondences' })).toBeInTheDocument();
    expect(within(body).getAllByText('None recorded')).toHaveLength(5);
    expect(within(body).getByText('No folk names recorded.')).toBeInTheDocument();
    expect(within(body).getByText('No categories recorded.')).toBeInTheDocument();
  });

  it('links a linked substitute to its page, naming the form a form link names, and leaves a typed one as text', () => {
    renderEntry();
    const substitutes = screen.getByRole('list', { name: 'Substitutes' });

    const links = within(substitutes).getAllByRole('link');
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href', LINKED_HREF);
    expect(links[1]).toHaveTextContent('Testoil');
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

    const nav = screen.getByRole('navigation', { name: 'On This Page' });
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

  describe('a coven entry with no formal name', () => {
    const similar: NonNullable<IngredientEntryProps['similar']> = {
      tip: 'Fixture reason the entries are shown.',
      entries: [1, 2, 3].map((at) => ({
        title: 'Fixture Similar ' + at,
        href: `/compendium/ingredients/fixture-similar-${at}` as Route,
      })),
      total: 5,
      allHref: '/compendium?query=Fixture%20Wort' as Route,
    };
    const list = () => screen.getByRole('list', { name: 'Similar in the Compendium' });

    it('heads a Similar block with a ⓘ, three entries and See All, and offers nothing to do with them', () => {
      renderEntry({ similar });

      expect(
        within(list())
          .getAllByRole('link')
          .map((link) => link.getAttribute('href')),
      ).toEqual([1, 2, 3].map((at) => `/compendium/ingredients/fixture-similar-${at}`));
      expect(screen.getByRole('button', { name: 'About Similar in the Compendium' })).toBeVisible();
      expect(screen.getByRole('link', { name: /^See All 5/ })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'In the Compendium' })).toBeNull();
      // A display only: no radio to choose an entry, no button to link to one.
      expect(screen.queryByRole('radio')).toBeNull();
      expect(within(list()).queryByRole('button')).toBeNull();
      expect(screen.queryByRole('button', { name: /link to/i })).toBeNull();
    });
  });

  it('links the entry that moved off this address to where it is now', () => {
    const href = '/compendium/ingredients/fixture-movedwort' as Route;
    const { unmount } = renderEntry();
    expect(provenanceMarks()).toEqual([]);
    unmount();

    renderEntry({ movedAway: { name: 'Fixture Movedwort', href } });
    const notice = screen
      .getAllByRole('status')
      .find((s) => s.textContent?.includes('Fixture Movedwort'))!;
    expect(within(notice).getByRole('link', { name: 'Fixture Movedwort' })).toHaveAttribute(
      'href',
      href,
    );
  });
});

describe('IngredientEntry back link', () => {
  it('links back to the list it was given, and shows none when it is given none', () => {
    const { unmount } = renderEntry();
    expect(screen.queryByRole('link', { name: /^Back to/ })).not.toBeInTheDocument();
    unmount();

    renderEntry({ back: { href: '/compendium' as Route, label: 'Compendium' } });
    expect(screen.getByRole('link', { name: /^Back to Compendium/ })).toHaveAttribute(
      'href',
      '/compendium',
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

  it('links a url to its source, opened with rel noopener and named as opening a new tab', () => {
    renderEntry({
      detail: detail({
        references: [cited('Linked Fixtures', null, 'https://fixtures.example/testwort')],
        variants: [],
      }),
    });

    // jsdom drops the space before the hidden hint that a browser keeps.
    const link = within(bibliography()).getByRole('link', {
      name: /^Open the Source ?\(opens in a new tab\)$/,
    });
    expect(link).toHaveAttribute('href', 'https://fixtures.example/testwort');
    expect(link.getAttribute('rel')?.split(' ')).toContain('noopener');
  });

  it('links no source for a reference with no url', () => {
    renderEntry({ detail: detail({ references: [cited('Printed Fixtures')], variants: [] }) });

    expect(within(bibliography()).queryByRole('link', { name: /source/i })).not.toBeInTheDocument();
  });

  it('is one section, headed with its parts a level beneath', () => {
    sample();
    const section = screen.getByRole('region', { name: 'References' });

    expect(section).toHaveAttribute('id', 'references');
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

  it('lists Notes and Bibliography under a References group in the jump menu, after Details and the forms', () => {
    sample();
    const nav = screen.getByRole('navigation', { name: 'On This Page' });
    const links = within(nav).getAllByRole('link');
    const group = within(nav).getByRole('list', { name: 'References' });

    expect(links[0]).toHaveAttribute('href', '#details');
    expect(
      within(group)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['#notes', '#bibliography']);
    expect(links.slice(-2)).toEqual(within(group).getAllByRole('link'));
    // The group has the two blocks to jump to, and no link of its own.
    expect(within(nav).queryByRole('link', { name: 'References' })).not.toBeInTheDocument();
    expect(document.getElementById('notes')).toContainElement(
      screen.getByRole('heading', { name: 'Notes' }),
    );
    expect(document.getElementById('bibliography')).toContainElement(
      screen.getByRole('heading', { name: 'Bibliography' }),
    );
  });

  it('keeps References a single link when no source is recorded, as there is nothing under it', () => {
    renderEntry({ detail: detail({ references: [], variants: [variantRow('testoil')] }) });
    const nav = screen.getByRole('navigation', { name: 'On This Page' });
    const links = within(nav).getAllByRole('link');

    expect(links[links.length - 1]).toHaveAttribute('href', '#references');
    expect(within(nav).getByRole('link', { name: 'References' })).toBeInTheDocument();
    expect(within(nav).queryByRole('list', { name: 'References' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Notes' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Bibliography' })).not.toBeInTheDocument();
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
  const dialog = () => screen.queryByRole('dialog', { name: /Edit Compendium Entry/ });

  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
    router.refresh.mockReset();
  });

  it('offers Edit only when given where it goes, and never Delete', () => {
    const { unmount } = renderEntry();
    expect(screen.queryByRole('link', { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
    unmount();

    // A curator in no coven: the compendium's edit is the head's one choice, the pencil named
    // Edit in Compendium and the entry, and no labelled Edit link
    // is left under the name.
    renderEntry({ edit: edit() });
    expect(screen.getByRole('link', { name: 'Edit in Compendium Testwort' })).toHaveAttribute(
      'href',
      `${PUBLIC}?edit`,
    );
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^Edit/ })).toHaveLength(1);
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
      fireEvent.click(screen.getByRole('link', { name: 'Edit in Compendium Testwort' }));
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

  // A coven's own entry: the same dialog, writing to the coven.
  describe("on a coven's own entry", () => {
    const OWN = '/coven/fixture-coven/ingredients/00000000-0000-4000-8000-000000000001';
    const own = () => detail({ entry: entryRow({ workspaceId: COVEN }) });
    const covenEdit = (
      coven: Partial<NonNullable<NonNullable<IngredientEntryProps['edit']>['coven']>> = {},
    ) =>
      edit({
        href: `${OWN}?edit` as Route,
        closeHref: OWN as Route,
        savedHref: OWN as Route,
        opened,
        coven: {
          workspaceId: COVEN,
          ingredientsHref: '/coven/fixture-coven/ingredients' as Route,
          mayPromote: false,

          ...coven,
        },
      });
    const covenDialog = () => screen.getByRole('dialog', { name: /^Edit Ingredient, Testwort/ });
    const shows = (label: string) => within(covenDialog()).getByRole('status', { name: label });
    // The page's Edit menu writes through the query client (`own-actions.tsx`).
    const renderOwn = (ui: ReactElement) =>
      render(<QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>);

    // The icons the list card has: the pencil and the bin.
    it("draws the page's Edit as the pencil beside the name, named for the entry, with the bin and no menu", () => {
      renderOwn(<IngredientEntry detail={own()} hrefOf={hrefOf} edit={covenEdit()} />);

      expect(screen.getByRole('link', { name: 'Edit Testwort' })).toHaveAttribute(
        'href',
        `${OWN}?edit`,
      );
      expect(
        screen.getByRole('button', { name: 'Delete Ingredient Testwort' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it("heads the dialog the page's Edit opens as an ingredient's, writing to the coven", () => {
      renderOwn(<IngredientEntry detail={own()} hrefOf={hrefOf} edit={covenEdit()} />);

      expect(dialog()).not.toBeInTheDocument();
      expect(shows('Written To')).toHaveTextContent(COVEN);
      expect(shows('May Promote')).toHaveTextContent('false');
    });

    it('lets a member promote a folk name when the page says the role may', () => {
      renderOwn(
        <IngredientEntry detail={own()} hrefOf={hrefOf} edit={covenEdit({ mayPromote: true })} />,
      );

      expect(shows('May Promote')).toHaveTextContent('true');
    });

    it('links a near match to its page in the coven, and only a compendium substitute to a page', () => {
      renderOwn(<IngredientEntry detail={own()} hrefOf={hrefOf} edit={covenEdit()} />);

      expect(shows('Duplicate Address')).toHaveTextContent(
        '/coven/fixture-coven/ingredients/fixture-other-id',
      );
      expect(shows('Linked Address')).toHaveTextContent('/compendium/ingredients/testwort-linked');
      expect(shows('Own Linked Address')).toHaveTextContent('none');
    });

    it('closes on a save, going back to the page and fetching it again', () => {
      renderOwn(<IngredientEntry detail={own()} hrefOf={hrefOf} edit={covenEdit()} />);

      fireEvent.click(within(covenDialog()).getByRole('button', { name: 'Fixture Save' }));

      expect(router.replace).toHaveBeenCalledWith(OWN);
      expect(router.refresh).toHaveBeenCalledTimes(1);
    });
  });
});

// The three kinds of entry on a coven's page: the coven's own, the
// compendium's held in its cupboard, and the compendium's not held.
describe("IngredientEntry's review mark (M14.8)", () => {
  it('says a compendium entry needs review, to a visitor with no account', () => {
    renderEntry();

    expect(screen.getByText('Needs Review', { exact: true })).toBeInTheDocument();
  });

  it('says when a curator reviewed it, and names no one', () => {
    const reviewed = detail({
      entry: entryRow({ curatorReviewedAt: new Date('2026-10-01T09:30:00.000Z') }),
    });
    renderEntry({ detail: reviewed });

    const badge = screen.getByText(/Reviewed By Curator/);
    expect(badge.querySelector('time')).toHaveAttribute('datetime', '2026-10-01T09:30:00.000Z');
    expect(screen.queryByText('Needs Review', { exact: true })).toBeNull();
  });
});

describe('IngredientEntry on a coven page', () => {
  const held = (overrides: Partial<NonNullable<IngredientDetail['cupboardEntry']>> = {}) =>
    ({
      id: nextId(),
      workspaceId: COVEN,
      ingredientId: '00000000-0000-4000-8000-000000000001',
      label: null,
      description: null,
      safetyNotes: null,
      elements: null,
      celestialBodies: null,
      zodiacSigns: null,
      colors: null,
      ...STAMPS,
      ...overrides,
    }) as NonNullable<IngredientDetail['cupboardEntry']>;

  /** What a correspondence row lists: the definition beside its term. */
  const rowOf = (term: string): string =>
    screen.getByText(term, { selector: 'dt' }).nextElementSibling!.textContent!;

  it('shows the merged values of an annotated compendium entry, marked Annotated', () => {
    renderEntry({
      detail: detail({
        cupboardEntry: held({
          label: 'Hedgewort',
          elements: ['water'],
          celestialBodies: [],
        }),
      }),
    });

    // A set label heads the page; the compendium's name is not repeated
    // beneath it, as In the Compendium links the entry by it.
    expect(screen.getByRole('heading', { level: 1, name: 'Hedgewort' })).toBeInTheDocument();
    expect(screen.queryByText('Testwort', { exact: true })).not.toBeInTheDocument();
    // A null description falls back to the compendium's.
    expect(screen.getByText('A fixture herb.')).toBeInTheDocument();
    // A set list stands over the compendium's; an empty one shows as cleared.
    expect(rowOf('Elements')).toBe('Water');
    expect(rowOf('Celestial Bodies')).not.toBe('Fixture Moon');
    expect(screen.queryByText('Fixture Moon')).not.toBeInTheDocument();
    // Annotated stands in place of Compendium; a
    // compendium entry is never Local. The next test is the precondition: held and
    // unannotated, it shows Compendium.
    expect(screen.getByRole('button', { name: 'Annotated' })).toBeInTheDocument();
    expect(screen.queryByText('Compendium', { exact: true })).toBeNull();
    expect(provenanceMarks()).toEqual([]);
    expect(screen.queryByText('Local', { exact: true })).not.toBeInTheDocument();
  });

  it('marks a compendium entry held with no override, but not annotated or relabelled', () => {
    renderEntry({ detail: detail({ cupboardEntry: held() }) });

    expect(screen.getByRole('heading', { level: 1, name: 'Testwort' })).toBeInTheDocument();
    expect(provenanceMarks()).toEqual(['Compendium']);
    expect(screen.getAllByText('Testwort')).toHaveLength(1);
    expect(screen.queryByText('Local', { exact: true })).not.toBeInTheDocument();
  });

  it("marks Caution for the coven's own notes on a compendium entry that has none", () => {
    const quiet = { variants: [variantRow('testroot')] };
    const { unmount } = renderEntry({ detail: detail({ ...quiet, cupboardEntry: held() }) });
    expect(headCaution()).toBeNull();
    unmount();

    renderEntry({
      detail: detail({ ...quiet, cupboardEntry: held({ safetyNotes: 'Fixture coven caution.' }) }),
    });
    expect(headCaution()).not.toBeNull();
  });

  it('renders a compendium entry the coven does not hold with neither mark', () => {
    renderEntry();

    expect(provenanceMarks()).toEqual([]);
    expect(screen.queryByText('Local', { exact: true })).not.toBeInTheDocument();
  });

  it("leaves a coven's own entry Local and unmarked as the compendium's", () => {
    renderEntry({ detail: detail({ entry: entryRow({ workspaceId: COVEN }) }) });

    expect(screen.getByText('Local', { exact: true })).toBeInTheDocument();
    expect(provenanceMarks()).toEqual([]);
  });
});

// The public page's shelf: a compendium entry any of the viewer's covens holds carries
// In Your Cupboard before its name, as it does on the coven's own page.
describe('IngredientEntry on the public page, held in a coven', () => {
  const shelf = () => screen.queryByRole('button', { name: 'In Your Cupboard' });

  // The owner's call, 2026-10-20: a press opens the shelf's tip, as a tap does on InfoTip's ⓘ,
  // so it shows on touch. A click here focuses nothing, so the press alone opens it.
  it('opens the In Your Cupboard tip when the shelf is pressed', () => {
    renderEntry({ heldInCovens: true });
    const mark = shelf()!;
    const tips = () =>
      screen.queryAllByRole('tooltip', { hidden: true }).map((tip) => tip.textContent);
    expect(tips()).not.toContain('In Your Cupboard');

    fireEvent.click(mark);
    expect(mark).not.toHaveFocus();
    expect(tips()).toContain('In Your Cupboard');
  });

  it('puts no shelf on a compendium entry no coven of the viewer’s holds', () => {
    renderEntry({ heldInCovens: false });

    expect(screen.getByRole('heading', { level: 1, name: 'Testwort' })).toBeInTheDocument();
    expect(shelf()).toBeNull();
  });
});

describe('IngredientEntry recency (MB.106)', () => {
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  it('marks a compendium entry created lately New', () => {
    renderEntry({ detail: detail({ entry: entryRow({ createdAt: daysAgo(2) }) }) });

    expect(screen.getByText('New', { exact: true })).toBeInTheDocument();
  });

  it("marks neither on a coven's own entry, however new", () => {
    renderEntry({
      detail: detail({ entry: entryRow({ workspaceId: COVEN, createdAt: daysAgo(1) }) }),
    });

    expect(screen.queryByText('New', { exact: true })).toBeNull();
    expect(screen.queryByText('Updated', { exact: true })).toBeNull();
  });
});

describe('IngredientEntry stock (M12.29)', () => {
  // The fixture's two forms, by id, so a jar can name one.
  const variants = [variantRow('testroot'), variantRow('testoil')];
  const [root, oil] = variants.map(({ variant }) => variant.id) as [string, string];
  const forms = [
    { variantId: root, label: 'Testroot' },
    { variantId: oil, label: 'Testoil' },
  ];
  const jar = (
    variantId: string,
    quantity: number | null,
    threshold: number | null = null,
    unit: string | null = 'g',
  ) => ({ id: nextId(), variantId, quantity, unit, threshold });

  const renderStock = (
    jars: ReturnType<typeof jar>[],
    mayEdit = true,
    overrides: Partial<IngredientDetail> = {},
  ) =>
    renderEntry({
      detail: detail({ entry: entryRow({ workspaceId: COVEN }), variants, ...overrides }),
      stock: { workspaceId: COVEN, forms, jars, mayEdit },
    });

  const section = () => screen.getByRole('region', { name: 'Stock' });
  // The heading's button, by the dialog's own name; a jar's is that name and then its form.
  const HEADING_BUTTON = 'Edit Stock, Testwort, Fixtura testalis';
  const headingButton = () => within(section()).getByRole('button', { name: HEADING_BUTTON });
  const jarButton = (form: string) =>
    within(section()).queryByRole('button', { name: `${HEADING_BUTTON}, ${form}` });
  const dialog = () => screen.getByRole('dialog', { name: HEADING_BUTTON });
  const lineOf = (form: string): HTMLElement =>
    within(section())
      .getAllByRole('listitem')
      .find((item) => item.textContent!.trim().startsWith(form))!;

  it('shelves one jar per form, each naming its form and its amount, Unmeasured, or No Jar', () => {
    renderStock([jar(root, 250)]);
    expect(within(section()).getByRole('list', { name: 'Jars' })).toBeInTheDocument();
    expect(within(section()).getAllByRole('listitem')).toHaveLength(2);
    expect(lineOf('Testroot')).toHaveTextContent('250 g');
    expect(lineOf('Testoil')).toHaveTextContent('No Jar');
  });

  it('puts Stock first, above Details, in the page and in the jump menu (MB.121)', () => {
    renderStock([jar(root, 250)]);

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings.slice(0, 3)).toEqual(['Stock', 'Details', 'Forms']);

    const nav = screen.getByRole('navigation', { name: 'On This Page' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
        .slice(0, 2),
    ).toEqual(['#stock', '#details']);
  });

  it('leaves Details first when the entry shows no Stock section', () => {
    renderEntry();

    expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Details');
    const nav = screen.getByRole('navigation', { name: 'On This Page' });
    expect(within(nav).getAllByRole('link')[0]).toHaveAttribute('href', '#details');
  });

  const shelfOrder = () =>
    within(section())
      .getAllByRole('listitem')
      .map((item) => (item.textContent!.trim().startsWith('Testroot') ? 'Testroot' : 'Testoil'));

  it('shelves a form with no jar after every form with one, and a jar holding 0 keeps its place', () => {
    // The forms' order is Testroot, Testoil. Only Testoil is held, so it goes first.
    const { unmount } = renderStock([jar(oil, 250)]);
    expect(shelfOrder()).toEqual(['Testoil', 'Testroot']);
    unmount();

    // Testroot is out (0 held) and Testoil has none: Testroot is still a jar, so it stays first.
    renderStock([jar(root, 0, 50)]);
    expect(shelfOrder()).toEqual(['Testroot', 'Testoil']);
  });

  it('writes a jar with no amount Unmeasured', () => {
    renderStock([jar(root, 250), jar(oil, null, null, null)]);

    expect(lineOf('Testoil')).toHaveTextContent('Unmeasured');
  });

  it('gives a low jar a Low Stock button on its amount, an empty one an Out of Stock button, and a full or unmeasured one neither', () => {
    // A jar for each state needs four forms.
    const four = [...variants, variantRow('testleaf'), variantRow('testbark')];
    const [, , leaf, bark] = four.map(({ variant }) => variant.id) as string[];
    renderEntry({
      detail: detail({ entry: entryRow({ workspaceId: COVEN }), variants: four }),
      stock: {
        workspaceId: COVEN,
        forms: [
          ...forms,
          { variantId: leaf!, label: 'Testleaf' },
          { variantId: bark!, label: 'Testbark' },
        ],
        jars: [jar(root, 5, 10), jar(oil, 0, 10), jar(leaf!, 50, 10), jar(bark!, null, 10, null)],
        mayEdit: false,
      },
    });

    const badge = (form: string, name: RegExp) =>
      within(lineOf(form)).queryByRole('button', { name });
    expect(badge('Testroot', /, Low Stock$/)).toBeInTheDocument();
    expect(badge('Testroot', /, Out of Stock$/)).toBeNull();
    expect(badge('Testoil', /, Out of Stock$/)).toBeInTheDocument();
    expect(badge('Testoil', /, Low Stock$/)).toBeNull();
    for (const form of ['Testleaf', 'Testbark']) {
      expect(within(lineOf(form)).queryByRole('button')).toBeNull();
    }
  });

  it('carries Edit Stock in the heading for a role that may edit, and none for one that may not', () => {
    const { unmount } = renderStock([jar(root, 250)]);
    expect(headingButton()).toBeInTheDocument();
    unmount();

    renderStock([jar(root, 250)], false);
    // The jars are there, so the button's absence is the role's.
    expect(within(section()).getAllByRole('listitem')).toHaveLength(2);
    expect(within(section()).queryByRole('button', { name: /^Edit Stock/ })).toBeNull();
  });

  it('opens the Edit Stock dialog from the heading', () => {
    renderStock([jar(root, 250)]);

    fireEvent.click(headingButton());

    expect(dialog()).toBeInTheDocument();
  });

  it('opens the dialog on a jar’s form when the jar is pressed', () => {
    renderStock([jar(root, 250), jar(oil, 40)]);

    fireEvent.click(jarButton('Testoil')!);

    const open = within(dialog());
    expect(open.getByRole('button', { name: /^Testoil\b/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(open.getByRole('button', { name: /^Testroot\b/ })).not.toHaveAttribute('aria-current');
  });

  it('adds the form and chooses it, with nothing to save yet, when an empty jar is pressed', () => {
    renderStock([jar(root, 250)]);

    fireEvent.click(jarButton('Testoil')!);

    const open = within(dialog());
    expect(open.getByRole('button', { name: /^Testoil\b/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(open.getByRole('spinbutton', { name: 'Quantity, Testoil' })).toHaveValue(null);
    // The new row is a place to fill, not a change, so Save is off.
    expect(open.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('gives a role that may not edit plain jars with no button', () => {
    renderStock([jar(root, 250)], false);

    expect(jarButton('Testroot')).toBeNull();
    expect(jarButton('Testoil')).toBeNull();
    expect(lineOf('Testroot')).toHaveTextContent('250 g');
  });

  it('says no stock is recorded where the entry has no form, with Edit Stock still offered', () => {
    renderStock([], true, { variants: [] });

    expect(within(section()).queryByRole('listitem')).toBeNull();
    expect(within(section()).getByText('No stock recorded.')).toBeInTheDocument();
    expect(headingButton()).toBeInTheDocument();
  });

  it('draws no Stock section without stock, as for a compendium entry the coven does not hold', () => {
    renderEntry();

    expect(screen.queryByRole('region', { name: 'Stock' })).toBeNull();
    const nav = screen.getByRole('navigation', { name: 'On This Page' });
    expect(within(nav).queryByRole('link', { name: 'Stock' })).toBeNull();
  });
});
