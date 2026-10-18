import { StockBadge } from '../StockBadge';

// The dot between a jar's form and its quantity, and the comma a screen
// reader hears in its place. One copy, so no story spells the separator
// its own way; the owner's rule is "dot, never a comma".
export const Dot = () => (
  <>
    <span aria-hidden="true">·</span>
    <span className="spoken-separator">,</span>
  </>
);

// A stand-in for M9.6’s jar lines, to the card’s contract: one `li` per jar,
// the form and quantity first and the stock badge last. Shared by every story
// that shows jar lines.
export const Jars = () => (
  <ul>
    <li>
      <span>
        Dried Leaf <Dot /> 6 g
      </span>
      <StockBadge quantity={6} threshold={10} unit="g" />
    </li>
    <li>
      <span>
        Oil <Dot /> 0 ml
      </span>
      <StockBadge quantity={0} threshold={10} unit="ml" />
    </li>
  </ul>
);
