import type { ReactNode } from 'react';
import type { ProviderId } from '../../lib/types';

export interface PublicFrameProps {
  /** The providers the server holds credentials for, from `configuredProviders()`, for the sign-in dialog. */
  configured: readonly ProviderId[];
  children: ReactNode;
}
