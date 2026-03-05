// frontend/src/utils/feedback.ts
// Sound and vibration feedback utilities for P6 — uses Capacitor Haptics + Web Audio API

import { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

/** Custom DOM event dispatched same-tab when prefs change via saveFeedbackPrefs() */
const PREFS_CHANGED_EVENT = "cem-feedback-prefs-changed";

// ─── Vibration ───────────────────────────────────────────────────────────────

export type VibrationEvent =
  | "qr_success"
  | "form_error"
  | "doc_approved"
  | "doc_rejected"
  | "registration_complete"
  | "destructive_confirm";

const VIBRATION_PATTERNS: Record<VibrationEvent, number[]> = {
  qr_success:            [100],
  form_error:            [50, 50, 50],
  doc_approved:          [200],
  doc_rejected:          [50, 50, 50, 50, 50],
  registration_complete: [300],
  destructive_confirm:   [100, 50, 100],
};

async function getHaptics() {
  try {
    const mod = await import("@capacitor/haptics");
    return mod;
  } catch {
    return null;
  }
}

/**
 * Trigger haptic vibration for a named event.
 * Silently skipped on web builds or if hapticsEnabled is false.
 */
export async function vibrate(event: VibrationEvent, hapticsEnabled = true): Promise<void> {
  if (!hapticsEnabled) return;
  if (!Capacitor.isNativePlatform()) return;

  const haptics = await getHaptics();
  if (!haptics) return;

  const { Haptics, ImpactStyle } = haptics;
  const pattern = VIBRATION_PATTERNS[event];

  try {
    for (let i = 0; i < pattern.length; i++) {
      const duration = pattern[i];
      if (i % 2 === 0) {
        // Impact on even indexes (active pulse)
        const style = duration >= 200 ? ImpactStyle.Heavy : duration >= 100 ? ImpactStyle.Medium : ImpactStyle.Light;
        await Haptics.impact({ style });
      }
      // Pause between pulses
      if (i < pattern.length - 1) {
        await new Promise<void>(resolve => setTimeout(resolve, pattern[i]));
      }
    }
  } catch {
    // Haptics not available — swallow silently
  }
}

// ─── Sound (Web Audio API only — no bundled files) ────────────────────────────

export type SoundEvent =
  | "qr_success"
  | "registration_complete"
  | "error"
  | "notification";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Play a programmatically generated tone — no audio files bundled. */
function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
  startDelay = 0,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + startDelay);

  gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startDelay + 0.02);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startDelay + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + startDelay);
  osc.stop(ctx.currentTime + startDelay + duration + 0.05);
}

const SOUND_SEQUENCES: Record<SoundEvent, () => void> = {
  qr_success: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 880, 0.15, "sine", 0.25, 0);
    playTone(ctx, 1100, 0.15, "sine", 0.25, 0.16);
  },
  registration_complete: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    // Short fanfare: C-E-G ascending
    playTone(ctx, 523, 0.18, "sine", 0.3, 0);
    playTone(ctx, 659, 0.18, "sine", 0.3, 0.2);
    playTone(ctx, 784, 0.35, "sine", 0.3, 0.4);
  },
  error: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 300, 0.2, "sawtooth", 0.15, 0);
    playTone(ctx, 220, 0.2, "sawtooth", 0.1, 0.22);
  },
  notification: () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 700, 0.1, "sine", 0.2, 0);
    playTone(ctx, 900, 0.12, "sine", 0.15, 0.12);
  },
};

/**
 * Play a named sound event via Web Audio API synthesis.
 * No audio files required; silently no-ops if Web Audio is unavailable
 * or soundEnabled is false.
 * Automatically resumes suspended AudioContext (browser autoplay policy).
 */
export function playSound(event: SoundEvent, soundEnabled = true): void {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      // Resume then play once running
      ctx.resume().then(() => {
        try { SOUND_SEQUENCES[event]?.(); } catch { /* noop */ }
      }).catch(() => { /* autoplay blocked */ });
      return;
    }
    SOUND_SEQUENCES[event]?.();
  } catch {
    // Web Audio unavailable — swallow silently
  }
}

// ─── Unified hook ─────────────────────────────────────────────────────────────

export interface FeedbackPrefs {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

/**
 * useFeedback — reads preferences from localStorage and exposes trigger helpers.
 * Use inside React components to trigger contextual effects.
 *
 * @example
 * const { triggerVibration, triggerSound } = useFeedback();
 * triggerVibration("qr_success");
 * triggerSound("qr_success");
 */
/**
 * useFeedback — reactive hook that responds to pref changes within the same tab
 * and across tabs (storage events). Callbacks are stable across renders.
 */
export function useFeedback(): {
  triggerVibration: (event: VibrationEvent) => void;
  triggerSound: (event: SoundEvent) => void;
  prefs: FeedbackPrefs;
} {
  const [prefs, setPrefs] = useState<FeedbackPrefs>(loadFeedbackPrefs);

  useEffect(() => {
    const refresh = () => setPrefs(loadFeedbackPrefs());
    // Cross-tab updates via Web Storage API
    window.addEventListener("storage", refresh);
    // Same-tab updates via custom event dispatched by saveFeedbackPrefs()
    window.addEventListener(PREFS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(PREFS_CHANGED_EVENT, refresh);
    };
  }, []);

  const triggerVibration = useCallback((event: VibrationEvent) => {
    vibrate(event, prefs.hapticsEnabled);
  }, [prefs.hapticsEnabled]);

  const triggerSound = useCallback((event: SoundEvent) => {
    playSound(event, prefs.soundEnabled);
  }, [prefs.soundEnabled]);

  return { triggerVibration, triggerSound, prefs };
}

// ─── Preference persistence ───────────────────────────────────────────────────

const PREFS_KEY = "cem_feedback_prefs";

export function loadFeedbackPrefs(): FeedbackPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as FeedbackPrefs;
  } catch { /* noop */ }

  // Default: both ON for native, both OFF for web
  const isNative = Capacitor.isNativePlatform();
  return { soundEnabled: isNative, hapticsEnabled: isNative };
}

export function saveFeedbackPrefs(prefs: FeedbackPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    // Notify all useFeedback() hooks in the same tab immediately
    window.dispatchEvent(new CustomEvent(PREFS_CHANGED_EVENT));
  } catch { /* noop */ }
}
