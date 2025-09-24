import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // Check if user is logged in
  const { data: authData, isLoading: isCheckingAuth, error } = useQuery<{ user: User } | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 60000, // Cache for 1 minute instead of infinity
    refetchOnWindowFocus: true, // Re-check auth on focus
    queryFn: async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.status === 401) return null;
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return await res.json();
      } catch {
        return null;
      }
    }
  });

  useEffect(() => {
    if (authData?.user) {
      setUser(authData.user);
    } else if (!isCheckingAuth && (error || authData === null)) {
      // Only set user to null after auth check is complete
      setUser(null);
    }
  }, [authData, error, isCheckingAuth]);

  const loginMutation = useMutation<{ user: User }, Error, { email: string; name?: string }>({
    mutationFn: async ({ email, name }) => {
      const response = await apiRequest('POST', '/api/auth/login', { email, name });
      return response.json();
    }
  });

  useEffect(() => {
    if (loginMutation.data?.user) {
      setUser(loginMutation.data.user);
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
    }
  }, [loginMutation.data, queryClient]);

  const logoutMutation = useMutation<{ message: string }, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/logout');
      return response.json();
    }
  });

  useEffect(() => {
    if (logoutMutation.isSuccess) {
      setUser(null);
      queryClient.clear();
    }
  }, [logoutMutation.isSuccess, queryClient]);

  const login = async (email: string, name?: string) => {
    await loginMutation.mutateAsync({ email, name });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const isLoading = isCheckingAuth || loginMutation.isPending || logoutMutation.isPending;

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}