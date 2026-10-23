import type { ReactElement } from 'react';
import type { VariantDetail } from '@/modules/ingredients';
import JarShelf from '../JarShelf';
import type { ShelfForm } from '../JarShelf/types';
import StockDialog from '../StockDialog';
import type { EntryStock } from './types';

// The entry page's Stock section (M12.29): a shelf of drawn jars, one per form of the
// entry, under a heading that carries the card's Edit Stock button for a role that may
// edit. A form the coven holds a jar of draws it with its level; a form with none draws
// an empty one. The shelf follows the forms' order, as the Forms section below does, except
// that the forms with no jar go after every form with one (the owner, 2026-10-21), each
// group keeping the forms' order; a jar holding 0 is still a jar and keeps its place. It
// takes each form from the entry's own variants, so the page passes only the jars. A jar
// whose form is gone from the entry has nothing to be drawn under and is left out.
// claude-docs/components/ingredient-entry.md, "Stock".

export default function StockSection({
  stock,
  variants,
  ingredientId,
  name,
  formalName,
}: {
  stock: EntryStock;
  variants: readonly VariantDetail[];
  ingredientId: string;
  /** The entry as the coven calls it, the formal name after: the dialog's button and title. */
  name: string;
  /** The entry's formal name, which the shelf's vessels are drawn from; `null` for none, and then its id is used. */
  formalName: string | null;
}): ReactElement {
  const all = variants.map(({ variant: { id, form } }): ShelfForm => {
    const jar = stock.jars.find(({ variantId }) => variantId === id);
    return {
      variantId: id,
      form,
      jar: jar
        ? { id: jar.id, quantity: jar.quantity, unit: jar.unit, threshold: jar.threshold }
        : null,
    };
  });
  // Two filters and not a sort: each keeps the forms' order, whatever it is.
  const forms = [...all.filter(({ jar }) => jar), ...all.filter(({ jar }) => !jar)];

  const dialog = {
    workspaceId: stock.workspaceId,
    ingredientId,
    ingredientName: name,
    forms: stock.forms,
    jars: stock.jars,
  };

  return (
    <section id="stock" className="ingredient-entry__section" aria-labelledby="stock-heading">
      {/* The head and the shelf, spaced as one stack. No box: MB.121 removed the interim `panel`. */}
      <div className="ingredient-entry__stock-panel">
        <div className="ingredient-entry__stock-head">
          <h2 id="stock-heading">Stock</h2>
          {stock.mayEdit && (
            // In the head's own icon wrapper, as EditPencil is, so the button is the
            // heading pencils' size wherever that is set.
            <div
              className="ingredient-entry__cupboard ingredient-entry__cupboard--icons"
              data-icons={1}
            >
              <StockDialog {...dialog} />
            </div>
          )}
        </div>
        {/* The wrapper always renders, so the empty line sits in the text column too. */}
        <div className="ingredient-entry__stock">
          {forms.length > 0 ? (
            <JarShelf
              forms={forms}
              seed={formalName?.trim() ? formalName : ingredientId}
              edit={stock.mayEdit ? dialog : undefined}
            />
          ) : (
            <p className="ingredient-entry__empty">No stock recorded.</p>
          )}
        </div>
      </div>
    </section>
  );
}
