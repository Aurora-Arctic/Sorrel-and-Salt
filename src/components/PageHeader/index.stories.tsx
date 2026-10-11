import type { Story } from '@ladle/react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import PageHeader from '.';

// Render-only: a heading and its action are the whole component, so the
// story is for the look, at desktop and at a phone's width, where the action
// goes beneath the heading and spans the line. Each sits in the admin
// layout's frame, `.admin-layout`, since the full-width action is the admin
// area's (claude-docs/styling.md, "The admin layout").
export default {
  title: 'Layout / Page Header',
};

const InAdminLayout = ({ children }: { children: ReactNode }) => (
  <div className="admin-layout">{children}</div>
);

// The compendium's, the one admin page with a heading of its own since the
// others went into tabs (MB.115).
const AddIngredient = () => (
  <Link className="btn btn--solid" href={'/admin/compendium?new' as Route}>
    Add Ingredient
  </Link>
);

export const WithAnAction: Story = () => (
  <InAdminLayout>
    <PageHeader title="Compendium" action={<AddIngredient />} />
  </InAdminLayout>
);

export const HeadingAlone: Story = () => (
  <InAdminLayout>
    <PageHeader title="Compendium" />
  </InAdminLayout>
);

// A heading long enough to wrap beside its action at a phone's width,
// standing in for any.
const Long = () => (
  <InAdminLayout>
    <PageHeader
      title="Deity Traditions"
      action={
        <Link className="btn btn--solid" href={'/admin/deity-traditions?new' as Route}>
          Add Tradition
        </Link>
      }
    />
  </InAdminLayout>
);

export const PhoneDark: Story = () => <Long />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Long />;
PhoneLight.meta = { theme: 'light', width: 375 };
