import { create } from 'zustand';
import type { TransmissionEntry } from '../components/TransmissionLog';

interface LocalLogState {
  entries: TransmissionEntry[];
  add: (entry: Omit<TransmissionEntry, 'id' | 'transmittedAt'> & { transmittedAt?: Date }) => void;
  clear: () => void;
}

/**
 * In-memory rolling log of transmissions observed this session (own PTT,
 * quick actions, remote talkers). Complements the persisted Supabase log and
 * powers the compact panel on the radio screen instantly.
 */
export const useLocalLog = create<LocalLogState>((set) => ({
  entries: [],
  add: (entry) =>
    set((state) => ({
      entries: [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          transmittedAt: entry.transmittedAt ?? new Date(),
          ...entry,
        },
        ...state.entries,
      ].slice(0, 50),
    })),
  clear: () => set({ entries: [] }),
}));

export default useLocalLog;
