import AccessCards from '@/components/AccessCards';
import type { DocumentPlaceholders } from '@/components/DocumentPage/types';
import { PRIVACY_ACCESS_ROLES, PRIVACY_ACCESS_ROWS } from './access-data';

/** What the privacy policy draws where its text holds a placeholder paragraph: the access cards under Who Can See What. */
export const PRIVACY_PLACEHOLDERS: DocumentPlaceholders = {
  'access-cards': <AccessCards roles={PRIVACY_ACCESS_ROLES} rows={PRIVACY_ACCESS_ROWS} />,
};
