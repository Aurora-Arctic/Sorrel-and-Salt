import PageHeader from '../PageHeader';
import PageNav from '../PageNav';
import PageWithNav from '../PageWithNav';
import Skeleton from '../Skeleton';
import './index.scss';

// A site document with its text still to come: the page's own article box, head and jump menu, the
// title the document already has and bars where its date, lede, menu and text go.
export const DocumentSkeleton = ({ title }: { title: string }) => (
  <PageWithNav as="div" className="document-page">
    <div className="document-page__head">
      <p className="document-page__updated">
        <Skeleton shape="line" quiet />
      </p>
      <PageHeader title={title} lede={<Skeleton shape="line" quiet />} />
    </div>
    <PageNav label="On This Page" entries={[]} collapsible pending />
    <div className="document-page__body">
      <Skeleton shape="line" count={10} quiet />
    </div>
  </PageWithNav>
);
