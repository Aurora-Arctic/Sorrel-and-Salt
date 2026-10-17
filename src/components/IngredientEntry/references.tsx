import type { ReactElement } from 'react';
import { renderCitation } from '../../lib/citation';
import type { CitedReference } from '@/modules/ingredients';

// A references block (MB.155): the sources an entry or one of its forms
// cites, in Chicago bibliography form. The parts come from `renderCitation`,
// the one renderer, so only the italic runs are marked, in `cite`; the order
// is the loader's (`byCitation`), kept as given. The block's own heading and
// empty line are drawn by `ListBlock`, which this fills with items.

/** A source's url, as a link out; `noopener` keeps the opened page from reaching back. */
function SourceLink({ href }: { href: string }): ReactElement {
  return (
    <a href={href} target="_blank" rel="noopener">
      Open Source
    </a>
  );
}

export function referenceItems(references: readonly CitedReference[]): ReactElement[] {
  return references.map(({ reference, locator }) => (
    <li key={reference.id}>
      {renderCitation(reference).map((part, at) =>
        part.italic ? <cite key={at}>{part.text}</cite> : part.text,
      )}
      {locator && (
        <>
          {' '}
          <span className="ingredient-entry__locator">{locator}</span>
        </>
      )}
      {reference.url && (
        <>
          {' '}
          <SourceLink href={reference.url} />
        </>
      )}
    </li>
  ));
}
