import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AppProvider, useApp } from '@/src/context/AppContext';

function RootLayoutNav() {
  const { session, loading, isAdmin } = useApp();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAdminArea     = segments[0] === '(tabs)';
    const inPassengerArea = segments[0] === '(passenger)';
    const inSharedArea    = segments[0] === 'ride-details' || segments[0] === 'e-receipt';
    const inProtected     = inAdminArea || inPassengerArea || inSharedArea;

    if (!session && inProtected) {
      router.replace('/login');
      return;
    }

    if (session && !inProtected) {
      // Route to the correct area based on role
      router.replace(isAdmin ? '/(tabs)' : '/(passenger)');
      return;
    }

    // Prevent passengers from accessing admin tabs
    if (session && inAdminArea && !isAdmin) {
      router.replace('/(passenger)');
      return;
    }

    // Prevent admin from landing in passenger area (edge case)
    if (session && inPassengerArea && isAdmin) {
      router.replace('/(tabs)');
    }
  }, [session, loading, isAdmin, segments]);

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
        <Stack.Screen name="(passenger)" />
        <Stack.Screen name="ride-details" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="e-receipt"    options={{ animation: 'slide_from_right' }} />
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
