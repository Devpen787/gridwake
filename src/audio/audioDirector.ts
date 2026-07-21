import { GRID_COLUMNS } from "../game/types";

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

export type PlaySoundOptions = Readonly<{
  /** Grid x coordinate — panned horizontally when provided. */
  gridX?: number;
}>;

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

type AmbiencePhase = "probe" | "surge" | "collapse" | "result";

function gridPan(gridX: number): number {
  const normalized = gridX / Math.max(1, GRID_COLUMNS - 1);
  return clamp(normalized * 2 - 1, -1, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

class AudioDirector {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private ambienceLevel: GainNode | null = null;
  private ambienceFilter: BiquadFilterNode | null = null;
  private ambienceOsc: OscillatorNode | null = null;
  private ambienceNoise: AudioBufferSourceNode | null = null;
  private ambienceActive = false;
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
    if (muted) this.stopAmbience();
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

  play(sound: GameSound, options?: PlaySoundOptions): void {
    if (this.muted) return;

    // React StrictMode can replay mount effects in development. Collapse only
    // near-simultaneous duplicates; normal 10 Hz game events still pass.
    const nowMs = typeof performance === "undefined" ? Date.now() : performance.now();
    const previousMs = this.lastPlayedAt.get(sound);
    if (previousMs !== undefined && nowMs - previousMs < 48) return;
    this.lastPlayedAt.set(sound, nowMs);

    const context = this.ensureGraph();
    if (!context || context.state !== "running") return;

    const pan = options?.gridX === undefined ? undefined : gridPan(options.gridX);

    switch (sound) {
      case "ui-confirm":
        this.sequence([
          { frequency: 440, duration: 0.08, type: "triangle", gain: 0.055 },
          { frequency: 660, duration: 0.11, offset: 0.055, type: "triangle", gain: 0.05 },
        ], pan);
        break;
      case "possess":
        this.sequence([
          { frequency: 620, duration: 0.12, type: "sine", gain: 0.06 },
          { frequency: 930, duration: 0.18, offset: 0.06, type: "sine", gain: 0.045 },
        ], pan);
        break;
      case "intercept":
        this.sequence([
          { frequency: 980, duration: 0.055, type: "square", gain: 0.025 },
          { frequency: 720, duration: 0.09, offset: 0.025, type: "triangle", gain: 0.035 },
        ], pan);
        break;
      case "repair":
        this.sequence([
          { frequency: 392, duration: 0.13, type: "triangle", gain: 0.04 },
          { frequency: 523.25, duration: 0.18, offset: 0.075, type: "sine", gain: 0.04 },
        ], pan);
        break;
      case "damage":
        this.sequence([
          { frequency: 115, duration: 0.18, type: "sawtooth", gain: 0.065, detune: -14 },
          { frequency: 82, duration: 0.24, offset: 0.025, type: "triangle", gain: 0.05 },
        ], pan);
        break;
      case "warning":
        this.sequence([
          { frequency: 220, duration: 0.09, type: "square", gain: 0.03 },
          { frequency: 220, duration: 0.09, offset: 0.15, type: "square", gain: 0.025 },
        ], pan);
        break;
      case "pulse":
        this.sequence([
          { frequency: 130.81, duration: 0.48, type: "sine", gain: 0.065 },
          { frequency: 261.63, duration: 0.42, offset: 0.03, type: "triangle", gain: 0.05 },
          { frequency: 523.25, duration: 0.36, offset: 0.07, type: "sine", gain: 0.04 },
        ], pan);
        break;
      case "phase-surge":
        this.sequence([
          { frequency: 185, duration: 0.16, type: "sawtooth", gain: 0.04, detune: 8 },
          { frequency: 277, duration: 0.22, offset: 0.08, type: "triangle", gain: 0.045 },
          { frequency: 370, duration: 0.28, offset: 0.16, type: "sine", gain: 0.035 },
        ], pan);
        break;
      case "phase-collapse":
        this.sequence([
          { frequency: 110, duration: 0.22, type: "sawtooth", gain: 0.055, detune: -18 },
          { frequency: 82, duration: 0.32, offset: 0.1, type: "triangle", gain: 0.05 },
          { frequency: 55, duration: 0.4, offset: 0.2, type: "sine", gain: 0.04 },
        ], pan);
        break;
      case "round-held":
        this.sequence([
          { frequency: 392, duration: 0.38, type: "sine", gain: 0.045 },
          { frequency: 493.88, duration: 0.4, offset: 0.05, type: "sine", gain: 0.038 },
          { frequency: 587.33, duration: 0.48, offset: 0.1, type: "sine", gain: 0.04 },
        ], pan);
        break;
      case "round-lost":
        this.sequence([
          { frequency: 196, duration: 0.34, type: "triangle", gain: 0.05 },
          { frequency: 146.83, duration: 0.5, offset: 0.12, type: "sine", gain: 0.045 },
        ], pan);
        break;
      default: {
        const _exhaustive: never = sound;
        void _exhaustive;
        break;
      }
    }
  }

  startAmbience(): void {
    if (this.muted || this.ambienceActive) return;
    const context = this.ensureGraph();
    if (!context || !this.ambienceBus || context.state !== "running") return;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 220;
    filter.Q.value = 0.7;

    const level = context.createGain();
    level.gain.value = SILENCE;

    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 48;
    osc.connect(filter);

    const noise = context.createBufferSource();
    noise.buffer = this.noiseBuffer(context);
    noise.loop = true;
    const noiseGain = context.createGain();
    noiseGain.gain.value = 0.018;
    noise.connect(noiseGain);
    noiseGain.connect(filter);

    filter.connect(level);
    level.connect(this.ambienceBus);
    osc.start();
    noise.start();
    level.gain.setTargetAtTime(0.035, context.currentTime, 0.8);

    this.ambienceFilter = filter;
    this.ambienceLevel = level;
    this.ambienceOsc = osc;
    this.ambienceNoise = noise;
    this.ambienceActive = true;
  }

  updateAmbience(threat: number, phase: AmbiencePhase): void {
    if (!this.ambienceActive || !this.context || !this.ambienceFilter || !this.ambienceLevel || !this.ambienceOsc) {
      return;
    }
    if (this.muted) return;
    const now = this.context.currentTime;
    const threatNorm = Math.min(1, Math.max(0, threat / 100));
    const baseFreq = phase === "collapse" ? 38 : phase === "surge" ? 52 : phase === "result" ? 44 : 48;
    const cutoff = phase === "collapse"
      ? 160 + threatNorm * 90
      : phase === "surge"
        ? 240 + threatNorm * 140
        : 200 + threatNorm * 80;
    const level = phase === "result"
      ? 0.02
      : 0.028 + threatNorm * 0.025 + (phase === "collapse" ? 0.012 : 0);
    this.ambienceOsc.frequency.setTargetAtTime(baseFreq, now, 0.4);
    this.ambienceFilter.frequency.setTargetAtTime(cutoff, now, 0.35);
    this.ambienceLevel.gain.setTargetAtTime(level, now, 0.45);
  }

  duckAmbience(durationSec = 0.55): void {
    if (!this.ambienceActive || !this.context || !this.ambienceLevel || this.muted) return;
    const now = this.context.currentTime;
    const current = Math.max(SILENCE, this.ambienceLevel.gain.value);
    this.ambienceLevel.gain.cancelScheduledValues(now);
    this.ambienceLevel.gain.setValueAtTime(current, now);
    this.ambienceLevel.gain.linearRampToValueAtTime(current * 0.25, now + 0.05);
    this.ambienceLevel.gain.linearRampToValueAtTime(current, now + durationSec);
  }

  stopAmbience(): void {
    if (!this.ambienceActive) return;
    const context = this.context;
    const level = this.ambienceLevel;
    const osc = this.ambienceOsc;
    const noise = this.ambienceNoise;
    if (context && level) {
      const now = context.currentTime;
      level.gain.cancelScheduledValues(now);
      level.gain.setTargetAtTime(SILENCE, now, 0.08);
      window.setTimeout(() => {
        try {
          osc?.stop();
          noise?.stop();
        } catch {
          // already stopped
        }
        osc?.disconnect();
        noise?.disconnect();
        level.disconnect();
        this.ambienceFilter?.disconnect();
      }, 220);
    } else {
      try {
        osc?.stop();
        noise?.stop();
      } catch {
        // already stopped
      }
    }
    this.ambienceOsc = null;
    this.ambienceNoise = null;
    this.ambienceLevel = null;
    this.ambienceFilter = null;
    this.ambienceActive = false;
  }

  private noiseBuffer(context: AudioContext): AudioBuffer {
    const length = context.sampleRate * 2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x9e3779b9;
    for (let index = 0; index < length; index += 1) {
      seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) >>> 0;
      data[index] = ((seed & 0xffff) / 0xffff) * 2 - 1;
    }
    return buffer;
  }

  private ensureGraph(): AudioContext | null {
    if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return null;
    if (this.context && this.master && this.ambienceBus && this.effectsBus) return this.context;

    const context = new window.AudioContext();
    const master = context.createGain();
    master.gain.value = this.muted ? SILENCE : 0.72;
    master.connect(context.destination);

    const ambienceBus = context.createGain();
    ambienceBus.gain.value = 1;
    ambienceBus.connect(master);

    const effectsBus = context.createGain();
    effectsBus.gain.value = 1;
    effectsBus.connect(master);

    this.context = context;
    this.master = master;
    this.ambienceBus = ambienceBus;
    this.effectsBus = effectsBus;
    return context;
  }

  private sequence(tones: readonly ToneSpec[], pan?: number): void {
    for (const tone of tones) this.tone(tone, pan);
  }

  private tone({
    frequency,
    duration,
    offset = 0,
    gain = 0.04,
    type = "sine",
    detune = 0,
  }: ToneSpec, pan?: number): void {
    const context = this.context;
    const effectsBus = this.effectsBus;
    if (!context || !effectsBus || context.state !== "running") return;

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

    let output: AudioNode = envelope;
    let panner: StereoPannerNode | null = null;
    if (pan !== undefined) {
      panner = context.createStereoPanner();
      panner.pan.setValueAtTime(pan, startAt);
      envelope.connect(panner);
      output = panner;
    }

    output.connect(effectsBus);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.025);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      envelope.disconnect();
      panner?.disconnect();
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
