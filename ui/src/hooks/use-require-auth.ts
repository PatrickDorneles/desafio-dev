'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { setRedirectToLanding, useSessionStore } from '@/store/session';

/**
 * Route protection for authenticated pages (ADR-0008): no token → redirect to
 * `/`; token present → validate once via `GET /auth/me` (`restore`).
 */
export function useRequireAuth() {
  const router = useRouter();
  const token = useSessionStore((state) => state.token);
  const user = useSessionStore((state) => state.user);
  const restore = useSessionStore((state) => state.restore);
  const restoreStarted = useRef(false);

  useEffect(() => {
    setRedirectToLanding(() => router.replace('/'));
  }, [router]);

  useEffect(() => {
    if (!token) {
      router.replace('/');
      return;
    }
    if (!restoreStarted.current) {
      restoreStarted.current = true;
      void restore();
    }
  }, [token, router, restore]);

  return { user, isReady: Boolean(token) };
}