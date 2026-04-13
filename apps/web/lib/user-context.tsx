'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export interface CurrentUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'OPERATOR';
}

interface UserContextValue {
  user: CurrentUser | null;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({ user: null, loading: true });

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5001/api';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => setUser(data as CurrentUser | null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return <UserContext.Provider value={{ user, loading }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
