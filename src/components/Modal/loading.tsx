import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';

// What a route modal holds while the page that fills it is on its way: the shared `Skeleton` of a
// form.
const ModalLoading = (): ReactElement => <Skeleton shape="form" />;

export default ModalLoading;
