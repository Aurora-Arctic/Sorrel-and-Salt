import type { ComponentProps, ReactElement } from 'react';
import Modal from '../src/components/Modal';
import { Reopenable } from './reopenable';

/**
 * A form drawn in the modal the admin pages open it in, with Open Again once it is closed
 * (./reopenable.tsx). The modal's own heading props pass straight through.
 */
export function InModal({
  children,
  ...heading
}: Omit<ComponentProps<typeof Modal>, 'onClose'>): ReactElement {
  return (
    <Reopenable>
      {(close) => (
        <Modal {...heading} onClose={close}>
          {children}
        </Modal>
      )}
    </Reopenable>
  );
}
