import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';

// What a route modal holds while the page that fills it is on its way
// (M9.18): the shared `Skeleton` of a form, so the modal opens on the press
// rather than after the page.
const ModalLoading = (): ReactElement => <Skeleton shape="form" />;

export default ModalLoading;
