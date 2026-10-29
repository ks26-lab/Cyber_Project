"use client";
import { useViewPrefs } from "@/store/useViewPrefs";

/**
 * Short, quiet cues synthesized with Web Audio (no audio files, nothing autoplays).
 * A cue plays only after the viewer has enabled sound, which is itself a user gesture.
 */
export type Cue = "incident" | "switch" | "warning" | "restored" | "complete";
let context: AudioContext | null = null;

const notes: Record<Cue, [number, number, number][]> = {
  // [frequency Hz, start s, duration s]
  incident: [
    [392, 0, 0.18],
    [311, 0.2, 0.32],
  ],
  switch: [[880, 0, 0.06]],
  warning: [
    [330, 0, 0.12],
    [330, 0.16, 0.12],
  ],
  restored: [
    [523, 0, 0.14],
    [659, 0.14, 0.22],
  ],
  complete: [
    [523, 0, 0.14],
    [659, 0.14, 0.14],
    [784, 0.28, 0.34],
  ],
};

export function playCue(cue: Cue) {
  if (!useViewPrefs.getState().sound) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    for (const [frequency, start, duration] of notes[cue]) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = cue === "warning" ? "triangle" : "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.06, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain).connect(context.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    }
  } catch {
    /* Audio is optional. */
  }
}

export function SoundToggle() {
  const { sound, setSound } = useViewPrefs();
  return (
    <button
      type="button"
      className="quiet-button"
      aria-pressed={sound}
      aria-label={sound ? "Mute sound effects" : "Enable sound effects"}
      onClick={() => {
        setSound(!sound);
        if (!sound) setTimeout(() => playCue("switch"), 0);
      }}
    >
      {sound ? "Sound on" : "Sound off"}
    </button>
  );
}
