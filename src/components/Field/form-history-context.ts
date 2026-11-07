import { createContext, useContext } from 'react';
import type { FormHistory } from './types';

// What `useFormHistory` returns, handed down so the buttons and the live
// region need no props. Null outside a form that has a history.
export const FormHistoryContext = createContext<FormHistory | null>(null);

export const useFormHistoryContext = (): FormHistory | null => useContext(FormHistoryContext);
