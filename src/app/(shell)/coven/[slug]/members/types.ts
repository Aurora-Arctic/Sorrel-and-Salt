export interface MembersPageProps {
  searchParams: Promise<{ after?: string | string[]; before?: string | string[] }>;
}
