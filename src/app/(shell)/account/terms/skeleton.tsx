import PageFrame from '@/components/PageFrame';
import { TERMS_TITLE } from '@/components/TermsAgreement/head';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';

// The page's own heading is real text, so a wait shows the one level-one heading the page keeps.
export const AccountTermsSkeleton = () => (
  <PageFrame as="div" narrow>
    <section className="page-frame__section panel">
      <PageHeader title={TERMS_TITLE} />
      <Skeleton shape="block" quiet />
    </section>
  </PageFrame>
);
