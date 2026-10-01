import type DataLoader from 'dataloader';
import type { Session } from '../../lib/session';

export type LoaderFactory<K, V, C = K> = (session: Session | null) => DataLoader<K, V, C>;

export type Built<F extends Record<string, LoaderFactory<never, unknown>>> = {
  [Name in keyof F]: ReturnType<F[Name]>;
};
