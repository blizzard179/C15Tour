import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import HomeIcon from '../../../../shared/global_assets/pictos/Home.svg';
import { useAuth } from '@/context/auth';

// Bouton de la barre supérieure de l'écran carte : quitte le convoi courant
// (déconnexion) et retourne à l'écran de connexion
export default function HomeButton() {
  const { logout } = useAuth();

  const handlePress = () => {
    logout();
    router.replace('/login');
  };

  return (
    <Pressable onPress={handlePress} style={styles.button}>
      <HomeIcon width={24} height={44} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 2,
    borderColor: '#BB487C',
    elevation: 4,
  },
});
