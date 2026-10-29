"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SimulationSessionState } from "./useSimulationStore";

/** Backend-computed artifacts of one restoration case study (no frontend calculations). */
type CaseStudy = {
  /** Solved state before the faults were injected. */
  normal: SimulationSessionState | null;
  before: SimulationSessionState | null;
  after: SimulationSessionState | null;
  comparison: any;
  plan: any;
  /** BFS reachability trace on the faulted network. */
  bfs: any;
  /** Dijkstra route search to the hospital on the faulted network. */
  search: any;
  /** Dijkstra route to the hospital on the restored network. */
  route: any;
};
export const emptyCaseStudy: CaseStudy = {
  normal: null,
  before: null,
  after: null,
  comparison: null,
  plan: null,
  bfs: null,
  search: null,
  route: null,
};
export const useCaseStudyStore = create<
  CaseStudy & { set: (v: Partial<CaseStudy>) => void }
>()(
  persist(
    (set) => ({
      ...emptyCaseStudy,
      set: (v) => set(v),
    }),
    {
      name: "gridsec-case-study",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
export function electricallyFeasible(s: SimulationSessionState) {
  return (
    s.solver_provenance === "AC_SOLVED" &&
    s.power_flow.power_balance.converged &&
    s.power_flow.violations.length === 0
  );
}
