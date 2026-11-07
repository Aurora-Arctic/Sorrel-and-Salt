import type { SpellStatus } from '@/modules/grimoire';

export interface GrimoireTabParams {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export interface GrimoireTabProps extends GrimoireTabParams {
  status: SpellStatus;
  beneath: '' | '/drafts';
}

export interface NewSpellActionProps {
  covenName: string;
}
