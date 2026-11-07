'use client';

import type { Route } from 'next';
import type { ReactElement } from 'react';
import HelpArticleForm from '../../../../components/HelpArticleForm';
import type {
  HelpArticleFormValue,
  HelpParentChoice,
} from '../../../../components/HelpArticleForm/types';
import { RouteModal } from '../../../../components/Modal';
import type { ModalHeading } from '../../../../components/Modal/types';

// The help page's modal, opened by its address or at once by a press: the client edge between the server page and the form,
// as `RouteModal` hands its contents `close`, which a server component cannot pass.
export default function HelpDialog({
  closeHref,
  opened,
  parents,
}: {
  closeHref: Route;
  opened: undefined | { heading: ModalHeading; article?: HelpArticleFormValue };
  parents: readonly HelpParentChoice[];
}): ReactElement {
  return (
    <RouteModal
      closeHref={closeHref}
      content={
        opened && {
          heading: opened.heading,
          body: (done) => (
            <HelpArticleForm
              key={opened.article?.id ?? 'new'}
              article={opened.article}
              parents={parents}
              onDone={done}
            />
          ),
        }
      }
    />
  );
}
