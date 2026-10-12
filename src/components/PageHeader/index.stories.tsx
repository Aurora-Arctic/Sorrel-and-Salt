import type { Story } from '@ladle/react';
import type { Route } from 'next';
import { AdminFrame as InAdminLayout } from '../../../.ladle/admin-frame';
import AddAction from '../../app/(shell)/admin/add-action';
import PageHeader from '.';

// Render-only: a heading and its action are the whole component, so the
// story is for the look, at desktop and at a phone's width, where the action
// is a plus beside the heading, with its label as a tip. Each sits in the
// admin layout's frame, `.admin-layout` (claude-docs/styling.md, "The admin layout").
export default {
  title: 'Layout / Page Header',
};

// The compendium's, the one admin page with a heading of its own since the
// others went into tabs (MB.115).
const AddIngredient = () => (
  <AddAction href={'/admin/compendium?new' as Route} heading={{ title: 'Add Compendium Entry' }}>
    Add Compendium Entry
  </AddAction>
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
        <AddAction
          href={'/admin/deity-traditions?new' as Route}
          heading={{ title: 'Add Tradition' }}
        >
          Add Tradition
        </AddAction>
      }
    />
  </InAdminLayout>
);

export const PhoneDark: Story = () => <Long />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Long />;
PhoneLight.meta = { theme: 'light', width: 375 };
