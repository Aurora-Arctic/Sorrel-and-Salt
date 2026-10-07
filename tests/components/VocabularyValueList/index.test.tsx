import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VocabularyValueList from '@/components/VocabularyValueList';
import { vocabularyHref } from '@/components/VocabularyValueList/href';
import type {
  VocabularyValueListEntry,
  VocabularyValueListProps,
} from '@/components/VocabularyValueList/types';
import { Navigating } from '../../support/navigating';

// The soft pager and the filter navigate through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// `/admin/planets`' and `/admin/zodiac-signs`' filter, table and pager
// (MB.95): each value with its description, an Edit link opening it in the
// page's modal, the name filter that narrows them, and the pager
// (claude-docs/components/vocabulary-value-list.md). The two lists differ
// only in their nouns and their address, so each test runs on both.

const VOCABULARIES = [
  { vocabulary: 'planets', path: '/admin/planets', noun: 'planet', plural: 'planets' },
  { vocabulary: 'zodiacSigns', path: '/admin/zodiac-signs', noun: 'sign', plural: 'signs' },
] as const;

describe.each(VOCABULARIES)(
  'VocabularyValueList of $vocabulary',
  ({ vocabulary, path, noun, plural }) => {
    const ENTRIES: VocabularyValueListEntry[] = [
      {
        id: 'v1',
        name: 'Testwort Star',
        slug: 'testwort-star',
        description: 'An invented value',
        editHref: vocabularyHref(vocabulary, {}, { edit: 'testwort-star' }),
      },
      {
        id: 'v2',
        name: 'Fixture Comet',
        slug: 'fixture-comet',
        description: 'Another',
        editHref: vocabularyHref(vocabulary, {}, { edit: 'fixture-comet' }),
      },
    ];

    const props = (
      overrides: Partial<VocabularyValueListProps> = {},
    ): VocabularyValueListProps => ({
      vocabulary,
      values: ENTRIES,
      query: '',
      ...overrides,
    });

    beforeEach(() => {
      router.push.mockReset();
    });

    it('lists each value with its description', () => {
      render(<VocabularyValueList {...props()} />);

      const rows = within(screen.getByRole('table')).getAllByRole('row');
      expect(rows).toHaveLength(3);
      expect(
        within(rows[0])
          .getAllByRole('columnheader')
          .map((cell) => cell.textContent),
      ).toEqual(['Name', 'Description', 'Edit']);
      expect(within(rows[1]).getByRole('cell', { name: 'Testwort Star' })).toBeInTheDocument();
      expect(within(rows[1]).getByRole('cell', { name: 'An invented value' })).toBeInTheDocument();
    });

    it('links each row to its edit modal, named for the value', () => {
      render(<VocabularyValueList {...props()} />);

      expect(screen.getByRole('link', { name: 'Edit Testwort Star' })).toHaveAttribute(
        'href',
        `${path}?edit=testwort-star`,
      );
    });

    it('pages when there is another page either way, saying where it stands', () => {
      render(
        <VocabularyValueList
          {...props()}
          previousHref={vocabularyHref(vocabulary, { before: 'b' })}
          nextHref={vocabularyHref(vocabulary, { after: 'a' })}
          position={{ page: 2, pages: 3 }}
        />,
      );

      const pages = screen.getByRole('navigation', { name: 'Pages' });
      expect(within(pages).getByRole('link', { name: 'Prev' })).toHaveAttribute(
        'href',
        `${path}?before=b`,
      );
      expect(within(pages).getByRole('link', { name: 'Next' })).toHaveAttribute(
        'href',
        `${path}?after=a`,
      );
      expect(pages).toHaveTextContent('Page 2 of 3');
    });

    it('has no pager on a lone page', () => {
      render(<VocabularyValueList {...props()} />);

      expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument();
    });

    it('says so when there are none, and when a query finds none', () => {
      const { rerender } = render(<VocabularyValueList {...props({ values: [] })} />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByText(`No ${plural} yet.`)).toBeInTheDocument();

      rerender(<VocabularyValueList {...props({ values: [], query: 'nothing' })} />);
      expect(screen.getByText(`No ${noun} matches.`)).toBeInTheDocument();
      expect(screen.queryByText(`No ${plural} yet.`)).not.toBeInTheDocument();
    });

    describe('the filter', () => {
      const filterButton = () => screen.getByRole('button', { name: 'Filter' });

      it('filters by a GET search to the page itself, keeping what was asked, with no group', () => {
        render(<VocabularyValueList {...props({ query: 'star' })} />);

        const search = screen.getByRole('form', { name: `Filter ${plural}` });
        expect(search).toHaveAttribute('action', path);
        expect(search).toHaveAttribute('method', 'get');
        const name = within(search).getByRole('searchbox', { name: 'Name' });
        expect(name).toHaveValue('star');
        expect(name).toHaveAttribute('name', 'query');
        expect(within(search).queryByRole('combobox')).not.toBeInTheDocument();
      });

      it('is offered only while the query differs from the one shown', () => {
        render(<VocabularyValueList {...props({ query: 'star' })} />);
        const box = screen.getByRole('searchbox', { name: 'Name' });
        expect(filterButton()).toBeDisabled();

        fireEvent.change(box, { target: { value: 'stars' } });
        expect(filterButton()).toBeEnabled();

        fireEvent.change(box, { target: { value: 'star ' } });
        expect(filterButton()).toBeDisabled();
      });

      it('opens the filtered list from its first page, and the whole list when cleared', () => {
        const { rerender } = render(
          <VocabularyValueList
            {...props({ previousHref: vocabularyHref(vocabulary, { before: 'b' }) })}
          />,
        );
        fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), {
          target: { value: ' Testwort st ' },
        });
        fireEvent.click(filterButton());
        expect(router.push).toHaveBeenLastCalledWith(`${path}?query=Testwort+st`);

        rerender(<VocabularyValueList {...props({ query: 'star' })} />);
        fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), {
          target: { value: '' },
        });
        fireEvent.click(filterButton());
        expect(router.push).toHaveBeenLastCalledWith(path);
      });

      it('shows it is filtering until the filtered list arrives', async () => {
        render(
          <Navigating push={router.push}>
            <VocabularyValueList {...props()} />
          </Navigating>,
        );

        fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), {
          target: { value: 'star' },
        });
        await act(async () => {
          fireEvent.click(filterButton());
        });

        const busy = screen.getByRole('button', { name: 'Filtering' });
        expect(busy).toBeDisabled();
        expect(busy).toHaveAttribute('aria-busy', 'true');
      });

      it('starts again from the query shown when the page shows another', () => {
        const { rerender } = render(<VocabularyValueList {...props()} />);
        fireEvent.change(screen.getByRole('searchbox', { name: 'Name' }), {
          target: { value: 'draft' },
        });

        rerender(<VocabularyValueList {...props({ query: 'star' })} />);

        expect(screen.getByRole('searchbox', { name: 'Name' })).toHaveValue('star');
        expect(filterButton()).toBeDisabled();
      });
    });
  },
);

describe('vocabularyHref', () => {
  it("writes each vocabulary's address, the query ahead of the cursor and the modal", () => {
    expect(vocabularyHref('planets', { query: 'north n', after: 'x/y' }, { edit: 'mars' })).toBe(
      '/admin/planets?query=north+n&after=x%2Fy&edit=mars',
    );
    expect(vocabularyHref('zodiacSigns', { before: 'b' }, 'new')).toBe(
      '/admin/zodiac-signs?before=b&new',
    );
    expect(vocabularyHref('planets', { query: '' })).toBe('/admin/planets');
  });
});
