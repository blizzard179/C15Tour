import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
// Variante fournie par le template Expo par défaut, utilisée uniquement sur le
// build web (résolution de fichier `.web.ts` par Metro). Contrairement à la
// version native (use-color-scheme.ts), celle-ci n'a pas été adaptée pour
// utiliser le thème personnalisé de l'application (context/theme.tsx) : le
// build web (non maintenu activement) suivrait donc uniquement le thème système.
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
