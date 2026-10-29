import type { Building3DState, LineResult } from "./useSimulationStore";
type GridAsset = Pick<
  Building3DState,
  | "demand_mw"
  | "served_mw"
  | "generation_mw"
  | "critical_load_mw"
  | "power_state"
>;
const finite = (value: number) => (Number.isFinite(value) ? value : 0);
/** Allocated supply is not a claim of AC feasibility. Disconnected assets cannot receive it. */
export function allocatedSupply(asset: GridAsset) {
  return asset.power_state === "BLACKOUT"
    ? 0
    : Math.min(
        Math.max(0, finite(asset.demand_mw)),
        Math.max(0, finite(asset.served_mw)),
      );
}
export function calculateGridMetrics(
  assets: GridAsset[],
  lines: Pick<LineResult, "loading_percent">[] = [],
) {
  const demand = assets.reduce(
      (v, a) => v + Math.max(0, finite(a.demand_mw)),
      0,
    ),
    served = assets.reduce((v, a) => v + allocatedSupply(a), 0),
    generation = assets.reduce((v, a) => v + finite(a.generation_mw), 0),
    critical = assets.reduce(
      (v, a) =>
        v +
        Math.min(
          Math.max(0, finite(a.critical_load_mw)),
          Math.max(0, finite(a.demand_mw)),
        ),
      0,
    ),
    criticalServed = assets.reduce(
      (v, a) =>
        v +
        Math.min(Math.max(0, finite(a.critical_load_mw)), allocatedSupply(a)),
      0,
    );
  return {
    demand,
    served,
    unserved: Math.max(0, demand - served),
    generation,
    critical,
    criticalServed,
    utilization: lines.reduce(
      (v, l) => Math.max(v, finite(l.loading_percent)),
      0,
    ),
  };
}
