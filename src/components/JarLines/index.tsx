import type { ReactElement } from 'react';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import EditStock from '../EditStock';
import FormIcon from '../FormIcon';
import { StockBadge } from '../StockBadge';
import type { JarLinesProps } from './types';

// The jar lines of an ingredient card, for its `children` slot: one `li` per jar, the form and
// quantity first and the stock badge last, which the card's primitives (`.specimen__stock > ul`)
// lay out. Plain data in, so the Ingredients page, the workshop's stories and a test all draw
// the same line. The dot is decorative, with the comma a screen reader hears in its place; the
// owner's rule is "dot, never a comma". Given `edit`, a member's line ends in Edit Stock (M9.9). claude-docs/components/jar-lines.md.
export default function JarLines({ jars, edit }: JarLinesProps): ReactElement {
  return (
    <ul>
      {jars.map((jar) => (
        <li key={jar.id}>
          <span>
            <FormIcon name={jar.icon} /> {formLabel(jar.form)}
            <span aria-hidden="true">·</span>
            <span className="spoken-separator">,</span>
            {jar.quantity === null
              ? 'Unmeasured'
              : jar.unit
                ? `${jar.quantity} ${jar.unit}`
                : jar.quantity}
          </span>
          <StockBadge quantity={jar.quantity} threshold={jar.threshold} unit={jar.unit} />
          {edit && (
            <EditStock
              workspaceId={edit.workspaceId}
              jar={{
                id: jar.id,
                ingredient: edit.ingredient,
                form: jar.form,
                quantity: jar.quantity,
                unit: jar.unit,
                threshold: jar.threshold,
              }}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
