import { useAppTheme } from '@/context/theme';

// Version modifiée par rapport au template Expo par défaut (qui utilisait
// directement react-native useColorScheme) : délègue au thème personnalisé de
// l'application (context/theme.tsx), qui peut être surchargé manuellement par
// l'utilisateur et pas seulement suivre le thème du système.
export function useColorScheme() {
  return useAppTheme().colorScheme;
}
