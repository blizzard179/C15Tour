import { useAppTheme } from '@/context/theme';

export function useColorScheme() {
  return useAppTheme().colorScheme;
}
