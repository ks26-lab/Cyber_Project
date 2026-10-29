import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(
  new URL("../src/components/city3d/webglCapability.ts", import.meta.url),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
function runtime({
  available = true,
  throws = false,
  storageThrows = false,
  previousFailure = null,
  lost = false,
  server = false,
} = {}) {
  let probes = 0,
    releases = 0;
  const memory = new Map(
    previousFailure
      ? [["gridsec.graphics-unavailable.v1", previousFailure]]
      : [],
  );
  const store = {
    getItem: (key) => {
      if (storageThrows) throw Error("blocked");
      return memory.get(key) || null;
    },
    setItem: (key, value) => {
      if (storageThrows) throw Error("blocked");
      memory.set(key, value);
    },
    removeItem: (key) => {
      if (storageThrows) throw Error("blocked");
      memory.delete(key);
    },
  };
  const context = {
    isContextLost: () => lost,
    getExtension: () => ({
      loseContext: () => {
        releases++;
      },
    }),
  };
  const scope = { exports: {} };
  if (!server) {
    scope.window = { sessionStorage: store };
    scope.document = {
      createElement: () => ({
        getContext: (kind) => {
          assert.equal(kind, "webgl2");
          probes++;
          if (throws) throw Error("device unavailable");
          return available ? context : null;
        },
      }),
    };
  }
  vm.runInNewContext(code, scope);
  return {
    api: scope.exports,
    probes: () => probes,
    releases: () => releases,
    memory,
  };
}
test("successful WebGL2 probe is cached and its temporary GPU context released", () => {
  const r = runtime();
  assert.equal(r.api.detectGraphicsCapability(), "available");
  assert.equal(r.api.detectGraphicsCapability(), "available");
  assert.equal(r.probes(), 1);
  assert.equal(r.releases(), 1);
});
test("missing context never triggers repeated probes", () => {
  const r = runtime({ available: false });
  for (let i = 0; i < 4; i++)
    assert.equal(r.api.detectGraphicsCapability(), "unavailable");
  assert.equal(r.probes(), 1);
});
test("a context creation exception selects fallback", () => {
  const r = runtime({ throws: true });
  assert.equal(r.api.detectGraphicsCapability(), "unavailable");
  assert.equal(r.probes(), 1);
});
test("failure is remembered across document navigation", () => {
  const r = runtime({ previousFailure: "device lost" });
  assert.equal(r.api.detectGraphicsCapability(), "unavailable");
  assert.equal(r.probes(), 0);
  assert.equal(r.api.getGraphicsFailureReason(), "device lost");
});
test("storage denied still detects once", () => {
  const r = runtime({ storageThrows: true, available: false });
  assert.equal(r.api.detectGraphicsCapability(), "unavailable");
  assert.equal(r.api.detectGraphicsCapability(), "unavailable");
  assert.equal(r.probes(), 1);
});
test("runtime context loss notifies subscribed views and prevents retry", () => {
  const r = runtime();
  r.api.detectGraphicsCapability();
  let changes = 0;
  const unsubscribe = r.api.subscribeGraphicsCapability(() => changes++);
  r.api.markGraphicsUnavailable("lost");
  assert.equal(changes, 1);
  assert.equal(r.api.detectGraphicsCapability(), "unavailable");
  assert.equal(r.probes(), 1);
  unsubscribe();
  r.api.markGraphicsUnavailable();
  assert.equal(changes, 1);
});
test("an already lost probe does not mount a renderer", () => {
  const r = runtime({ lost: true });
  assert.equal(r.api.detectGraphicsCapability(), "unavailable");
  assert.equal(r.probes(), 1);
});
test("server rendering does not access browser graphics", () => {
  const r = runtime({ server: true });
  assert.equal(r.api.detectGraphicsCapability(), "unknown");
  assert.equal(r.probes(), 0);
});
test("a first runtime loss is not cached, so the next document tries 3D again", () => {
  const r = runtime();
  r.api.detectGraphicsCapability();
  r.api.markGraphicsUnavailable("device reset", "lost");
  assert.equal(r.api.getGraphicsCapability(), "unavailable");
  assert.equal(r.api.getGraphicsFailureKind(), "lost");
  assert.equal(r.memory.has("gridsec.graphics-unavailable.v1"), false);
  assert.equal(r.memory.get("gridsec.graphics-losses.v1"), "1");
});
test("a repeated runtime loss is cached like an unsupported device", () => {
  const r = runtime();
  r.api.detectGraphicsCapability();
  r.api.markGraphicsUnavailable("device reset", "lost");
  r.api.markGraphicsUnavailable("device reset again", "lost");
  assert.equal(
    r.memory.get("gridsec.graphics-unavailable.v1"),
    "device reset again",
  );
});
test("explicit retry clears cached failures and probes exactly once more", () => {
  const r = runtime({ previousFailure: "device lost" });
  assert.equal(r.api.detectGraphicsCapability(), "unavailable");
  assert.equal(r.probes(), 0);
  let changes = 0;
  r.api.subscribeGraphicsCapability(() => changes++);
  assert.equal(r.api.retryGraphics(), "available");
  assert.equal(r.probes(), 1);
  assert.ok(changes >= 1);
  assert.equal(r.memory.has("gridsec.graphics-unavailable.v1"), false);
  assert.equal(r.api.getGraphicsFailureReason(), "");
});
test("retry on a device without WebGL2 falls back again without looping", () => {
  const r = runtime({ available: false });
  r.api.detectGraphicsCapability();
  assert.equal(r.api.retryGraphics(), "unavailable");
  assert.equal(r.probes(), 2);
  assert.equal(r.api.getGraphicsFailureKind(), "unsupported");
});
