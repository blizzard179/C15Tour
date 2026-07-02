import { Redirect } from 'expo-router';
import { useAuth } from '@/context/auth';

// Écran racine "/" : redirige immédiatement vers la carte si l'utilisateur est
// déjà authentifié, sinon vers l'écran de connexion.
export default function Index() {
  const { isLoggedIn } = useAuth();
  return <Redirect href={isLoggedIn ? '/(tabs)/explore' : '/login'} />;
}
