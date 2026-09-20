import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Profile {
  id: string;
  callsign: string;
  created_at?: string;
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  /** Bootstraps session from storage + subscribes to auth changes. */
  init: () => Promise<() => void>;
  /** Fetch (and cache) the profile row for the current user. */
  loadProfile: () => Promise<Profile | null>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),

  init: async () => {
    if (!isSupabaseConfigured) {
      set({ initializing: false });
      return () => {};
    }

    try {
      const { data } = await supabase.auth.getSession();
      set({ session: data.session ?? null });
      if (data.session) {
        await get().loadProfile();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[auth] getSession failed', err);
    } finally {
      set({ initializing: false });
    }

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session });
      if (session) {
        await get().loadProfile();
      } else {
        set({ profile: null });
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  },

  loadProfile: async () => {
    const session = get().session;
    if (!session || !isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, callsign, created_at')
        .eq('id', session.user.id)
        .single();
      if (error) throw error;
      set({ profile: data as Profile });
      return data as Profile;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[auth] loadProfile failed', err);
      return null;
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[auth] signOut failed', err);
    }
    set({ session: null, profile: null });
  },
}));

export default useAuth;
