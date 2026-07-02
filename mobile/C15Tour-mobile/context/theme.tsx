import { createContext, useContext, useState, ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ColorScheme = 'light' | 'dark';

type ThemeContextType = {
  colorScheme: ColorScheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

// Thème clair/sombre de l'application : suit le thème du système par défaut,
// mais peut être forcé manuellement par l'utilisateur (toggleTheme), auquel cas
// cette préférence explicite prend le pas sur le thème système.
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemTheme = useSystemColorScheme();
  const [override, setOverride] = useState<ColorScheme | null>(null);

  const colorScheme: ColorScheme = override ?? (systemTheme === 'dark' ? 'dark' : 'light');

  function toggleTheme() {
    setOverride(current => {
      const effective = current ?? colorScheme;
      return effective === 'dark' ? 'light' : 'dark';
    });
  }

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook d'accès au thème courant, à utiliser dans tout composant enfant de AppThemeProvider
export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within AppThemeProvider');
  return ctx;
}
