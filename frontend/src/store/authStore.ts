import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem("violet_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  accessToken: localStorage.getItem("violet_access_token"),
  refreshToken: localStorage.getItem("violet_refresh_token"),
  setAuth: (accessToken, refreshToken, user) => {
    localStorage.setItem("violet_access_token", accessToken);
    localStorage.setItem("violet_refresh_token", refreshToken);
    localStorage.setItem("violet_user", JSON.stringify(user));
    set({ accessToken, refreshToken, user });
  },
  updateUser: (updatedUser) => {
    set((state) => {
      if (!state.user) return state;
      const newUser = { ...state.user, ...updatedUser };
      localStorage.setItem("violet_user", JSON.stringify(newUser));
      return { user: newUser };
    });
  },
  logout: () => {
    localStorage.removeItem("violet_access_token");
    localStorage.removeItem("violet_refresh_token");
    localStorage.removeItem("violet_user");
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
