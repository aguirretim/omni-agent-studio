'use client';

import { useCallback, useRef } from 'react';

const STORAGE_KEY         = 'omni-audio-enabled';
const STORAGE_KEY_VOLUME  = 'omni-audio-volume';
const DEFAULT_VOLUME      = 40; // 0–100

/** Returns the current enabled preference (defaults to true). */
export function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) !== 'false';
}

/** Persists the enabled preference. */
export function setAudioEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

/** Returns the current volume (0–100, default 40). */
export function getAudioVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_VOLUME;
  const v = parseInt(localStorage.getItem(STORAGE_KEY_VOLUME) ?? '', 10);
  return isNaN(v) ? DEFAULT_VOLUME : Math.max(0, Math.min(100, v));
}

/** Persists the volume preference (0–100). */
export function setAudioVolume(volume: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_VOLUME, String(Math.max(0, Math.min(100, volume))));
}

/**
 * Plays a crisp two-tone chime using the Web Audio API (no external dependencies).
 * Respects the `omni-audio-enabled` localStorage preference.
 * Returns a stable `chime()` function safe to call from any event handler.
 */
export function useAudioNotification() {
  const ctxRef = useRef<AudioContext | null>(null);

  const chime = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!isAudioEnabled()) return;

    // Lazily create AudioContext on first user gesture to satisfy browser autoplay policy
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    const ctx = ctxRef.current;

    // Browsers auto-suspend AudioContext after async gaps (e.g. after await fetch).
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const peak = 0.3 * (getAudioVolume() / 100); // scale max gain by volume pref

    const playTone = (freq: number, when: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      // Bell envelope: fast linear attack (10ms) → long exponential decay (500ms).
      // linearRampToValueAtTime from 0 is clean (no click).
      // exponentialRampToValueAtTime gives the natural bell tail.
      gainNode.gain.setValueAtTime(0, when);
      gainNode.gain.linearRampToValueAtTime(Math.max(0.001, peak), when + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, when + 0.5);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(when);
      osc.stop(when + 0.51);
    };

    // 50ms lookahead: standard practice to avoid scheduling audio in the past
    // after async gaps (await fetch, await resume, JS execution overhead).
    const now = ctx.currentTime + 0.05;
    playTone(880,  now);        // A5
    playTone(1320, now + 0.15); // E6 — perfect fifth up, starts after first note peaks
  }, []);

  return chime;
}
