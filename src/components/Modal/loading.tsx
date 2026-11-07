import type { ReactElement } from 'react';
import Skeleton from '../Skeleton';

// What a route modal holds while the page that fills it is on its way: a few blocks of
// the shared `Skeleton`, one per field.
const ModalLoading = (): ReactElement => <Skeleton shape="block" count={4} />;

export default ModalLoading;
