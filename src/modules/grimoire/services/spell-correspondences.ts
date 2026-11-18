import 'server-only';
import type { Session } from '../../../lib/session';
import type { SpellCorrespondences } from '../types';

export async function spellCorrespondencesOf(
  _session: Session,
  _workspaceId: string,
  _spellId: string,
): Promise<SpellCorrespondences> {
  throw new Error('Not implemented');
}
