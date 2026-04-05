import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AppProvider, useApp } from '@/src/context/AppContext';

function RootLayoutNav() {
  const { session, loading } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inProtectedArea =
      segments[0] === '(tabs)' ||
      segments[0] === 'ride-details' ||
      segments[0] === 'e-receipt';

    if (!session && inProtectedArea) {
      router.replace('/login');
    } else if (session && !inProtectedArea) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#07080F' },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="ride-details" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="e-receipt" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" backgroundColor="#07080F" />
    </>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AppProvider>
      <RootLayoutNav />
    </AppProvider>
  );
}
