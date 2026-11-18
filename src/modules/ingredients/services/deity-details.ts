import 'server-only';
import { deityOtherNamesOf, deityTraditionsOf } from '@/modules/vocabulary';
import type { DeityDetail, IngredientDeityRow } from '../types';

/**
 * Each row as the page shows it, in the order given: a typed name, or a retired deity or tradition, shows its name alone.
 */
export async function deityDetailsOf(rows: readonly IngredientDeityRow[]): Promise<DeityDetail[]> {
  const picked = rows.flatMap(({ deity }) => deity ?? []);
  const [traditions, otherNames] = await Promise.all([
    deityTraditionsOf(picked.map((deity) => deity.traditionId)),
    deityOtherNamesOf(picked.map((deity) => deity.id)),
  ]);
  const traditionOf = new Map(
    picked.map((deity, i) => {
      const tradition = traditions[i];
      return [deity.id, tradition instanceof Error ? null : tradition.name] as const;
    }),
  );
  const otherNamesOf = new Map(picked.map((deity, i) => [deity.id, otherNames[i]] as const));
  return rows.map(({ name, deity }) => ({
    name,
    tradition: deity ? (traditionOf.get(deity.id) ?? null) : null,
    otherNames: deity ? (otherNamesOf.get(deity.id) ?? []) : [],
  }));
}
