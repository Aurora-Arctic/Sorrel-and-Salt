import PageColumn from '@/components/PageColumn';
import PageHeader from '@/components/PageHeader';
import PageNav from '@/components/PageNav';
import PageWithNav from '@/components/PageWithNav';
import Skeleton from '@/components/Skeleton';

// An entry's name is not known yet, so its heading is a bar; the menu and sections are the ones every entry has.
export const CompendiumEntrySkeleton = () => (
  <PageColumn as="div">
    <PageHeader pendingTitle />
    <PageWithNav as="div">
      <PageNav
        label="On This Page"
        entries={[
          { href: '#stock', label: 'Stock' },
          { href: '#details', label: 'Details' },
          { href: '#forms', label: 'Forms' },
          { href: '#references', label: 'References' },
        ]}
      />
      <section className="page-frame__section">
        <Skeleton shape="line" count={3} quiet />
        <Skeleton shape="line" count={3} quiet />
      </section>
    </PageWithNav>
  </PageColumn>
);
