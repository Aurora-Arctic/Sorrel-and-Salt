'use client';

import type { ComponentProps, ReactElement } from 'react';
import { useLazyModule } from '../../lib/use-lazy-module';
import Modal from '../Modal';
import ModalLoading from '../Modal/loading';
import { pendingHeading } from './quick-look-head';

// The duplicate row's and the spell builder's Quick Look, loaded when first asked for: the dialog
// pulls in the details marks and the entry summary, which a page with a form on it does not need
// until someone presses an eye. The frame opens at once under the row's names while the code arrives.

const load = () => import('./quick-look');

export function LazyDuplicateQuickLook(
  props: ComponentProps<Awaited<ReturnType<typeof load>>['DuplicateQuickLook']>,
): ReactElement {
  const module = useLazyModule(load, true);
  if (module) return <module.DuplicateQuickLook {...props} />;
  return (
    <Modal
      {...pendingHeading(props.entry)}
      onClose={props.onClose}
      returnTo={props.returnTo}
      loading
    >
      <ModalLoading />
    </Modal>
  );
}
