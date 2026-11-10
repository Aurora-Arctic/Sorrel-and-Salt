import type { Metadata } from 'next';
import { pageTitle } from '@/lib/page-metadata';
import { grimoireTab } from './grimoire-tab';
import type { GrimoireTabParams } from './types';

export const metadata: Metadata = pageTitle('Grimoire');

export default function GrimoirePage(props: GrimoireTabParams) {
  return grimoireTab({ ...props, status: 'complete', beneath: '' });
}
