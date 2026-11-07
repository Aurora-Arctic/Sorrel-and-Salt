import AccessCards from '@/components/AccessCards';
import type { DocumentPlaceholders } from '@/components/DocumentPage/types';
import { PRIVACY_ACCESS_ROLES, PRIVACY_ACCESS_ROWS } from './access-data';

export const PRIVACY_PLACEHOLDERS: DocumentPlaceholders = {
  'access-cards': <AccessCards roles={PRIVACY_ACCESS_ROLES} rows={PRIVACY_ACCESS_ROWS} />,
};
