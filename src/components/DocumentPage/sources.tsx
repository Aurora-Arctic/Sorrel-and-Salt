import type { ReactElement, ReactNode } from 'react';

const markId = (cite: string, number: number) => `cite-${cite}-${number}`;
const sourceId = (number: number) => `source-${number}`;

// The source numbers ending a sentence: a superscript link each to its entry in the page's source
// list; `cite` names the place, so the same source cited twice keeps unique ids.
export function SourceMarks({
  cite,
  numbers,
}: {
  cite: string;
  numbers: readonly number[];
}): ReactElement {
  return (
    <sup className="document-page__marks">
      {numbers.map((number) => (
        <a
          key={number}
          id={markId(cite, number)}
          href={`#${sourceId(number)}`}
          aria-label={`Source ${number}`}
        >
          #{number}
        </a>
      ))}
    </sup>
  );
}

// One entry of the source list, with a return link per place that cites it.
export function SourceItem({
  number,
  cites,
  children,
}: {
  number: number;
  cites: readonly string[];
  children: ReactNode;
}): ReactElement {
  return (
    <li id={sourceId(number)} className="document-page__source">
      {children}
      {cites.map((cite, index) => (
        <span key={cite}>
          {/* No space before the arrow: its margin spaces it, and `<wbr>` keeps a break. */}
          <wbr />
          <a
            className="document-page__return"
            href={`#${markId(cite, number)}`}
            aria-label={cites.length > 1 ? `Back to citation ${index + 1}` : 'Back to the text'}
          >
            <span aria-hidden="true">↩</span>
          </a>
        </span>
      ))}
    </li>
  );
}
