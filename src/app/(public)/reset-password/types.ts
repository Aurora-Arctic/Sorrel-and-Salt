export interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}
