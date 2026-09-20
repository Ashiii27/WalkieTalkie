import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

/**
 * Names of the preloaded sound effects.
 */
export type SoundName = 'click' | 'tone' | 'static' | 'tuning';

/**
 * Static requires so Metro bundles the assets. We ship .wav placeholders that
 * are generated at build time; swap them for .mp3 files with the same names if
 * you prefer. Missing/broken files never crash the app — every access is
 * wrapped in try/catch and load failures are swallowed.
 */
const SOUND_ASSETS: Record<SoundName, number> = {
  click: require('../assets/sounds/click.wav'),
  tone: require('../assets/sounds/tone.wav'),
  static: require('../assets/sounds/static.wav'),
  tuning: require('../assets/sounds/tuning.wav'),
};

/**
 * Singleton that preloads all sound effects once and plays them on demand.
 * Everything is defensive: audio should embellish the experience, never break it.
 */
class SoundManagerImpl {
  private sounds: Partial<Record<SoundName, Audio.Sound>> = {};
  private loaded = false;
  private loading: Promise<void> | null = null;

  /** Preload every sound. Safe to call multiple times. */
  async init(): Promise<void> {
    if (this.loaded) return;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[sounds] failed to set audio mode', err);
      }

      await Promise.all(
        (Object.keys(SOUND_ASSETS) as SoundName[]).map(async (name) => {
          try {
            const { sound } = await Audio.Sound.createAsync(SOUND_ASSETS[name], {
              shouldPlay: false,
              volume: 0.9,
            });
            this.sounds[name] = sound;
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn(`[sounds] failed to preload "${name}"`, err);
          }
        })
      );

      this.loaded = true;
    })();

    return this.loading;
  }

  /** Play a preloaded sound from the beginning. Never throws. */
  private async play(name: SoundName): Promise<void> {
    try {
      const sound = this.sounds[name];
      if (!sound) {
        // Attempt a lazy load if init hasn't finished yet.
        await this.init();
      }
      const s = this.sounds[name];
      if (!s) return;
      await s.setPositionAsync(0);
      await s.replayAsync();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[sounds] failed to play "${name}"`, err);
    }
  }

  playClick(): void {
    void this.play('click');
  }

  playTone(): void {
    void this.play('tone');
  }

  playStatic(): void {
    void this.play('static');
  }

  playTuning(): void {
    void this.play('tuning');
  }

  /** Unload everything (used on app teardown, rarely needed). */
  async dispose(): Promise<void> {
    await Promise.all(
      Object.values(this.sounds).map(async (s) => {
        try {
          await s?.unloadAsync();
        } catch {
          // ignore
        }
      })
    );
    this.sounds = {};
    this.loaded = false;
    this.loading = null;
  }
}

export const SoundManager = new SoundManagerImpl();
export default SoundManager;
