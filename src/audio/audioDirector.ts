export type GameSound =
  | "ui-confirm"
  | "possess"
  | "intercept"
  | "repair"
  | "damage"
  | "warning"
  | "pulse"
  | "phase-surge"
  | "phase-collapse"
  | "round-held"
  | "round-lost";

const MUTE_STORAGE_KEY = "gridwake.audio.muted.v1";
const SILENCE = 0.0001;

export function readMutedPreference(storage?: Storage | null): boolean {
  try {
    const target = storage ?? (typeof window === "undefined" ? null : window.localStorage);
    return target?.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMutedPreference(muted: boolean, storage?: Storage | null): void {
  try {
    const target = storage ?? (typeof window === "undefined" ? null : window.localStorage);
    target?.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // Storage can be unavailable in privacy modes. Audio still works for this page.
  }
}

type ToneSpec = Readonly<{
  frequency: number;
  duration: number;
  offset?: number;
  gain?: number;
  type?: OscillatorType;
  detune?: number;
}>;

class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = readMutedPreference();
  private readonly lastPlayedAt = new Map<GameSound, number>();

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    writeMutedPreference(muted);
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(muted ? SILENCE : 0.72, now, 0.015);
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  async unlock(): Promise<boolean> {
    const context = this.ensureGraph();
    if (!context) return false;
    try {
      if (context.state === "suspended") await context.resume();
      return context.state === "running";
    } catch {
      return false;
    }
  }

  play(sound: GameSound): void {
    if (this.muted) return;

    // React StrictMode can replay mount effects in development. Collapse only
    // near-simultaneous duplicates; normal 10 Hz game events still pass.
    const nowMs = typeof performance === "undefined" ? Date.now() : performance.now();
    const previousMs = this.lastPlayedAt.get(sound);
    if (previousMs !== undefined && nowMs - previousMs < 48) return;
    this.lastPlayedAt.set(sound, nowMs);

    const context = this.ensureGraph();
    if (!context || context.state !== "running") return;

    switch (sound) {
      case "ui-confirm":
        this.sequence([
          { frequency: 440, duration: 0.08, type: "triangle", gain: 0.055 },
          { frequency: 660, duration: 0.11, offset: 0.055, type: "triangle", gain: 0.05 },
        ]);
        break;
      case "possess":
        this.sequence([
          { frequency: 620, duration: 0.12, type: "sine", gain: 0.06 },
          { frequency: 930, duration: 0.18, offset: 0.06, type: "sine", gain: 0.045 },
        ]);
        break;
      case "intercept":
        this.sequence([
          { frequency: 980, duration: 0.055, type: "square", gain: 0.025 },
          { frequency: 720, duration: 0.09, offset: 0.025, type: "triangle", gain: 0.035 },
        ]);
        break;
      case "repair":
        this.sequence([
          { frequency: 392, duration: 0.13, type: "triangle", gain: 0.04 },
          { frequency: 523.25, duration: 0.18, offset: 0.075, type: "sine", gain: 0.04 },
        ]);
        break;
      case "damage":
        this.sequence([
          { frequency: 115, duration: 0.18, type: "sawtooth", gain: 0.065, detune: -14 },
          { frequency: 82, duration: 0.24, offset: 0.025, type: "triangle", gain: 0.05 },
        ]);
        break;
      case "warning":
        this.sequence([
          { frequency: 220, duration: 0.09, type: "square", gain: 0.03 },
          { frequency: 220, duration: 0.09, offset: 0.15, type: "square", gain: 0.025 },
        ]);
        break;
      case "pulse":
        this.sequence([
          { frequency: 130.81, duration: 0.48, type: "sine", gain: 0.065 },
          { frequency: 261.63, duration: 0.42, offset: 0.03, type: "triangle", gain: 0.05 },
          { frequency: 523.25, duration: 0.36, offset: 0.07, type: "sine", gain: 0.04 },
        ]);
        break;
      case "phase-surge":
        this.sequence([
          { frequency: 185, duration: 0.16, type: "sawtooth", gain: 0.04, detune: 8 },
          { frequency: 277, duration: 0.22, offset: 0.08, type: "triangle", gain: 0.045 },
          { frequency: 370, duration: 0.28, offset: 0.16, type: "sine", gain: 0.035 },
        ]);
        break;
      case "phase-collapse":
        this.sequence([
          { frequency: 110, duration: 0.22, type: "sawtooth", gain: 0.055, detune: -18 },
          { frequency: 82, duration: 0.32, offset: 0.1, type: "triangle", gain: 0.05 },
          { frequency: 55, duration: 0.4, offset: 0.2, type: "sine", gain: 0.04 },
        ]);
        break;
      case "round-held":
        this.sequence([
          { frequency: 392, duration: 0.38, type: "sine", gain: 0.045 },
          { frequency: 493.88, duration: 0.4, offset: 0.05, type: "sine", gain: 0.038 },
          { frequency: 587.33, duration: 0.48, offset: 0.1, type: "sine", gain: 0.04 },
        ]);
        break;
      case "round-lost":
        this.sequence([
          { frequency: 196, duration: 0.34, type: "triangle", gain: 0.05 },
          { frequency: 146.83, duration: 0.5, offset: 0.12, type: "sine", gain: 0.045 },
        ]);
        break;
      default: {
        const _exhaustive: never = sound;
        void _exhaustive;
        break;
      }
    }
  }

  private ensureGraph(): AudioContext | null {
    if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return null;
    if (this.context && this.master) return this.context;

    const context = new window.AudioContext();
    const master = context.createGain();
    master.gain.value = this.muted ? SILENCE : 0.72;
    master.connect(context.destination);
    this.context = context;
    this.master = master;
    return context;
  }

  private sequence(tones: readonly ToneSpec[]): void {
    for (const tone of tones) this.tone(tone);
  }

  private tone({
    frequency,
    duration,
    offset = 0,
    gain = 0.04,
    type = "sine",
    detune = 0,
  }: ToneSpec): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master || context.state !== "running") return;

    const startAt = context.currentTime + Math.max(0, offset);
    const peakAt = startAt + Math.min(0.018, duration * 0.25);
    const endAt = startAt + Math.max(0.035, duration);

    const oscillator = context.createOscillator();
    const envelope = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.detune.setValueAtTime(detune, startAt);

    envelope.gain.setValueAtTime(SILENCE, startAt);
    envelope.gain.exponentialRampToValueAtTime(Math.max(SILENCE, gain), peakAt);
    envelope.gain.exponentialRampToValueAtTime(SILENCE, endAt);

    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.025);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      envelope.disconnect();
    }, { once: true });
  }
}

export const gameAudio = new AudioDirector();

export function installAudioUnlockListeners(): () => void {
  if (typeof window === "undefined") return () => undefined;

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  const unlock = () => {
    void gameAudio.unlock().finally(remove);
  };

  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });
  return remove;
}
