import Link from 'next/link';
import type { ReactElement } from 'react';
import { chipColors } from '../../lib/chip-colors';
import Pager from '../Pager';
import CategoryListFilter from './filter';
import type { CategoryListProps } from './types';
import './index.scss';

// `/admin/categories`' filter, table and pager (M5.6, MB.178). Render-only:
// the page reads one page of the vocabulary under the address's filter
// through the service and hands it here. The filter is a GET form to the page
// itself, so a filtered page is an address. Each Edit is
// an address — the page opens its modal from the URL, as it does for the Add
// Category beside its heading — so a modal can be linked to and Back closes it
// (claude-docs/components/category-list.md).

const CategoryList = ({
  categories,
  filter,
  groups,
  previousHref,
  nextHref,
  position,
}: CategoryListProps): ReactElement => (
  <div className="category-list">
    {/* Keyed by the filter shown, so another one starts the form again from it. */}
    <CategoryListFilter key={`${filter.query}\n${filter.group}`} filter={filter} groups={groups} />

    {categories.length ? (
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
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>
                  {/* The group in its own chip, as the category picker shows it. */}
                  {category.groupColors ? (
                    <span className="chip" style={chipColors(category.groupColors)}>
                      {category.groupName}
                    </span>
                  ) : (
                    category.groupName
                  )}
                </td>
                <td className="category-list__description">{category.description}</td>
                <td>
                  {/* Soft navigation: the page renders again with the modal open. */}
                  <Link className="btn btn--small btn--quiet" href={category.editHref}>
                    Edit <span className="visually-hidden">{category.name}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p>{filter.query || filter.group ? 'No category matches.' : 'No categories yet.'}</p>
    )}

    <Pager previousHref={previousHref} nextHref={nextHref} position={position} soft />
  </div>
);

export default CategoryList;
