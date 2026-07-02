import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/context/auth';

// Groupe d'écrans principal (post-connexion). Malgré son nom "(tabs)" hérité du
// template Expo, la navigation par onglets a été remplacée par une simple pile
// (Stack) entre la carte (explore), l'accueil et l'écran de chargement.
// Protège l'accès : redirige vers la connexion si l'utilisateur n'est pas authentifié.
export default function TabLayout() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="explore" />
      <Stack.Screen name="index" />
      <Stack.Screen name="loader" />
    </Stack>
  );
}
