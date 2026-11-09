export interface InvitePageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
}
