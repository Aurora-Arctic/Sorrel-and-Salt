import type { Metadata } from 'next';
import { grimoireTab } from '../grimoire-tab';
import type { GrimoireTabParams } from '../types';

export const metadata: Metadata = { title: 'Drafts' };

export default function GrimoireDraftsPage(props: GrimoireTabParams) {
  return grimoireTab({ ...props, status: 'draft', beneath: '/drafts' });
}
