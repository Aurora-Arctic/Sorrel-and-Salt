'use client';

import type { ReactElement } from 'react';
import { preloadOnIntent, usePreloadWhenIdle } from '../../lib/use-lazy-module';
import { StockIcon } from '../IconTip';
import Modal, { ModalButton } from '../Modal';
import StockDialogForm, { stockFormModule } from './lazy-form';
import type { StockDialogProps, StockJarButtonProps } from './types';

// The stock button on a coven card: a `ModalButton` opening a dialog with the coven's jars of the ingredient listed beside the chosen
// jar's fields, the whole sent as one `saveStock`. The form loads apart from these openers, once the page is idle and as a person
// reaches for the button (claude-docs/components/stock-dialog.md, "The button and the dialog").

const StockDialog = (props: StockDialogProps): ReactElement => {
  usePreloadWhenIdle(stockFormModule);
  return (
    <ModalButton
      tip="Edit Stock"
      label={<StockIcon />}
      ariaLabel={`Edit Stock, ${props.ingredientName}`}
      className="icon-tip__edit"
      eyebrow="Edit Stock"
      title={props.ingredientName}
      size="listed"
      preload={preloadOnIntent(stockFormModule)}
    >
      {(close) => <StockDialogForm {...props} close={close} />}
    </ModalButton>
  );
};

/** The same dialog opened by something other than its pencil, such as a menu item on a compendium card; `returnTo` names where the focus goes on close. */
export function StockDialogModal({
  onClose,
  returnTo,
  coven,
  ...props
}: StockDialogProps & {
  onClose: () => void;
  returnTo?: () => HTMLElement | null | undefined;
  /** The coven the dialog writes to, put in the eyebrow and the dialog's name; for pages that are not a coven's, where nothing else says whose jars these are. */
  coven?: string;
}): ReactElement {
  return (
    <Modal
      eyebrow={coven ? `Edit Stock for ${coven}` : 'Edit Stock'}
      title={props.ingredientName}
      size="listed"
      onClose={onClose}
      returnTo={returnTo}
    >
      {(close) => <StockDialogForm {...props} close={close} />}
    </Modal>
  );
}

/** The same dialog behind a button of the caller's own, opening on one form (`openOn`), so what is saved and how it is refused cannot differ between the two doors. */
export const StockJarButton = ({
  ariaLabel,
  className,
  children,
  ...props
}: StockJarButtonProps): ReactElement => {
  usePreloadWhenIdle(stockFormModule);
  return (
    <ModalButton
      label={children}
      ariaLabel={ariaLabel}
      className={className ?? ''}
      eyebrow="Edit Stock"
      title={props.ingredientName}
      size="listed"
      preload={preloadOnIntent(stockFormModule)}
    >
      {(close) => <StockDialogForm {...props} close={close} />}
    </ModalButton>
  );
};

export default StockDialog;
export type { StockData, StockDialogProps, StockForm, StockJar } from './types';
