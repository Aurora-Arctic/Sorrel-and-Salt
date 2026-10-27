import type { Metadata } from 'next';
import { grimoireTab } from './grimoire-tab';
import type { GrimoireTabParams } from './types';

// The Grimoire's Spells tab (M10.11): the coven's complete spells.
export const metadata: Metadata = { title: 'Grimoire' };

export default function GrimoirePage(props: GrimoireTabParams) {
  return grimoireTab({ ...props, status: 'complete', beneath: '' });
}
