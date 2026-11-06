import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FilterForm from '@/components/FilterForm';
import ListFrame from '@/components/ListFrame';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const list = (disabled?: boolean) => (
  <ListFrame disabled={disabled}>
    <FilterForm
      label="Filter Users"
      action="/keepers/users"
      searchHref={() => '/keepers/users'}
      shown={[]}
    >
      <input name="q" aria-label="Search" />
      <select name="role" aria-label="Role">
        <option>Any</option>
      </select>
    </FilterForm>
  </ListFrame>
);

describe('ListFrame disabled', () => {
  it('leaves its controls usable by default', () => {
    render(list());
    expect(screen.getByLabelText('Search')).toBeEnabled();
    expect(screen.getByLabelText('Role')).toBeEnabled();
  });

  it('draws the real filter row with its controls disabled and hidden from assistive technology', () => {
    render(list(true));
    // Preconditions: the controls exist, so a pass is not an empty row.
    const search = screen.getByLabelText('Search', { selector: 'input' });
    const role = screen.getByLabelText('Role', { selector: 'select' });
    expect(search).toBeDisabled();
    expect(role).toBeDisabled();
    expect(screen.queryByRole('search')).toBeNull();
    expect(search.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
