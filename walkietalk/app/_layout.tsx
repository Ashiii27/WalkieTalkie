import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { SoundManager } from '../lib/sounds';
import { colors, fonts } from '../constants/theme';

function RootNavigator() {
  const session = useAuth((s) => s.session);
  const initializing = useAuth((s) => s.initializing);
  const initAuth = useAuth((s) => s.init);
  const segments = useSegments();
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  // Bootstrap auth + preload sounds once.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      cleanup = await initAuth();
      setAuthReady(true);
    })();
    void SoundManager.init();
    return () => {
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect based on auth state.
  useEffect(() => {
    if (!authReady || initializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [session, segments, authReady, initializing, router]);

  if (!authReady || initializing) {
    return (
      <View style={styles.loading}>
        <Text style={styles.logo}>WALKIETALK</Text>
        <ActivityIndicator color={colors.displayText} size="large" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: fonts.led,
    color: colors.displayText,
    fontSize: 32,
    letterSpacing: 6,
    fontWeight: '700',
    textShadowColor: colors.displayGlow,
    textShadowRadius: 14,
  },
});
