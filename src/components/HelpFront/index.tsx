import type { Route } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { STAFF_HELP } from '../../lib/help-paths';
import { PendingLink } from '../../lib/navigation';
import { BackChevron } from '../IngredientEntry/back-chevron';
import SectionBody from '../SectionBody';
import { HelpFrontHead } from './head';
import { HelpFrontShell } from './shell';
import HelpFrontSearch from './search';
import type { HelpFrontProps } from './types';

const LiveBody = ({ className, children }: { className: string; children: ReactNode }) => (
  <SectionBody region="help" className={className}>
    {children}
  </SectionBody>
);

// The public help pages' header, mounted once by their layout, so moving between them changes only what is beneath
// it and a search under way keeps its words and spinner (claude-docs/components/help-front.md).
const HelpFront = ({ staffHelp = false, children }: HelpFrontProps): ReactElement => (
  <HelpFrontShell
    body={LiveBody}
    head={
      <HelpFrontHead
        action={
          staffHelp && (
            <PendingLink className="back-link back-link--forward" href={STAFF_HELP as Route}>
              Staff Help
              <BackChevron direction="forward" />
            </PendingLink>
          )
        }
        // No Suspense boundary: its fallback would stand in the page sent to a reader with no script, an empty box on
        // the search page. The layout reads the session, so every help page renders per request and needs none.
        search={<HelpFrontSearch />}
      />
    }
  >
    {children}
  </HelpFrontShell>
);

export default HelpFront;
