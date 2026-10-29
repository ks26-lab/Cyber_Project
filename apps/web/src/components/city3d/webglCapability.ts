/**
 * One capability probe per document; a failed device is never retried automatically.
 *
 * Two failure kinds are distinguished:
 * - "unsupported": the probe could not create a WebGL2 context. Cached for the tab.
 * - "lost": a working renderer lost its context (GPU switch, driver reset, context
 *   reclaimed by the browser). The first loss in a tab is not cached, so a reload
 *   tries 3D again; a second loss is cached like an unsupported device.
 * retryGraphics() is the explicit user action ("Try 3D Again") and is the only
 * path that clears a cached failure.
 */
export type GraphicsCapability = "unknown" | "available" | "unavailable";
export type GraphicsFailureKind = "unsupported" | "lost";
const FAILURE_KEY = "gridsec.graphics-unavailable.v1";
const LOSS_KEY = "gridsec.graphics-losses.v1";
let capability: GraphicsCapability = "unknown";
let reason = "";
let failureKind: GraphicsFailureKind | null = null;
const listeners = new Set<() => void>();

export function getGraphicsCapability(): GraphicsCapability {
  return capability;
}
export function getGraphicsFailureReason(): string {
  return reason;
}
export function getGraphicsFailureKind(): GraphicsFailureKind | null {
  return failureKind;
}
export function subscribeGraphicsCapability(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function notify() {
  listeners.forEach((listener) => listener());
}
function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
export function markGraphicsUnavailable(
  message = "3D graphics are unavailable in this browser.",
  kind: GraphicsFailureKind = "unsupported",
) {
  capability = "unavailable";
  reason = message;
  failureKind = kind;
  try {
    const store = storage();
    if (store) {
      const losses =
        kind === "lost" ? Number(store.getItem(LOSS_KEY) || 0) + 1 : 0;
      if (kind === "lost") store.setItem(LOSS_KEY, String(losses));
      // A single runtime loss is usually transient; cache only a repeated one.
      if (kind === "unsupported" || losses >= 2)
        store.setItem(FAILURE_KEY, message);
    }
  } catch {
    /* Storage may be restricted. */
  }
  notify();
}
/** Explicit user retry: forget cached failures and probe the device once more. */
export function retryGraphics(): GraphicsCapability {
  try {
    const store = storage();
    store?.removeItem?.(FAILURE_KEY);
    store?.removeItem?.(LOSS_KEY);
  } catch {
    /* Storage may be restricted. */
  }
  capability = "unknown";
  reason = "";
  failureKind = null;
  notify();
  return detectGraphicsCapability();
}
export function detectGraphicsCapability(): GraphicsCapability {
  if (capability !== "unknown") return capability;
  if (typeof document === "undefined") return "unknown";
  try {
    const previousFailure = window.sessionStorage.getItem(FAILURE_KEY);
    if (previousFailure) {
      capability = "unavailable";
      reason = previousFailure;
      failureKind = "unsupported";
      notify();
      return capability;
    }
  } catch {
    /* Detection works without browser storage. */
  }

  // Three r169 requires WebGL2. A WebGL1-only context is not a usable signal.
  const canvas = document.createElement("canvas");
  try {
    const context = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!context || context.isContextLost()) {
      markGraphicsUnavailable(
        "This browser could not create a WebGL2 context. Hardware acceleration may be turned off.",
      );
      return capability;
    }
    capability = "available";
    // The probe owns this temporary context; release it before the renderer opens one.
    context.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.width = canvas.height = 1;
    notify();
  } catch {
    markGraphicsUnavailable(
      "Creating a WebGL2 context failed in this browser. Hardware acceleration may be turned off.",
    );
  }
  return capability;
}
