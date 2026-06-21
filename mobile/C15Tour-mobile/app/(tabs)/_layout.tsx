import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/context/auth';

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
