import { AsyncLocalStorage } from 'node:async_hooks';
import type { WriterTransaction } from './types';

type Transaction = WriterTransaction;

// The transaction of the `withAudit` call this code runs inside, so a finder reads on the write's connection; the store
// stays module-private so only `runInWriteTransaction` can set it.
const store = new AsyncLocalStorage<Transaction>();

/** The transaction of the enclosing `withAudit` callback, or `undefined` outside one. */
export function currentWriteTransaction(): Transaction | undefined {
  return store.getStore();
}

/** Runs `fn` with `tx` as the current write transaction, for `fn` and everything it awaits. */
export function runInWriteTransaction<T>(tx: Transaction, fn: () => T): T {
  return store.run(tx, fn);
}
