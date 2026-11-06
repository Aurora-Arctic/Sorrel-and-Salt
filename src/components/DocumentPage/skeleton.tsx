import PageHeader from '../PageHeader';
import PageWithNav from '../PageWithNav';
import Skeleton from '../Skeleton';

// A site document with its text still to come: the page's own article box and head, the title the
// document already has and bars where its date and text go.
export const DocumentSkeleton = ({ title }: { title: string }) => (
  <PageWithNav as="div" className="document-page">
    <div className="document-page__head">
      <p className="document-page__updated">
        <Skeleton shape="line" quiet />
      </p>
      <PageHeader title={title} />
    </div>
    <div className="document-page__body">
      <Skeleton shape="line" count={10} quiet />
    </div>
  </PageWithNav>
);
