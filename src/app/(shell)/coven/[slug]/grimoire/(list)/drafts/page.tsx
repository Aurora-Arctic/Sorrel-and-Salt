import type { Metadata } from 'next';
import { grimoireTab } from '../grimoire-tab';
import type { GrimoireTabParams } from '../types';

// The Grimoire's Drafts tab (M10.11): the coven's spells still being written.
export const metadata: Metadata = { title: 'Drafts' };

export default function GrimoireDraftsPage(props: GrimoireTabParams) {
  return grimoireTab({ ...props, status: 'draft', beneath: '/drafts' });
}
