import { useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ConvoyLoader, type LoaderProfile } from '@/app/(tabs)/loader';
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

  const role = useMemo(() => normalizeRole(params.role), [params.role]);
  const code = useMemo(() => normalizeCode(params.code), [params.code]);
  const profile: LoaderProfile = role ?? 'participant';

  useEffect(() => {
    let isCancelled = false;

    async function joinTrip() {
      if (!role || !code) {
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
        router.replace('/(tabs)/explore');
      } catch (error) {
        if (isCancelled) return;

        const errorMessage = error instanceof Error ? error.message : 'Erreur reseau. Verifiez votre connexion.';
        Alert.alert('Erreur', errorMessage, [{ text: 'OK', onPress: () => router.replace('/login') }]);
      }
    }

    joinTrip();

    return () => {
      isCancelled = true;
    };
  }, [code, login, role, router]);

  return <ConvoyLoader profile={profile} />;
}
