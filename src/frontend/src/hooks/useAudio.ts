import { useCallback, useRef } from "react";

function getAudioContext(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    return new Ctx();
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  gainVal = 0.25,
  type: OscillatorType = "sine",
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function ensureCtx(
  ctxRef: React.MutableRefObject<AudioContext | null>,
): AudioContext | null {
  if (!ctxRef.current || ctxRef.current.state === "closed") {
    ctxRef.current = getAudioContext();
  }
  if (ctxRef.current?.state === "suspended") {
    ctxRef.current.resume();
  }
  return ctxRef.current;
}

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bgNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode }[]>([]);
  const bgIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutedRef = useRef(false);

  const playClueReveal = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = ensureCtx(ctxRef);
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [330, 440, 550, 660];
    for (let i = 0; i < freqs.length; i++) {
      playTone(ctx, freqs[i], now + i * 0.08, 0.18, 0.18);
    }
  }, []);

  const playFoundIt = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = ensureCtx(ctxRef);
    if (!ctx) return;
    const now = ctx.currentTime;
    const arpeggio = [261, 329, 392, 523, 659];
    for (let i = 0; i < arpeggio.length; i++) {
      playTone(ctx, arpeggio[i], now + i * 0.07, 0.2, 0.22);
    }
  }, []);

  const playLevelUp = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = ensureCtx(ctxRef);
    if (!ctx) return;
    const now = ctx.currentTime;
    const seq: [number, number][] = [
      [392, 0],
      [494, 0.12],
      [587, 0.24],
      [784, 0.38],
    ];
    for (const [f, t] of seq) {
      playTone(ctx, f, now + t, 0.3, 0.28, "triangle");
    }
  }, []);

  const playGameComplete = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = ensureCtx(ctxRef);
    if (!ctx) return;
    const now = ctx.currentTime;
    const seq: [number, number][] = [
      [261, 0],
      [329, 0.1],
      [392, 0.2],
      [523, 0.32],
      [659, 0.46],
      [784, 0.6],
      [1047, 0.76],
    ];
    for (const [f, t] of seq) {
      playTone(ctx, f, now + t, 0.35, 0.25);
    }
  }, []);

  const stopBgMusic = useCallback(() => {
    if (bgIntervalRef.current) {
      clearTimeout(bgIntervalRef.current);
      bgIntervalRef.current = null;
    }
    for (const { osc, gain } of bgNodesRef.current) {
      try {
        const ctx = ctxRef.current;
        if (ctx) {
          const now = ctx.currentTime;
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.stop(now + 0.6);
        }
      } catch {}
    }
    bgNodesRef.current = [];
  }, []);

  const startBgMusic = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = ensureCtx(ctxRef);
    if (!ctx) return;
    stopBgMusic();

    const baseFreqs = [130.8, 196, 261.6];
    const nodes: { osc: OscillatorNode; gain: GainNode }[] = [];
    for (let i = 0; i < baseFreqs.length; i++) {
      const freq = baseFreqs[i];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.detune.setValueAtTime(i * 3, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(
        0.06 - i * 0.015,
        ctx.currentTime + 1.5,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      nodes.push({ osc, gain });
    }
    bgNodesRef.current = nodes;

    const pentatonic = [261.6, 293.7, 329.6, 392, 440, 523.3];
    let step = 0;
    function schedulePluck() {
      if (!ctxRef.current || bgNodesRef.current.length === 0) return;
      const c = ctxRef.current;
      if (c.state === "suspended") return;
      const freq = pentatonic[step % pentatonic.length];
      step++;
      playTone(c, freq, c.currentTime, 1.2, 0.04, "sine");
      const delay = 800 + Math.random() * 1200;
      bgIntervalRef.current = setTimeout(schedulePluck, delay);
    }
    bgIntervalRef.current = setTimeout(schedulePluck, 1000);
  }, [stopBgMusic]);

  const setMuted = useCallback(
    (muted: boolean) => {
      mutedRef.current = muted;
      if (muted) {
        stopBgMusic();
      }
    },
    [stopBgMusic],
  );

  return {
    playClueReveal,
    playFoundIt,
    playLevelUp,
    playGameComplete,
    startBgMusic,
    stopBgMusic,
    setMuted,
  };
}
