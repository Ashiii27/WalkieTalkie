/**
 * Static channel metadata. The signaling server tracks live occupancy; these
 * definitions provide names / privacy flags for channels 1–25. This mirrors
 * (and can be overridden by) the `channels` table in Supabase.
 */
export interface ChannelDef {
  number: number;
  name: string | null;
  isPrivate: boolean;
  /** demo passcode for private channels (in production, verify server-side) */
  passcode?: string;
}

export const TOTAL_CHANNELS = 25;

const NAMED: Record<number, { name: string; isPrivate?: boolean; passcode?: string }> = {
  1: { name: 'General' },
  2: { name: 'Squad' },
  3: { name: 'Emergency' },
  4: { name: 'Convoy' },
  5: { name: 'Base Camp', isPrivate: true, passcode: '1234' },
  6: { name: 'Trail' },
  7: { name: 'Ops', isPrivate: true, passcode: '0000' },
  8: { name: 'Weather' },
  9: { name: 'Highway' },
  10: { name: 'Truckers' },
};

export const CHANNELS: ChannelDef[] = Array.from({ length: TOTAL_CHANNELS }, (_, i) => {
  const number = i + 1;
  const meta = NAMED[number];
  return {
    number,
    name: meta?.name ?? null,
    isPrivate: meta?.isPrivate ?? false,
    passcode: meta?.passcode,
  };
});

export function getChannel(number: number): ChannelDef {
  return CHANNELS[number - 1] ?? { number, name: null, isPrivate: false };
}
