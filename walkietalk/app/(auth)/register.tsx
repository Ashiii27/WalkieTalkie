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

const CALLSIGN_RE = /^[A-Z0-9-]{3,10}$/;

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [callsign, setCallsign] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChangeCallsign = (value: string) => {
    // Enforce uppercase alphanumeric + hyphen while typing.
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
    setCallsign(cleaned);
  };

  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required.';
    if (!password || password.length < 6) return 'Password must be at least 6 characters.';
    if (!CALLSIGN_RE.test(callsign)) {
      return 'Callsign must be 3–10 characters: A–Z, 0–9, hyphens only.';
    }
    return null;
  };

  const onRegister = async () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_* in .env.');
      return;
    }

    setLoading(true);
    try {
      // 1. Uniqueness check against Supabase before submitting.
      const { data: existing, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('callsign', callsign)
        .maybeSingle();
      if (checkError) throw checkError;
      if (existing) {
        setError('That callsign is already taken. Choose another.');
        setLoading(false);
        return;
      }

      // 2. Create the auth user.
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;
      if (!userId) {
        throw new Error('Registration succeeded but no user id was returned.');
      }

      // 3. Create the profile row with the chosen callsign.
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        callsign,
      });
      if (profileError) throw profileError;

      SoundManager.playTuning();

      // If email confirmation is required there may be no active session yet.
      if (signUpData.session) {
        router.replace('/(app)');
      } else {
        setError('Account created! Check your email to confirm, then sign in.');
        setTimeout(() => router.replace('/(auth)/login'), 1800);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed.');
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
            <Text style={styles.tagline}>◦ NEW OPERATOR ◦</Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>REGISTER</Text>

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
              placeholder="min 6 characters"
              placeholderTextColor={colors.displayTextDim}
              secureTextEntry
            />

            <Text style={styles.label}>CALLSIGN</Text>
            <TextInput
              style={[styles.input, styles.callsignInput]}
              value={callsign}
              onChangeText={onChangeCallsign}
              placeholder="RED-FOX-1"
              placeholderTextColor={colors.displayTextDim}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
            />
            <Text style={styles.hint}>3–10 chars · A–Z 0–9 and hyphens · always uppercase</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={onRegister}
              disabled={loading}
              style={({ pressed }) => [styles.button, { opacity: pressed || loading ? 0.8 : 1 }]}
            >
              {loading ? (
                <ActivityIndicator color={colors.black} />
              ) : (
                <Text style={styles.buttonText}>GET ON AIR</Text>
              )}
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>ALREADY REGISTERED? </Text>
              <Link href="/(auth)/login" style={styles.link}>
                SIGN IN
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
    marginBottom: spacing.lg,
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
  callsignInput: {
    letterSpacing: 3,
    fontWeight: '700',
  },
  hint: {
    fontFamily: fonts.mono,
    color: colors.muted,
    fontSize: 10,
    marginTop: 6,
    letterSpacing: 0.5,
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
