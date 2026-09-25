import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { getToken, saveToken, removeToken } from '../services/secureStore';

type Role = 'passenger' | 'driver' | null;

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  token: string | null;
  role: Role;
  isLoading: boolean;
}

interface AuthContextProps extends AuthState {
  signIn: (token: string, user: any, role: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    role: null,
    isLoading: true,
  });

  useEffect(() => {
    const checkToken = async () => {
      const token = await getToken();
      if (token) {
        // Ideally validate token with backend here
        setState({
          isAuthenticated: true,
          user: {}, // Dummy user, replace with real fetched user
          token,
          role: 'passenger', // Dummy role, needs to be persisted or decoded from JWT
          isLoading: false,
        });
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    };
    checkToken();
  }, []);

  const signIn = async (token: string, user: any, role: Role) => {
    await saveToken(token);
    setState({
      isAuthenticated: true,
      user,
      token,
      role,
      isLoading: false,
    });
  };

  const signOut = async () => {
    await removeToken();
    setState({
      isAuthenticated: false,
      user: null,
      token: null,
      role: null,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
