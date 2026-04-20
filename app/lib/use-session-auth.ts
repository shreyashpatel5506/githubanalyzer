"use client";

import { useEffect, useState } from "react";

type SessionUser = {
  userId: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
};

type AuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: SessionUser | null;
};

export function useSessionAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    isLoaded: false,
    isSignedIn: false,
    user: null,
  });

  useEffect(() => {
    let mounted = true;

    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (res) => {
        if (!mounted) return;
        const data = await res.json();
        setState({
          isLoaded: true,
          isSignedIn: !!data?.authenticated,
          user: data?.authenticated ? data.user : null,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setState({
          isLoaded: true,
          isSignedIn: false,
          user: null,
        });
      });

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
