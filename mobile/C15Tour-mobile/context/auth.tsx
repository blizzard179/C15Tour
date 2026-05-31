import { createContext, useContext, useState, ReactNode } from 'react';

type Role = 'participant' | 'leader';

type Trip = {
  trip_id: number;
  trip_name: string;
  trip_speed?: number | string | null;
  [key: string]: unknown;
};

type AuthContextType = {
  trip: Trip | null;
  role: Role | null;
  isLoggedIn: boolean;
  login: (trip: Trip, role: Role) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  function login(trip: Trip, role: Role) {
    setTrip(trip);
    setRole(role);
  }

  function logout() {
    setTrip(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ trip, role, isLoggedIn: trip !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
