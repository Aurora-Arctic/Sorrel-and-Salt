import Link from 'next/link';
import type { ReactElement } from 'react';
import Pager from '../Pager';
import IngredientFormValueListFilter from './filter';
import type { IngredientFormValueListProps } from './types';
import './index.scss';

// `/admin/forms`' filter, table and pager (M5.6a), CategoryList's. Render-only:
// the page reads one page of the curated form vocabulary under the address's
// filter through the service and hands it here. The filter is a GET form to
// the page itself, so a filtered page is an address. Each Edit is an address
// — the page opens its modal from the URL, as it does for the Add Form beside
// its heading — so a modal can be linked to and Back closes it
// (claude-docs/components/ingredient-form-value-list.md).

const IngredientFormValueList = ({
  forms,
  filter,
  groups,
  previousHref,
  nextHref,
  position,
}: IngredientFormValueListProps): ReactElement => (
  <div className="ingredient-form-value-list">
    {/* Keyed by the filter shown, so another one starts the form again from it. */}
    <IngredientFormValueListFilter
      key={`${filter.query}\n${filter.group}`}
      filter={filter}
      groups={groups}
    />

    {forms.length ? (
      <div className="data-table-frame">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Group</th>
              <th scope="col">Description</th>
              <th scope="col">
                <span className="visually-hidden">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {forms.map((form) => (
              <tr key={form.id}>
                <td>{form.name}</td>
                <td>{form.groupName}</td>
                <td className="ingredient-form-value-list__description">{form.description}</td>
                <td>
                  {/* Soft navigation: the page renders again with the modal open. */}
                  <Link className="btn btn--small btn--quiet" href={form.editHref}>
                    Edit <span className="visually-hidden">{form.name}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p>{filter.query || filter.group ? 'No form matches.' : 'No forms yet.'}</p>
    )}

    <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
  </div>
);

export default IngredientFormValueList;
