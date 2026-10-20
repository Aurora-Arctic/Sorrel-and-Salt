import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IngredientSummary from '@/components/IngredientEntry/summary';
import type { CategoryDetail, IngredientDetail, VariantDetail } from '@/modules/ingredients';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { entryDetail } from '../../support/entry-detail';

// The details modal's body (M12.5; claude-docs/components/ingredient-entry.md,
// "The details modal"): the entry page's Details section cut to the owner's
// choice, the caution and the categories, the folk names and the
// correspondences, drawn by the page's own blocks. Every value is the test's own
// data, so finding one proves what rendered.

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
    deities: [{ name: 'Fixtura', tradition: 'Fixture Pantheon' }],
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
    expect(rowOf('Planets')).toBe('Fixture Moon');
    expect(rowOf('Deities')).toBe('Fixtura (Fixture Pantheon)');
  });

  it('names the forms that carry a caution of their own, and no form when none does', () => {
    const { unmount } = render(<IngredientSummary detail={full()} />);
    // The form with notes is named, inside the caution, so the two read as one
    // warning; the one without is not.
    const caution = screen.getByRole('region', { name: 'Caution' });
    expect(within(caution).getByText(new RegExp(formLabel('testoil')))).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(formLabel('testroot')))).not.toBeInTheDocument();
    unmount();

    render(
      <IngredientSummary
        detail={full({ variants: [variant('testoil', null), variant('testroot', '  ')] })}
      />,
    );
    // Why it could show: the entry still has forms, and its own caution.
    expect(screen.getByRole('region', { name: 'Caution' })).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(formLabel('testoil')))).not.toBeInTheDocument();
  });

  it("draws the caution for a form's alone, naming the form, when the entry has none of its own", () => {
    render(<IngredientSummary detail={full({ entry: entryDetail().entry })} />);

    const caution = screen.getByRole('region', { name: 'Caution' });
    expect(within(caution).getByText(new RegExp(formLabel('testoil')))).toBeInTheDocument();
    expect(within(caution).queryByText('Fixture entry caution.')).not.toBeInTheDocument();
  });

  it('leaves out the description, the forms, the substitutes, the references and Similar', () => {
    render(<IngredientSummary detail={full()} />);

    // Why they could show: the detail carries a description, forms and substitutes,
    // and the summary is drawn. No Details heading: the dialog's title names the entry.
    expect(screen.getByRole('heading', { name: 'Correspondences' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Details' })).not.toBeInTheDocument();
    expect(screen.queryByText('A fixture description.')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Forms' })).not.toBeInTheDocument();
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
    expect(rowOf('Planets')).toBe('Fixture Sun');
  });

  it("draws no caution and no empty block for a sparse entry: no 'None recorded', no empty heading", () => {
    render(
      <IngredientSummary
        detail={full({
          entry: entryDetail({ elements: null, celestialBodies: null }).entry,
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
    render(
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
  });

  it("keeps a block's filled rows and drops its empty ones", () => {
    render(<IngredientSummary detail={full({ folkNames: [], deities: [] })} />);

    // Why the rows could show: the entry has elements and planets, and the
    // block draws those two.
    expect(rowOf('Elements')).toBe('Fire');
    expect(rowOf('Planets')).toBe('Fixture Moon');
    for (const term of ['Zodiac Signs', 'Colours', 'Deities']) {
      expect(screen.queryByText(term, { selector: 'dt' })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('heading', { name: 'Folk Names' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
  });
});
