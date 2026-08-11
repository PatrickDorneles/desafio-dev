'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setRedirectToLanding, useSessionStore } from '@/store/session';

export function useSession() {
  const router = useRouter();
  const token = useSessionStore((state) => state.token);
  const user = useSessionStore((state) => state.user);
  const login = useSessionStore((state) => state.login);
  const register = useSessionStore((state) => state.register);
  const logout = useSessionStore((state) => state.logout);

  useEffect(() => {
    setRedirectToLanding(() => router.replace('/'));
  }, [router]);

  return { token, user, login, register, logout };
}