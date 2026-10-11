import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VocabularyValueList from '@/components/VocabularyValueList';
import { vocabularyHref } from '@/components/VocabularyValueList/href';
import type {
  VocabularyValueListEntry,
  VocabularyValueListProps,
} from '@/components/VocabularyValueList/types';

// The soft pager and the filter navigate through the App Router; Vitest hoists the mock above the imports.
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// `/admin/planets`' and `/admin/zodiac-signs`' filter, table and pager
// (MB.95): each value with its description, an Edit link opening it in the
// page's modal, the name filter that narrows them, and the pager
// (claude-docs/components/vocabulary-value-list.md). The two lists differ
// only in their nouns and their address, so the shared behaviour runs on the
// planets alone and the signs' address is `vocabularyHref`'s below. The
// filter's spinner and its reset to the filter shown are CompendiumList's,
// the paging Pager's.

const vocabulary = 'planets';
const path = '/admin/planets';

describe('VocabularyValueList', () => {
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

  const props = (overrides: Partial<VocabularyValueListProps> = {}): VocabularyValueListProps => ({
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

  it('draws no table when there are none, or a query finds none', () => {
    const { rerender } = render(<VocabularyValueList {...props({ values: [] })} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    rerender(<VocabularyValueList {...props({ values: [], query: 'nothing' })} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  describe('the filter', () => {
    const filterButton = () => screen.getByRole('button', { name: 'Filter' });

    it('filters by a GET search to the page itself, keeping what was asked, with no group', () => {
      render(<VocabularyValueList {...props({ query: 'star' })} />);

      const search = screen.getByRole('form', { name: 'Filter planets' });
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
  });
});

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
