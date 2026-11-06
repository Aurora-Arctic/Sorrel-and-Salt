import { AdminPageSkeleton } from '@/components/AdminNav/skeleton';
import PageHeader from '@/components/PageHeader';
import Skeleton from '@/components/Skeleton';

export const CuratorSkeleton = () => (
  <div className="admin-index">
    <PageHeader title="Curator" />
    <Skeleton shape="line" count={5} quiet />
  </div>
);

export const CuratorCompendiumSkeleton = () => (
  <AdminPageSkeleton page="compendium" open="/curator/compendium" />
);
export const CategoriesSkeleton = () => (
  <AdminPageSkeleton page="categories" open="/curator/categories" />
);
export const CategoryGroupsSkeleton = () => (
  <AdminPageSkeleton page="categories" open="/curator/category-groups" />
);
export const FormsSkeleton = () => <AdminPageSkeleton page="forms" open="/curator/forms" />;
export const FormGroupsSkeleton = () => (
  <AdminPageSkeleton page="forms" open="/curator/form-groups" />
);
export const DeitiesSkeleton = () => <AdminPageSkeleton page="deities" open="/curator/deities" />;
export const DeityTraditionsSkeleton = () => (
  <AdminPageSkeleton page="deities" open="/curator/deity-traditions" />
);
export const CelestialBodiesSkeleton = () => (
  <AdminPageSkeleton page="astrology" open="/curator/celestial-bodies" />
);
export const ZodiacSignsSkeleton = () => (
  <AdminPageSkeleton page="astrology" open="/curator/zodiac-signs" />
);
