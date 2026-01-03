import { createContext } from 'react';

export interface User {
  id: number;
  username: string;
  role: string;
  mustChangePassword?: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (
    username: string,
    password: string,
    keepLoggedIn: boolean
  ) => Promise<
    { mustChangePassword?: boolean; user?: { username?: string; role?: string } } | void
  >;
  logout: (reason?: 'manual' | 'timeout') => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

