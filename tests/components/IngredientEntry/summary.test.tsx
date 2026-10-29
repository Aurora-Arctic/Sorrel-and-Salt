import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import IngredientSummary from '@/components/IngredientEntry/summary';
import type { CategoryDetail, IngredientDetail, VariantDetail } from '@/modules/ingredients';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { entryDetail } from '../../support/entry-detail';

// The details modal's body (claude-docs/components/ingredient-entry.md, "The details modal"): the entry page's Details section cut down to the caution, categories, folk names and correspondences, drawn by the page's own blocks.
// Every value is the test's own data, so finding one proves what rendered.

const STAMPS = {
  createdAt: new Date('2026-01-01T00:00:00Z'),
  createdBy: '00000000-0000-4000-8000-0000000000aa',
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  updatedBy: '00000000-0000-4000-8000-0000000000aa',
  deletedAt: null,
  deletedBy: null,
};

const category = (id: string, name: string): CategoryDetail => ({
  category: {
    id,
    name,
    slug: id,
    description: 'A fixture category.',
    seedKey: null,
    groupId: 'g',
    ...STAMPS,
  },
  group: {
    id: 'g',
    name: 'Fixture Wards',
    slug: 'fixture-wards',
    description: 'A fixture group.',
    seedKey: null,
    colorDark: '#88aacc',
    colorLight: '#335577',
    ...STAMPS,
  },
});

const variant = (form: string, safetyNotes: string | null): VariantDetail => ({
  variant: {
    id: `variant-${form}`,
    ingredientId: '00000000-0000-4000-8000-000000000001',
    workspaceId: null,
    form,
    formId: null,
    description: null,
    safetyNotes,
    toxic: false,
    elements: null,
    celestialBodies: null,
    zodiacSigns: null,
    colors: null,
    ...STAMPS,
  },
  icon: null,
  categories: [],
  substitutes: [{ name: 'Fixture Formswap', ingredient: null, form: null }],
  references: [],
});

/** A full entry: notes on it and on one form, and something in every block. */
function full(overrides: Partial<IngredientDetail> = {}): IngredientDetail {
  const base = entryDetail({
    description: 'A fixture description.',
    safetyNotes: 'Fixture entry caution.',
    elements: ['fire'],
    celestialBodies: ['Fixture Moon'],
  });
  return {
    ...base,
    folkNames: ['Fixture Bane'],
    categories: [category('c1', 'Testwards')],
    deities: [{ name: 'Fixtura', tradition: 'Fixture Pantheon', otherNames: [] }],
    substitutes: [{ name: 'Fixture Swapleaf', ingredient: null, form: null }],
    variants: [variant('testoil', 'Fixture oil caution.'), variant('testroot', null)],
    ...overrides,
  };
}

/** What a correspondence row lists: the definition beside its term. */
const rowOf = (term: string): string =>
  screen.getByText(term, { selector: 'dt' }).nextElementSibling!.textContent!;

describe('IngredientSummary', () => {
  it('shows the caution, the categories, the folk names and the correspondences', () => {
    render(<IngredientSummary detail={full()} />);

    const caution = screen.getByRole('region', { name: 'Caution' });
    expect(within(caution).getByText('Fixture entry caution.')).toBeInTheDocument();
    // The entry's own notes only: a form's stay on the page's form sections.
    expect(screen.queryByText('Fixture oil caution.')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Categories' })).getByText('Testwards'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Folk Names' })).getByText('Fixture Bane'),
    ).toBeInTheDocument();
    expect(rowOf('Celestial Bodies')).toBe('Fixture Moon');
    expect(rowOf('Deities')).toBe('Fixtura (Fixture Pantheon)');
  });

  // A curated deity's other names follow its tradition, so a reader
  // who knows it by another name finds it; a typed name has none to show.
  it('names each deity with its tradition and its other names', () => {
    render(
      <IngredientSummary
        detail={full({
          deities: [
            { name: 'Fixtura', tradition: 'Fixture Pantheon', otherNames: ['Fixtra', 'Testura'] },
            { name: 'Mockis', tradition: null, otherNames: ['Mockon'] },
            { name: 'Testis', tradition: null, otherNames: [] },
          ],
        })}
      />,
    );

    expect(rowOf('Deities')).toBe(
      'Fixtura (Fixture Pantheon; also called Fixtra, Testura), Mockis (also called Mockon), Testis',
    );
  });

  it('names the forms that carry a caution of their own, and no form when none does', () => {
    const { unmount } = render(<IngredientSummary detail={full()} />);
    // The form with notes is named, inside the caution, so the two read as one
    // warning; the one without is not. Within the caution: the Forms block names both.
    const caution = screen.getByRole('region', { name: 'Caution' });
    expect(within(caution).getByText(new RegExp(formLabel('testoil')))).toBeInTheDocument();
    expect(within(caution).queryByText(new RegExp(formLabel('testroot')))).not.toBeInTheDocument();
    unmount();

    render(
      <IngredientSummary
        detail={full({ variants: [variant('testoil', null), variant('testroot', '  ')] })}
      />,
    );
    // Why it could show: the entry still has forms, and its own caution.
    const own = screen.getByRole('region', { name: 'Caution' });
    expect(within(own).queryByText(new RegExp(formLabel('testoil')))).not.toBeInTheDocument();
  });

  it("draws the caution for a form's alone, naming the form, when the entry has none of its own", () => {
    render(<IngredientSummary detail={full({ entry: entryDetail().entry })} />);

    const caution = screen.getByRole('region', { name: 'Caution' });
    expect(within(caution).getByText(new RegExp(formLabel('testoil')))).toBeInTheDocument();
    expect(within(caution).queryByText('Fixture entry caution.')).not.toBeInTheDocument();
  });

  it('shows the description first, above the caution', () => {
    render(<IngredientSummary detail={full()} />);

    const description = screen.getByText('A fixture description.');
    const caution = screen.getByRole('region', { name: 'Caution' });
    expect(
      description.compareDocumentPosition(caution) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows the coven's description laid over a held compendium entry's", () => {
    render(
      <IngredientSummary
        detail={full({
          cupboardEntry: {
            id: 'held',
            workspaceId: '00000000-0000-4000-8000-0000000000c1',
            ingredientId: '00000000-0000-4000-8000-000000000001',
            label: null,
            description: 'Fixture coven description.',
            safetyNotes: null,
            elements: null,
            celestialBodies: null,
            zodiacSigns: null,
            colors: null,
            ...STAMPS,
          } as NonNullable<IngredientDetail['cupboardEntry']>,
        })}
      />,
    );

    expect(screen.getByText('Fixture coven description.')).toBeInTheDocument();
    expect(screen.queryByText('A fixture description.')).not.toBeInTheDocument();
  });

  it('draws no description when the entry has none, and no line saying so', () => {
    render(
      <IngredientSummary detail={full({ entry: entryDetail({ description: '  ' }).entry })} />,
    );

    // Why it could show: the summary is drawn, with its caution from a form.
    expect(screen.getByRole('region', { name: 'Caution' })).toBeInTheDocument();
    expect(screen.queryByText('A fixture herb.')).not.toBeInTheDocument();
    expect(screen.queryByText('No description recorded.')).not.toBeInTheDocument();
  });

  it('leaves out the substitutes, the references and Similar', () => {
    render(<IngredientSummary detail={full()} />);

    // Why they could show: the detail carries substitutes, its own and a form's, and the
    // summary is drawn. No Details heading: the dialog's title names the entry.
    expect(screen.getByRole('heading', { name: 'Correspondences' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Substitutes' })).not.toBeInTheDocument();
    expect(screen.queryByText('Fixture Swapleaf')).not.toBeInTheDocument();
    expect(screen.queryByText('Fixture Formswap')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'References' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Similar in the Compendium' }),
    ).not.toBeInTheDocument();
  });

  it("shows a held compendium entry with the coven's annotations laid over it", () => {
    render(
      <IngredientSummary
        detail={full({
          cupboardEntry: {
            id: 'held',
            workspaceId: '00000000-0000-4000-8000-0000000000c1',
            ingredientId: '00000000-0000-4000-8000-000000000001',
            label: 'Hedgewort',
            description: null,
            safetyNotes: 'Fixture coven caution.',
            elements: null,
            celestialBodies: ['Fixture Sun'],
            zodiacSigns: null,
            colors: null,
            ...STAMPS,
          } as NonNullable<IngredientDetail['cupboardEntry']>,
        })}
      />,
    );

    const caution = screen.getByRole('region', { name: 'Caution' });
    expect(within(caution).getByText('Fixture coven caution.')).toBeInTheDocument();
    expect(within(caution).queryByText('Fixture entry caution.')).not.toBeInTheDocument();
    expect(rowOf('Celestial Bodies')).toBe('Fixture Sun');
  });

  it("draws no caution and no empty block for a sparse entry: no 'None recorded', no empty heading", () => {
    render(
      <IngredientSummary
        detail={full({
          entry: entryDetail({ description: null, elements: null, celestialBodies: null }).entry,
          folkNames: [],
          categories: [],
          deities: [],
          variants: [],
        })}
      />,
    );

    // The page says each of these is empty (the IngredientEntry tests); the modal hides them.
    expect(screen.queryByRole('region', { name: 'Caution' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Correspondences' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Folk Names' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Categories' })).not.toBeInTheDocument();
    // One line says so, so the body is not left blank.
    expect(screen.getByText('Nothing recorded yet.')).toBeInTheDocument();
    expect(screen.queryByText('None recorded')).not.toBeInTheDocument();
  });

  it('says nothing is recorded only when every section is empty', () => {
    const { unmount } = render(<IngredientSummary detail={full()} />);
    expect(screen.queryByText('Nothing recorded yet.')).not.toBeInTheDocument();
    unmount();

    // A caution alone is something recorded.
    const { unmount: unmount2 } = render(
      <IngredientSummary
        detail={full({
          folkNames: [],
          categories: [],
          deities: [],
          variants: [],
          entry: entryDetail({ safetyNotes: 'Fixture lone caution.' }).entry,
        })}
      />,
    );
    expect(screen.getByRole('region', { name: 'Caution' })).toBeInTheDocument();
    expect(screen.queryByText('Nothing recorded yet.')).not.toBeInTheDocument();
    unmount2();

    // So is a description alone.
    render(
      <IngredientSummary
        detail={full({
          folkNames: [],
          categories: [],
          deities: [],
          variants: [],
          entry: entryDetail({ description: 'Fixture lone description.' }).entry,
        })}
      />,
    );
    expect(screen.getByText('Fixture lone description.')).toBeInTheDocument();
    expect(screen.queryByText('Nothing recorded yet.')).not.toBeInTheDocument();
  });

  it("keeps a block's filled rows and drops its empty ones", () => {
    render(<IngredientSummary detail={full({ folkNames: [], deities: [] })} />);

    // Why the rows could show: the entry has elements and celestial bodies, and the
    // block draws those two.
    expect(rowOf('Elements')).toBe('Fire');
    expect(rowOf('Celestial Bodies')).toBe('Fixture Moon');
    for (const term of ['Zodiac Signs', 'Colours', 'Deities']) {
      expect(screen.queryByText(term, { selector: 'dt' })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('heading', { name: 'Folk Names' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
  });

  describe('a long description', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    /** The paragraph's measured overflow: happy-dom lays nothing out, so its height and its line height (six of which are the cut) are the test's. */
    function measures(scrollHeight: number, lineHeight = 24): void {
      vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
      const real = window.getComputedStyle.bind(window);
      // Everything else still reads the real style (the role queries need it); only
      // the two figures this component measures are the test's.
      vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
        const style = real(element, pseudo);
        return new Proxy(style, {
          get(target, key) {
            if (key === 'lineHeight') return `${lineHeight}px`;
            if (key === 'transitionDuration') return '0s';
            const value = Reflect.get(target, key) as unknown;
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      });
    }

    it('is cut to its first lines, Show More opening the rest and Show Less closing it', () => {
      measures(200);
      const before = window.location.href;
      render(<IngredientSummary detail={full()} />);

      const more = screen.getByRole('button', { name: 'Show More' });
      const description = screen.getByText('A fixture description.');
      expect(more).toHaveAttribute('aria-expanded', 'false');
      expect(more).toHaveAttribute('aria-controls', description.id);
      expect(description.id).not.toBe('');

      fireEvent.click(more);
      const less = screen.getByRole('button', { name: 'Show Less' });
      expect(less).toHaveAttribute('aria-expanded', 'true');
      // Open, the region it controls holds the whole text.
      expect(document.getElementById(less.getAttribute('aria-controls') ?? '')).toHaveTextContent(
        'A fixture description.',
      );
      // Opening it stays in the modal: the address is unchanged.
      expect(window.location.href).toBe(before);

      fireEvent.click(less);
      expect(screen.getByRole('button', { name: 'Show More' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    it('is one button the whole way, so a press leaves the focus on it', () => {
      measures(200);
      render(<IngredientSummary detail={full()} />);

      const bar = screen.getByRole('button', { name: 'Show More' });
      bar.focus();
      fireEvent.click(bar);
      expect(screen.getByRole('button', { name: 'Show Less' })).toBe(bar);
      expect(bar).toHaveFocus();

      fireEvent.click(bar);
      expect(screen.getByRole('button', { name: 'Show More' })).toBe(bar);
      expect(bar).toHaveFocus();
    });

    it('shows a description of six lines or fewer whole, with no toggle', () => {
      measures(145);
      render(<IngredientSummary detail={full()} />);

      // Why it could show: the description is drawn.
      expect(screen.getByText('A fixture description.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Show More' })).not.toBeInTheDocument();
    });

    it('shows a seventh line behind the toggle', () => {
      measures(146);
      render(<IngredientSummary detail={full()} />);

      expect(screen.getByRole('button', { name: 'Show More' })).toBeInTheDocument();
    });
  });

  describe("in the viewer's covens", () => {
    const covens = [
      { id: 'w1', slug: 'fixture-coven', name: 'Fixture Coven' },
      { id: 'w2', slug: 'second-fixture', name: 'Second Fixture' },
    ];
    const ENTRY = entryDetail().entry.id;

    it("links the entry in each coven that holds it, by the coven's name, after the categories", () => {
      render(<IngredientSummary detail={full()} covens={covens} />);

      const list = screen.getByRole('list', { name: 'In Your Cupboards' });
      expect(within(list).getByRole('link', { name: 'Fixture Coven' })).toHaveAttribute(
        'href',
        `/coven/fixture-coven/ingredients/${ENTRY}`,
      );
      expect(within(list).getByRole('link', { name: 'Second Fixture' })).toHaveAttribute(
        'href',
        `/coven/second-fixture/ingredients/${ENTRY}`,
      );
      // The last block: the categories come before it in the document.
      const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
      expect(headings[headings.length - 1]).toBe('In Your Cupboards');
      expect(headings).toContain('Categories');
    });

    it("draws no block when none of the viewer's covens holds it, or for a visitor", () => {
      const { unmount } = render(<IngredientSummary detail={full()} covens={[]} />);
      // Why it could show: the body still draws its other blocks.
      expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'In Your Cupboards' })).not.toBeInTheDocument();
      unmount();

      render(<IngredientSummary detail={full()} />);
      expect(screen.queryByRole('heading', { name: 'In Your Cupboards' })).not.toBeInTheDocument();
    });

    it("draws no block for a coven's own entry, which only its coven holds", () => {
      render(
        <IngredientSummary
          detail={full({ entry: entryDetail({ workspaceId: 'w1' }).entry })}
          covens={covens}
        />,
      );
      expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'In Your Cupboards' })).not.toBeInTheDocument();
    });

    it('still says nothing is recorded of an empty entry, with the covens that hold it beneath', () => {
      render(
        <IngredientSummary
          detail={full({
            entry: entryDetail({ description: null, elements: null, celestialBodies: null }).entry,
            folkNames: [],
            categories: [],
            deities: [],
            variants: [],
          })}
          covens={covens}
        />,
      );
      // The links are where the entry is held, not something recorded of it.
      expect(screen.getByText('Nothing recorded yet.')).toBeInTheDocument();
      expect(
        within(screen.getByRole('list', { name: 'In Your Cupboards' })).getAllByRole('link'),
      ).toHaveLength(2);
    });
  });
  describe('the forms', () => {
    const lineOf = (form: string): HTMLElement =>
      within(screen.getByRole('list', { name: 'Forms' }))
        .getAllByRole('listitem')
        .find((item) => item.textContent!.trim().startsWith(formLabel(form)))!;

    it('names each form the entry comes in, after the caution, and nothing of stock without jars', () => {
      render(<IngredientSummary detail={full()} />);

      const items = within(screen.getByRole('list', { name: 'Forms' })).getAllByRole('listitem');
      expect(items.map((item) => item.textContent!.trim())).toEqual([
        formLabel('testoil'),
        formLabel('testroot'),
      ]);
      // A compendium page passes no jars: no quantity, no stock state, no badge.
      expect(screen.queryByText(/Unmeasured|Not Stocked/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Stock/ })).not.toBeInTheDocument();
      // After the caution in the document, so also after the description.
      const caution = screen.getByRole('region', { name: 'Caution' });
      expect(
        caution.compareDocumentPosition(screen.getByRole('heading', { name: 'Forms' })) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("shows each form's jar with jars: its quantity or Unmeasured, and its badge; a form in no jar is Not Stocked to a screen reader", () => {
      render(
        <IngredientSummary
          detail={full({
            variants: [
              variant('testoil', null),
              variant('testroot', null),
              variant('testbark', null),
              variant('testseed', null),
            ],
          })}
          jars={[
            { variantId: 'variant-testoil', quantity: 3, unit: 'ml', threshold: 5 },
            { variantId: 'variant-testbark', quantity: null, unit: null, threshold: null },
            { variantId: 'variant-testseed', quantity: 0, unit: 'g', threshold: null },
          ]}
        />,
      );

      const oil = lineOf('testoil');
      expect(oil).toHaveTextContent('3 ml');
      expect(within(oil).getByRole('button', { name: 'Low Stock' })).toBeInTheDocument();
      expect(lineOf('testbark')).toHaveTextContent('Unmeasured');
      expect(within(lineOf('testbark')).queryByRole('button')).not.toBeInTheDocument();
      const seed = lineOf('testseed');
      expect(seed).toHaveTextContent('0 g');
      expect(within(seed).getByRole('button', { name: 'Out of Stock' })).toBeInTheDocument();
      // No jar: the coven holds the form in no jar, which is not out of stock. Nothing shows
      // on screen, but the line's text, which a screen reader
      // reads, still says so.
      const root = lineOf('testroot');
      expect(within(root).getByText('Not Stocked')).toBeInTheDocument();
      expect(within(root).queryByRole('button')).not.toBeInTheDocument();
    });

    it('draws no block for an entry with no forms, and counts the forms as something recorded', () => {
      const bare = {
        entry: entryDetail({ description: null, elements: null, celestialBodies: null }).entry,
        folkNames: [],
        categories: [],
        deities: [],
      };
      const { unmount } = render(
        <IngredientSummary detail={full({ ...bare, variants: [] })} jars={[]} />,
      );
      expect(screen.queryByRole('heading', { name: 'Forms' })).not.toBeInTheDocument();
      unmount();

      render(
        <IngredientSummary detail={full({ ...bare, variants: [variant('testroot', null)] })} />,
      );
      expect(screen.getByRole('list', { name: 'Forms' })).toHaveTextContent(formLabel('testroot'));
      expect(screen.queryByText('Nothing recorded yet.')).not.toBeInTheDocument();
    });
  });
});
