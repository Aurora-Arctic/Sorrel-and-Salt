import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import { grimoireTab } from '../grimoire-tab';
import type { GrimoireTabParams } from '../types';

export const metadata: Metadata = pageTitle('Drafts');

export default function GrimoireDraftsPage(props: GrimoireTabParams) {
  return grimoireTab({ ...props, status: 'draft', beneath: 'drafts' });
}
