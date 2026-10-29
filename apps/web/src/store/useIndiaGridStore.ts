"use client";
import { create } from "zustand";
import type { SimulationSessionState } from "./useSimulationStore";
import network from "@/data/indiaNetwork.json";
import { calculateGridMetrics } from "./gridMetrics";
export const indiaRegions = [
  { id: "ALL", name: "All India" },
  { id: "NR", name: "Northern" },
  { id: "WR", name: "Western" },
  { id: "SR", name: "Southern" },
  { id: "ER", name: "Eastern" },
  { id: "NER", name: "North Eastern" },
];
const aliases: Record<string, string[]> = {
  Delhi: ["Delhi NCR"],
  "Jammu and Kashmir": ["Jammu & Kashmir"],
  "Himachal Pradesh": ["Himachal Pradesh", "Punjab / HP"],
  Punjab: ["Punjab / HP"],
  "Andhra Pradesh": ["Andhra Pradesh", "AP / Telangana"],
  Telangana: ["Telangana", "AP / Telangana"],
  "Arunachal Pradesh": ["Arunachal / Assam"],
  Assam: ["Assam", "Arunachal / Assam"],
};
export function nodesForState(state: string) {
  return network.nodes.filter(
    (n) => !state || (aliases[state] || [state]).includes(n.state),
  );
}
export interface IndiaSnapshot {
  revision: number;
  generation: number;
  served: number;
  faults: number;
  violations: number;
  action: string;
}
interface IndiaStore {
  selectedNode: string;
  selectedState: string;
  region: string;
  session: SimulationSessionState | null;
  sessionId: string | null;
  loading: boolean;
  error: string | null;
  history: IndiaSnapshot[];
  generationCapacity: number;
  selectNode: (id: string) => void;
  selectState: (name: string) => void;
  setRegion: (id: string) => void;
  ensure: () => Promise<void>;
  reset: () => Promise<void>;
  action: (kind: string, target: string) => Promise<void>;
}
export const useIndiaGridStore = create<IndiaStore>((set, get) => {
  const accept = (data: any) => {
    const s = data.session as SimulationSessionState;
    if (!s || s.network_id !== "INDIA_GRID_59")
      throw Error("The national model returned an unexpected network.");
    const history = get().history;
    set({
      session: s,
      loading: false,
      error: null,
      generationCapacity:
        data.topology?.generators?.reduce(
          (v: number, g: any) => v + (g.Pmax || 0),
          0,
        ) || get().generationCapacity,
      history: [
        ...history.filter((h) => h.revision !== s.revision),
        {
          revision: s.revision,
          generation: s.kpis.total_generation_mw,
          served: s.kpis.total_served_mw,
          faults: s.kpis.active_faults_count,
          violations: s.power_flow.violations.length,
          action: s.action_log.at(-1)?.description || "Model solved",
        },
      ].slice(-15),
    });
  };
  const request = async (
    kind: "load" | "reset" | "action",
    actionType?: string,
    target?: string,
  ) => {
    if (get().loading) return;
    set({ loading: true, error: null });
    const id = get().sessionId || "INDIA-" + crypto.randomUUID();
    set({ sessionId: id });
    try {
      const url =
        kind === "load"
          ? `/api/gridzero/session?network_id=INDIA_GRID_59&session_id=${encodeURIComponent(id)}`
          : `/api/gridzero/session/${kind}`;
      const r = await fetch(
        url,
        kind === "load"
          ? undefined
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                kind === "reset"
                  ? { session_id: id, network_id: "INDIA_GRID_59", seed: 42 }
                  : {
                      session_id: id,
                      action_type: actionType,
                      target_id: target,
                    },
              ),
            },
      );
      const d = await r.json();
      if (!r.ok)
        throw Error(
          typeof d.detail === "string"
            ? d.detail
            : `National model unavailable (${r.status})`,
        );
      if (kind === "reset") set({ history: [] });
      accept(d);
    } catch (e) {
      set({
        loading: false,
        error:
          e instanceof Error
            ? e.message
            : "Could not solve the reference model.",
      });
    }
  };
  return {
    selectedNode: "",
    selectedState: "",
    region: "ALL",
    session: null,
    sessionId: null,
    loading: false,
    error: null,
    history: [],
    generationCapacity: 0,
    selectNode: (id) => {
      const n = network.nodes.find((n) => n.id === id);
      set({ selectedNode: id, selectedState: "", region: n?.region || "ALL" });
    },
    selectState: (name) =>
      set({ selectedState: name, selectedNode: "", region: "ALL" }),
    setRegion: (id) => set({ region: id, selectedNode: "", selectedState: "" }),
    ensure: async () => {
      if (!get().session) await request("load");
    },
    reset: () => request("reset"),
    action: (kind, target) => request("action", kind, target),
  };
});
export function nationalMetrics(
  session: SimulationSessionState | null,
  options: { state?: string; region?: string; node?: string } = {},
) {
  const nodes = nodesForState(options.state || "").filter(
    (n) =>
      (!options.region ||
        options.region === "ALL" ||
        n.region === options.region) &&
      (!options.node || n.id === options.node),
  );
  const ids = new Set(nodes.map((n) => "BUS-" + n.id));
  const assets = session?.buildings_3d.filter((b) => ids.has(b.bus_id)) || [];
  const lines =
    session?.power_flow.lines.filter(
      (l) => ids.has(l.from_bus) || ids.has(l.to_bus),
    ) || [];
  return {
    nodes,
    assets,
    lines,
    ...calculateGridMetrics(assets, lines),
    faults:
      session?.active_faults.filter(
        (f) => !f.cleared && lines.some((l) => l.line_id === f.asset_id),
      ).length || 0,
    violations:
      session?.power_flow.violations.filter(
        (v) =>
          ids.has(v.element_id) ||
          lines.some((l) => l.line_id === v.element_id),
      ).length || 0,
  };
}
