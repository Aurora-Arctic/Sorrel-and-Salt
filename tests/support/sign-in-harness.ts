import { act, fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { labelled } from './interact';
import { useSearchParams } from '../components/SignInPanel/search-params';

// What the password sign-in form's tests share: Better Auth's client mocked at the three calls the form makes, so each
// test sets the answer the server gives, and next/navigation with the panel's stand-in query.
export const signInEmail = vi.fn();
export const signUpEmail = vi.fn();
export const getSession = vi.fn();
export const assign = vi.fn();

export async function authClientMock() {
  return {
    ...(await vi.importActual<typeof import('@/lib/auth-client')>('@/lib/auth-client')),
    signIn: { social: vi.fn(), email: signInEmail },
    signUp: { email: signUpEmail },
    getSession,
  };
}

export async function navigationMock() {
  return { ...(await import('./next-navigation')), useSearchParams };
}

export function resetSignInHarness(): void {
  signInEmail.mockReset();
  signUpEmail.mockReset();
  getSession.mockReset();
  assign.mockReset();
}

export const press = (element: Element) =>
  act(async () => {
    fireEvent.click(element);
  });

export const field = (label: string) => labelled(screen, label);

export const typeInField = (label: string, value: string) =>
  fireEvent.change(field(label), { target: { value } });
