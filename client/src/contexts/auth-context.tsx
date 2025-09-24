import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// User type
export interface User {
  id: string;
  email: string;
  name?: string;
}

// Auth response types
interface AuthResponse {
  user: User;
  authenticated: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchAuth: () => void;
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  // Authentication state query
  const authQuery = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async (): Promise<AuthResponse | null> => {
      try {
        const response = await fetch('/api/auth/me', { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 401) {
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`Authentication check failed: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Auth check failed:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refresh every minute
  });

  // Update auth state when query data changes
  useEffect(() => {
    const authData = authQuery.data;
    
    if (authData?.user && authData.authenticated) {
      setUser(authData.user);
      setIsAuthenticated(true);
    } else if (!authQuery.isLoading) {
      // Only clear auth state after loading is complete
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [authQuery.data, authQuery.isLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, name }: { email: string; name?: string }): Promise<AuthResponse> => {
      const response = await apiRequest('POST', '/api/auth/login', { email, name });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(error.message || 'Login failed');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.user && data.authenticated) {
        setUser(data.user);
        setIsAuthenticated(true);
        // Invalidate all queries to refresh data for the new user
        queryClient.invalidateQueries();
      }
    },
    onError: (error) => {
      console.error('Login failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await apiRequest('POST', '/api/auth/logout');
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
    },
    onSuccess: () => {
      setUser(null);
      setIsAuthenticated(false);
      // Clear all cached data
      queryClient.clear();
    },
    onError: (error) => {
      console.error('Logout failed:', error);
      // Even if logout fails on server, clear local state
      setUser(null);
      setIsAuthenticated(false);
      queryClient.clear();
    }
  });

  // Auth actions
  const login = async (email: string, name?: string) => {
    await loginMutation.mutateAsync({ email, name });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refetchAuth = () => {
    authQuery.refetch();
  };

  const isLoading = authQuery.isLoading || loginMutation.isPending || logoutMutation.isPending;

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refetchAuth
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}