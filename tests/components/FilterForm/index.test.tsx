import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FilterForm from '@/components/FilterForm';
import ListFrame from '@/components/ListFrame';

// A named <form> inside a <search> is two landmarks for one control, so the <search> carries the name (claude-docs/components/filter-form.md).

describe('FilterForm', () => {
  it('is one landmark: the search is named and the form inside it is not', () => {
    const { container } = render(
      <ListFrame>
        <FilterForm
          label="Filter Users"
          action="/keepers/users"
          searchHref={() => '/keepers/users'}
          shown={[]}
        >
          <input name="query" aria-label="Name" />
        </FilterForm>
      </ListFrame>,
    );

    const search = container.querySelector('search');
    const form = container.querySelector('form');
    expect(search).toHaveAttribute('aria-label', 'Filter Users');
    expect(form).not.toHaveAttribute('aria-label');
    expect(form).not.toHaveAttribute('aria-labelledby');
    expect(search).toContainElement(form);
  });
});
