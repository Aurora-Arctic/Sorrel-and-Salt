import type { ReactElement } from 'react';
import PageFrame from '../PageFrame';
import PageHeader from '../PageHeader';
import type { NarrowPanelPageProps } from './types';
import { cx } from '@/lib/class-names';

// A page and its skeleton both draw it, so the skeleton's heading lands where the page's does.
const NarrowPanelPage = ({
  as,
  contextRow,
  title,
  lede,
  className,
  children,
}: NarrowPanelPageProps): ReactElement => (
  <>
    {contextRow}
    <PageFrame as={as} narrow>
      <div className={cx('page-frame__section panel', className)}>
        <PageHeader
          className="card-page-header"
          headingClassName="auth-title"
          title={title}
          lede={lede}
        />
        {children}
      </div>
    </PageFrame>
  </>
);

export default NarrowPanelPage;
