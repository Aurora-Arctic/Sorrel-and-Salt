import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import RoleTip from '.';
import { SITE_ROLE_ACCESS } from '../UserList/roles';
import { WORKSPACE_ROLE_ACCESS } from '../MemberList/role-access';

const meta = { title: 'Lists / Role Tip', component: RoleTip } satisfies Meta<typeof RoleTip>;
export default meta;

export const SiteAdmin: StoryObj<typeof RoleTip> = {
  args: { label: 'Keeper', description: SITE_ROLE_ACCESS.admin, emphasis: true },
};

export const CovenObserver: StoryObj<typeof RoleTip> = {
  args: { label: 'Observer', description: WORKSPACE_ROLE_ACCESS.viewer },
};
