import type { Story } from '@ladle/react';
import type { Route } from 'next';
import Link from 'next/link';
import PageHeader from '.';

// Render-only: a heading and its action are the whole component, so the
// story is for the look, at desktop and at a phone's width, where a long
// heading pushes the action beneath it.
export default {
  title: 'Layout / Page Header',
};

const AddCategory = () => (
  <Link className="btn btn--solid" href={'/admin/categories?new' as Route}>
    Add Category
  </Link>
);

export const WithAnAction: Story = () => <PageHeader title="Categories" action={<AddCategory />} />;

export const HeadingAlone: Story = () => <PageHeader title="Privilege Changes" />;

const Long = () => (
  <PageHeader
    title="Deity Traditions"
    action={
      <Link className="btn btn--solid" href={'/admin/deity-traditions?new' as Route}>
        Add Tradition
      </Link>
    }
  />
);

export const PhoneDark: Story = () => <Long />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Long />;
PhoneLight.meta = { theme: 'light', width: 375 };
