'use client';

import React, { useEffect } from 'react';
import { useGameStore } from '@/store/useGameStore';

/**
 * Procedural Web Audio Synthesizer for Monument Valley Ambient Chimes & Runes.
 * Zero external MP3 assets required; generates crystalline pentatonic chimes
 * when the mascot arrives at anchors, unlocks gates, or pulses runes.
 */
export function AmbientAudioEngine() {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const currentAnchor = useGameStore((s) => s.currentAnchor);
  const activeModal = useGameStore((s) => s.activeModal);
  const isShortlisted = useGameStore((s) => s.isShortlisted);

  const playChime = (frequencies: number[], duration = 0.65) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(
          0.045,
          ctx.currentTime + idx * 0.08 + 0.04
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + idx * 0.08 + duration
        );

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + duration);
      });
    } catch {
      // Ignore autoplay policy restrictions prior to first gesture
    }
  };

  useEffect(() => {
    if (currentAnchor === 'Anchor_Summit_Astrolabe') {
      playChime([523.25, 659.25, 783.99, 1046.5], 0.9);
    } else if (currentAnchor.startsWith('Anchor_Portal_')) {
      playChime([440, 554.37, 659.25], 0.65);
    } else if (currentAnchor === 'Anchor_Gate_SignUp') {
      playChime([329.63, 440, 523.25], 0.6);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAnchor]);

  useEffect(() => {
    if (activeModal) {
      playChime([587.33, 880], 0.4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal]);

  useEffect(() => {
    if (isShortlisted) {
      playChime([392.0, 523.25, 659.25, 783.99], 0.85);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShortlisted]);

  return null;
}
