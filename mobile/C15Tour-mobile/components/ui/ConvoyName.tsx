import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth';

// Affiche le nom du convoi courant dans la barre supérieure de l'écran carte
export default function ConvoyName() {
  const { trip } = useAuth();
  const convoyName = trip?.trip_name?.trim() || 'C15 Fiesta Tour #1';

  return (
    <View style={styles.container}>
      <Text numberOfLines={1} style={styles.label}>
        {convoyName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 2,
    borderColor: 'rgba(187, 72, 124, 0.5)',
  },
  label: {
    color: '#BB487C',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
