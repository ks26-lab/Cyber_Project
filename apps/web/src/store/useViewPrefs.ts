"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** Per-viewer presentation preferences. They never affect simulation state. */
export const useViewPrefs = create<{
  dusk: boolean;
  reducedEffects: boolean;
  sound: boolean;
  setDusk: (v: boolean) => void;
  setReducedEffects: (v: boolean) => void;
  setSound: (v: boolean) => void;
}>()(
  persist(
    (set) => ({
      dusk: false,
      reducedEffects: false,
      // Muted until the viewer opts in.
      sound: false,
      setDusk: (dusk) => set({ dusk }),
      setReducedEffects: (reducedEffects) => set({ reducedEffects }),
      setSound: (sound) => set({ sound }),
    }),
    {
      name: "gridsec-view-prefs",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
