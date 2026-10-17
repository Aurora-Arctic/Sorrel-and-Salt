import { render, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { describe, expect, it } from 'vitest';
import IngredientEntry from '@/components/IngredientEntry';
import type { IngredientEntryProps } from '@/components/IngredientEntry/types';
import type {
  IngredientRow,
  CategoryDetail,
  IngredientDetail,
  IngredientVariantRow,
  VariantDetail,
} from '@/modules/ingredients';

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
    expect(within(root as HTMLElement).getByRole('heading', { level: 2 })).toHaveTextContent(
      /testroot/i,
    );
    const oilHeading = within(oil as HTMLElement).getByRole('heading', { level: 2 });
    expect(oilHeading).toHaveTextContent(/testoil/i);
    expect(within(oilHeading).getByText('Toxic', { exact: true })).toBeInTheDocument();
    expect(within(oil as HTMLElement).getByRole('region', { name: 'Caution' })).toBeInTheDocument();

    const details = screen.getByRole('region', { name: 'Details' });
    expect(details.compareDocumentPosition(root) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The forms are the last thing drawn, where v2's notes section is appended.
    expect(container.firstElementChild!.lastElementChild).toContainElement(oil as HTMLElement);
  });

  it("still says something in a form's section when the form adds nothing", () => {
    const { container } = renderEntry();

    const root = container.querySelector('#form-testroot') as HTMLElement;
    const heading = within(root).getByRole('heading', { level: 2 });
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
      within(oil).getByRole('heading', { name: 'Correspondences', level: 3 }),
      within(oil).getByRole('list'),
    ]);
    expect(side).not.toBe(oil);
    expect(side).not.toContainElement(within(oil).getByRole('heading', { level: 2 }));
  });

  it('jumps to the details and to each form from the page nav', () => {
    renderEntry();

    const nav = screen.getByRole('navigation', { name: 'On this page' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['#details', '#form-testroot', '#form-testoil']);
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

  it('offers Edit only when given where it goes, and never Delete', () => {
    const { unmount } = renderEntry();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    unmount();

    const href = '/admin/compendium?edit=testwort-fixtura-testalis' as Route;
    renderEntry({ edit: { href } });
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', href);
    expect(screen.queryByRole('link', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('links to the public page when given its address', () => {
    const canonical = '/compendium/ingredients/testwort-fixtura-testalis' as Route;
    const { unmount } = renderEntry();
    expect(
      screen.queryAllByRole('link').filter((link) => link.getAttribute('href') === canonical),
    ).toHaveLength(0);
    unmount();

    renderEntry({ canonical });
    expect(
      screen.getAllByRole('link').filter((link) => link.getAttribute('href') === canonical),
    ).toHaveLength(1);
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
