import 'server-only';
import { supplyOf } from '@/components/SpellBuilder/steps/supply';
import { jarOf } from '@/components/SpellBuilder/steps/values';
import { verdictOf, type VerdictKind } from '@/components/SpellBuilder/verdict-mark';
import type { Session } from '@/lib/session';
import type { SpellStepView } from '@/modules/grimoire';
import { stockOf } from '@/modules/ingredients';

// The stock verdict Quick Look marks on each ingredient step: `supplyOf` against the coven's jar of
// the step's form, drawn in the row as the modal has no side column. One `stockOf` call through the
// ingredients module, never GraphQL (rule 1); per request (rule 6).

type StockRows = Awaited<ReturnType<typeof stockOf>>[number];

/** The coven's jars as `jarOf` reads them: a jar's amounts are numeric strings in the row. */
export const jarRowsOf = (stock: StockRows | undefined) =>
  (stock instanceof Error || !stock ? [] : stock).map((jar) => ({
    unit: jar.unit,
    quantityOnHand: jar.quantityOnHand === null ? null : Number(jar.quantityOnHand),
    lowStockThreshold: jar.lowStockThreshold === null ? null : Number(jar.lowStockThreshold),
    variant: { id: jar.variantId },
  }));

/** Each step's verdict by its id, for the steps that have one; a step with none is absent. */
export async function readStepSuppliesOf(
  session: Session,
  workspaceId: string,
  views: readonly SpellStepView[],
): Promise<Map<string, VerdictKind>> {
  const ingredientIds = [...new Set(views.flatMap((v) => (v.ingredient ? [v.ingredient.id] : [])))];
  const stock = ingredientIds.length
    ? await stockOf(
        session,
        ingredientIds.map((ingredientId) => ({ ingredientId, workspaceId })),
      )
    : [];
  const jars = new Map(ingredientIds.map((id, i) => [id, jarRowsOf(stock[i])]));
  const steps = views.map((view) => ({
    id: view.id,
    ingredientId: view.ingredient?.id ?? null,
    variantId: view.variant?.id ?? null,
    name: view.ingredient ? view.ingredient.name : view.name,
    jar:
      view.ingredient && view.variant
        ? jarOf(jars.get(view.ingredient.id) ?? [], view.variant.id)
        : null,
    quantity: view.quantity ?? '',
    unit: view.unit ?? '',
  }));
  return new Map(
    steps.flatMap((step) => {
      const verdict = verdictOf(supplyOf(step, steps));
      return verdict ? [[step.id, verdict] as const] : [];
    }),
  );
}
