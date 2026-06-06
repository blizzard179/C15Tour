import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { API_BASE_URL } from '@/constants/api';
import { useAuth } from '@/context/auth';

type Role = 'participant' | 'leader';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeRole(value: string | string[] | undefined): Role | null {
  const role = getSingleParam(value);

  if (role === 'participant' || role === 'leader') {
    return role;
  }

  if (role === 'organisateur' || role === 'organizer') {
    return 'leader';
  }

  return null;
}

function normalizeCode(value: string | string[] | undefined) {
  const code = getSingleParam(value)?.trim();
  return code ? code.toUpperCase() : null;
}

export default function JoinScreen() {
  const params = useLocalSearchParams<{ role?: string; code?: string }>();
  const router = useRouter();
  const { login } = useAuth();
  const [message, setMessage] = useState('Chargement du convoi...');

  const role = useMemo(() => normalizeRole(params.role), [params.role]);
  const code = useMemo(() => normalizeCode(params.code), [params.code]);

  useEffect(() => {
    let isCancelled = false;

    async function joinTrip() {
      if (!role || !code) {
        setMessage('QR code invalide.');
        Alert.alert('QR code invalide', 'Ce QR code ne contient pas les informations du convoi.', [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
        return;
      }

      const endpoint =
        role === 'participant'
          ? `${API_BASE_URL}/api/trips/code/${encodeURIComponent(code)}`
          : `${API_BASE_URL}/api/trips/admin/${encodeURIComponent(code)}`;

      try {
        const response = await fetch(endpoint, { method: 'GET' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Convoi introuvable.');
        }

        if (isCancelled) return;

        login(data, role);
        router.replace('/(tabs)/loader');
      } catch (error) {
        if (isCancelled) return;

        const errorMessage = error instanceof Error ? error.message : 'Erreur reseau. Verifiez votre connexion.';
        setMessage(errorMessage);
        Alert.alert('Erreur', errorMessage, [{ text: 'OK', onPress: () => router.replace('/login') }]);
      }
    }

    joinTrip();

    return () => {
      isCancelled = true;
    };
  }, [code, login, role, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#BB487C" size="large" />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  message: {
    color: '#BB487C',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
