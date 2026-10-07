import type { Story } from '@ladle/react';
import CategoryList from '.';
import { slugify } from '../../lib/slugify';
import { categoriesHref } from './href';

// Render-only; behaviour is asserted in tests/components/CategoryList.
export default {
  title: 'Admin / Category List',
};

const entry = (name: string, groupName: string, description: string) => {
  const slug = slugify(name);
  return {
    id: slug,
    name,
    slug,
    description,
    groupName,
    editHref: categoriesHref({}, { edit: slug }),
  };
};

export const OnePageOfSeveral: Story = () => (
  <CategoryList
    categories={[
      entry('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
      entry('Testward', 'Fixture Protection', 'Another, guarding nothing in particular.'),
      entry('Fixture Mending', 'Fixture Healing', 'Invented too.'),
    ]}
    previousHref={categoriesHref({ before: 'cursor' })}
    nextHref={categoriesHref({ after: 'cursor' })}
  />
);

// Next alone still sits at the right, where it is on every other page.
export const FirstPage: Story = () => (
  <CategoryList
    categories={[
      entry('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
    ]}
    nextHref={categoriesHref({ after: 'cursor' })}
  />
);

export const Empty: Story = () => <CategoryList categories={[]} />;
