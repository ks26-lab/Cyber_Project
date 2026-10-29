import ts from "typescript";
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const code = ts.transpileModule(
  fs.readFileSync(
    new URL("../src/store/gridMetrics.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;
const exports = {};
vm.runInNewContext(code, { exports });
const { calculateGridMetrics, allocatedSupply } = exports;
const disconnected = {
  demand_mw: 5,
  served_mw: 5,
  generation_mw: 0,
  critical_load_mw: 2,
  power_state: "BLACKOUT",
};
assert.equal(
  allocatedSupply(disconnected),
  0,
  "Disconnected loads cannot receive allocation",
);
assert.equal(
  allocatedSupply({ ...disconnected, power_state: "ENERGIZED", served_mw: 9 }),
  5,
  "Allocation cannot exceed demand",
);
const assets = [
  disconnected,
  {
    demand_mw: 3,
    served_mw: 2,
    generation_mw: 0,
    critical_load_mw: 1,
    power_state: "CURTAILED",
  },
  {
    demand_mw: 0,
    served_mw: 0,
    generation_mw: 2.1,
    critical_load_mw: 0,
    power_state: "SOURCE_ACTIVE",
  },
];
const m = calculateGridMetrics(assets, [
  { loading_percent: 65 },
  { loading_percent: 110 },
]);
assert.equal(m.demand, 8);
assert.equal(m.served, 2);
assert.equal(m.unserved, 6);
assert.equal(m.generation, 2.1);
assert.equal(m.critical, 3);
assert.equal(m.criticalServed, 1);
assert.equal(m.utilization, 110);
assert.equal(calculateGridMetrics([]).served, 0);
assert.equal(
  allocatedSupply({
    ...disconnected,
    power_state: "ENERGIZED",
    served_mw: NaN,
  }),
  0,
);
console.log(
  "PASS: disconnected load exclusion, demand bounds, generation/served/unserved consistency, critical allocation and true overload utilization.",
);
