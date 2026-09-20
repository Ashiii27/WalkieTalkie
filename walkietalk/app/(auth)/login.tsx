import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { SoundManager } from '../../lib/sounds';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_* in .env.');
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      SoundManager.playTuning();
      router.replace('/(app)');
    } catch (err: any) {
      setError(err?.message ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>WALKIETALK</Text>
            <Text style={styles.tagline}>◦ OVER AND OUT ◦</Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>SIGN IN</Text>

            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="operator@base.com"
              placeholderTextColor={colors.displayTextDim}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.displayTextDim}
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={onLogin}
              disabled={loading}
              style={({ pressed }) => [styles.button, { opacity: pressed || loading ? 0.8 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>TUNE IN</Text>
              )}
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>NO CALLSIGN YET? </Text>
              <Link href="/(auth)/register" style={styles.link}>
                REGISTER
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontFamily: fonts.led,
    color: colors.displayText,
    fontSize: 34,
    letterSpacing: 6,
    fontWeight: '700',
    textShadowColor: colors.displayGlow,
    textShadowRadius: 16,
  },
  tagline: {
    fontFamily: fonts.mono,
    color: colors.accent,
    fontSize: 12,
    letterSpacing: 3,
    marginTop: 8,
  },
  panel: {
    backgroundColor: colors.body,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.bodyLight,
    padding: spacing.lg,
  },
  panelTitle: {
    fontFamily: fonts.led,
    color: colors.displayText,
    fontSize: 18,
    letterSpacing: 3,
    marginBottom: spacing.md,
    fontWeight: '700',
  },
  label: {
    fontFamily: fonts.mono,
    color: colors.textDim,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.panel,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    borderRadius: radii.sm,
    color: colors.displayText,
    fontFamily: fonts.mono,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.mono,
    fontSize: 12,
    marginTop: spacing.md,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonText: {
    color: colors.black,
    fontFamily: fonts.led,
    fontSize: 16,
    letterSpacing: 3,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    fontFamily: fonts.mono,
    color: colors.textDim,
    fontSize: 12,
  },
  link: {
    fontFamily: fonts.mono,
    color: colors.displayText,
    fontSize: 12,
    fontWeight: '700',
  },
});
