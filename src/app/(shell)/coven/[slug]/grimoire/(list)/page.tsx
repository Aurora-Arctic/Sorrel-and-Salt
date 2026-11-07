import type { Metadata } from 'next';
import { grimoireTab } from './grimoire-tab';
import type { GrimoireTabParams } from './types';

export const metadata: Metadata = { title: 'Grimoire' };

export default function GrimoirePage(props: GrimoireTabParams) {
  return grimoireTab({ ...props, status: 'complete', beneath: '' });
}
