'use client';

import { create } from 'zustand';
import {
  ApiError,
  registerOnUnauthorized,
  TOKEN_STORAGE_KEY,
} from '@/lib/api/client';
import {
  login as loginRequest,
  me as meRequest,
  register as registerRequest,
} from '@/lib/api/endpoints';
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  UserProfile,
} from '@/lib/schemas';

type RedirectFn = () => void;

let redirectToLanding: RedirectFn = () => {
  if (typeof window !== 'undefined') {
    window.location.assign('/');
  }
};

/** Lets hooks/components swap in the Next.js router for client-side redirects. */
export function setRedirectToLanding(redirect: RedirectFn): void {
  redirectToLanding = redirect;
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function persistToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token === null) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } else {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

interface SessionState {
  token: string | null;
  user: UserProfile | null;
  setSession: (session: AuthResponse) => void;
  clearSession: () => void;
  login: (payload: LoginInput) => Promise<void>;
  register: (payload: RegisterInput) => Promise<void>;
  logout: () => void;
  restore: () => Promise<void>;
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  token: readStoredToken(),
  user: null,

  setSession: (session) => {
    persistToken(session.accessToken);
    set({ token: session.accessToken, user: session.user });
  },

  clearSession: () => {
    persistToken(null);
    set({ token: null, user: null });
  },

  login: async (payload) => {
    const session = await loginRequest(payload);
    get().setSession(session);
  },

  register: async (payload) => {
    const session = await registerRequest(payload);
    get().setSession(session);
  },

  logout: () => {
    get().clearSession();
    redirectToLanding();
  },

  restore: async () => {
    if (!get().token) return;
    try {
      const user = await meRequest();
      set({ user });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        get().clearSession();
        redirectToLanding();
      }
    }
  },
}));

// ADR-0008: any 401 across the app clears the session and sends the user back to `/`.
registerOnUnauthorized(() => {
  useSessionStore.getState().clearSession();
  redirectToLanding();
});