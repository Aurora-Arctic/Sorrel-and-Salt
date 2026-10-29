import type { ReactElement } from 'react';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import FormIcon from '../FormIcon';
import { StockBadge } from '../StockBadge';
import { amountText } from '../StockBadge/stock-words';
import type { JarLinesProps } from './types';

// The jar lines for an ingredient card's `children` slot: one `li` per jar, form and quantity
// first, the stock badge last. The dot is decorative, with a comma for a screen reader
// (claude-docs/components/jar-lines.md).
export default function JarLines({ jars }: JarLinesProps): ReactElement {
  return (
    <ul>
      {jars.map((jar) => (
        <li key={jar.id}>
          <span>
            <FormIcon name={jar.icon} /> {formLabel(jar.form)}
            <span aria-hidden="true">·</span>
            <span className="spoken-separator">,</span>
            {amountText(jar.quantity, jar.unit)}
          </span>
          <StockBadge quantity={jar.quantity} threshold={jar.threshold} unit={jar.unit} />
        </li>
      ))}
    </ul>
  );
}
