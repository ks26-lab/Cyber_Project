"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import { markGraphicsUnavailable } from "./webglCapability";
import type { ViewOverrides } from "./CityCanvas3D";
import {
  useSimulationStore,
  Building3DState,
  BatteryModel,
  FaultModel,
  LineResult,
  SimulationSessionState,
  SwitchModel,
} from "@/store/useSimulationStore";
import { useViewPrefs, prefersReducedMotion } from "@/store/useViewPrefs";

/*
 * Every visual state below is derived from the solved session (power_state, line
 * status, switch position, battery dispatch, faults). Animations only ease between
 * consecutive backend states; nothing here computes electrical quantities.
 */

type Vec3 = [number, number, number];
type Road = { axis: "x" | "z"; at: number; from: number; to: number };

const WIRE_HEIGHT = 1.15;
const DARK = new THREE.Color("#39424d");
const facilityNames: Record<string, string> = {
  HOSPITAL: "Hospital",
  WATER_TREATMENT: "Water works",
  CONTROL_CENTER: "Control center",
  UNIVERSITY: "University",
  RESIDENTIAL: "Homes",
  COMMERCIAL: "Commerce",
  INDUSTRIAL: "Industry",
  SOLAR: "Solar",
  BATTERY: "Battery",
  SUBSTATION: "Substation",
  GRID_INTAKE: "Grid intake",
};

function hash(a: number, b: number) {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** A single renderer-owned DOM host avoids independent React roots racing canvas teardown. */
function SceneLabel({
  position,
  container,
  assetId,
  title,
  detail,
  onSelect,
  alert = false,
  selected = false,
}: {
  position: [number, number, number];
  container: HTMLDivElement;
  assetId: string;
  title: string;
  detail?: string;
  onSelect: (id: string) => void;
  alert?: boolean;
  selected?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const element = useRef<HTMLButtonElement | null>(null);
  const projected = useMemo(() => new THREE.Vector3(), []);
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `city-label pointer-events-auto rounded-md border bg-white px-2 py-1 text-left text-xs shadow-sm ${alert ? "border-red-200 text-red-700" : selected ? "border-blue-300 text-blue-800" : "border-slate-200 text-slate-700"}`;
    button.style.cssText =
      "position:absolute;top:0;left:0;visibility:hidden;white-space:nowrap;";
    button.setAttribute("aria-label", `Inspect ${title}`);
    const heading = document.createElement("strong");
    heading.textContent = title;
    button.appendChild(heading);
    if (detail) {
      const text = document.createElement("span");
      text.className = "block text-xs font-normal opacity-80";
      text.textContent = detail;
      button.appendChild(text);
    }
    const select = () => onSelect(assetId);
    button.addEventListener("click", select);
    container.appendChild(button);
    element.current = button;
    invalidate();
    return () => {
      button.removeEventListener("click", select);
      // The host may already be detached by the outer React tree. remove() is
      // deliberately idempotent; no foreign React root owns these DOM children.
      button.remove();
      if (element.current === button) element.current = null;
    };
  }, [
    container,
    assetId,
    title,
    detail,
    onSelect,
    alert,
    selected,
    invalidate,
  ]);
  useFrame(() => {
    const label = element.current;
    if (!label || !group.current) return;
    group.current.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();
    projected.setFromMatrixPosition(group.current.matrixWorld).project(camera);
    const visible =
      projected.z >= -1 &&
      projected.z <= 1 &&
      Math.abs(projected.x) < 1.2 &&
      Math.abs(projected.y) < 1.2;
    label.style.visibility = visible ? "visible" : "hidden";
    if (visible)
      label.style.transform = `translate3d(${(projected.x * 0.5 + 0.5) * size.width}px,${(-projected.y * 0.5 + 0.5) * size.height}px,0) translate(-50%,-50%)`;
  });
  return <group ref={group} position={position} />;
}

/* ------------------------------------------------------------------ */
/* Shared, renderer-owned resources                                     */
/* ------------------------------------------------------------------ */

type Shared = {
  facade: THREE.Texture;
  glow: THREE.Texture;
  roof: THREE.MeshStandardMaterial;
  dusk: boolean;
  effects: boolean;
};
const SharedContext = createContext<Shared | null>(null);
function useShared() {
  const value = useContext(SharedContext);
  if (!value) throw Error("Scene resources are not available");
  return value;
}

function facadeTexture(wall: string, glass: string) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  g.fillStyle = wall;
  g.fillRect(0, 0, size, size);
  g.fillStyle = glass;
  const cols = 4,
    rows = 5;
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++)
      g.fillRect(
        (i * size) / cols + 7,
        (j * size) / rows + 7,
        size / cols - 14,
        size / rows - 12,
      );
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function SceneResources({
  dusk,
  effects,
  children,
}: {
  dusk: boolean;
  effects: boolean;
  children: React.ReactNode;
}) {
  const resources = useMemo(() => {
    const facade = facadeTexture("#ffffff", "#9aabbd");
    facade.colorSpace = THREE.SRGBColorSpace;
    const glow = facadeTexture("#000000", "#ffffff");
    const roof = new THREE.MeshStandardMaterial({
      color: "#aeb7c0",
      roughness: 0.9,
    });
    return { facade, glow, roof };
  }, []);
  useEffect(
    () => () => {
      resources.facade.dispose();
      resources.glow.dispose();
      resources.roof.dispose();
    },
    [resources],
  );
  const value = useMemo(
    () => ({ ...resources, dusk, effects }),
    [resources, dusk, effects],
  );
  return (
    <SharedContext.Provider value={value}>{children}</SharedContext.Provider>
  );
}

/** A facade material whose brightness follows the building's modeled supply. */
function useFacadeMaterial(color: string) {
  const { facade, glow } = useShared();
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.78,
      metalness: 0.04,
      map: facade,
      emissive: new THREE.Color("#ffcd85"),
      emissiveMap: glow,
      emissiveIntensity: 0,
    });
    m.userData.base = new THREE.Color(color);
    return m;
    // Created once per building; colour changes are applied below without churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facade, glow]);
  useEffect(() => {
    (material.userData.base as THREE.Color).set(color);
  }, [material, color]);
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

function Block({
  position,
  size,
  body,
  rotation,
}: {
  position: Vec3;
  size: Vec3;
  body: THREE.Material;
  rotation?: Vec3;
}) {
  const { roof } = useShared();
  const materials = useMemo(
    () => [body, body, roof, roof, body, body],
    [body, roof],
  );
  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
      material={materials}
    >
      <boxGeometry args={size} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Facilities                                                           */
/* ------------------------------------------------------------------ */

function powerTarget(state: Building3DState["power_state"]) {
  if (state === "BLACKOUT") return 0;
  if (state === "CURTAILED") return 0.55;
  if (state === "BACKUP_BATTERY") return 0.8;
  return 1;
}

function palette(type: string, id: string): [string, string] {
  const v = hash(id.length, id.charCodeAt(id.length - 1));
  switch (type) {
    case "HOSPITAL":
      return ["#f3f5f7", "#e4e9ee"];
    case "WATER_TREATMENT":
      return ["#d3dbe1", "#c2ccd4"];
    case "CONTROL_CENTER":
      return ["#5d7690", "#7b8fa3"];
    case "UNIVERSITY":
      return ["#dccaa6", "#cdb995"];
    case "INDUSTRIAL":
      return ["#c3bdb2", "#a9a49b"];
    case "COMMERCIAL":
      return ["#7d9db6", "#e6e9ec"];
    case "RESIDENTIAL":
      return v > 0.5 ? ["#e5d7c4", "#cfdbe4"] : ["#d6dfe6", "#e8dccb"];
    default:
      return ["#d5dce3", "#c5ced7"];
  }
}

function overlayTint(
  b: Building3DState,
  mode: string,
  inTrace: boolean,
): string | null {
  // Route nodes keep their supply appearance except in the algorithm layer.
  if (inTrace && mode === "ALGORITHM_TRACE") return "#8f80d6";
  if (mode === "CRITICALITY")
    return b.priority_tier === 1
      ? "#62a99b"
      : b.priority_tier === 2
        ? "#7f9ecb"
        : "#a6b0ba";
  if (mode === "VOLTAGE")
    return b.voltage_pu >= 0.97
      ? "#72ae91"
      : b.voltage_pu >= 0.93
        ? "#d4a95d"
        : "#c8675f";
  return null;
}

function FacilityModel({
  type,
  primary,
  secondary,
  building,
  battery,
}: {
  type: string;
  primary: THREE.Material;
  secondary: THREE.Material;
  building: Building3DState;
  battery?: BatteryModel;
}) {
  const scale = 0.85 + hash(building.position_3d[0], building.position_3d[2]) * 0.35;
  switch (type) {
    case "HOSPITAL":
      return (
        <group>
          <Block position={[0, 1.72, -0.25]} size={[2.6, 3.2, 1.6]} body={primary} />
          <Block position={[0.2, 0.9, 0.95]} size={[3.0, 1.56, 0.9]} body={secondary} />
          {/* Medical cross on the tower facade */}
          <mesh position={[0, 2.65, 0.57]}>
            <boxGeometry args={[0.72, 0.22, 0.05]} />
            <meshBasicMaterial color="#d2423a" />
          </mesh>
          <mesh position={[0, 2.65, 0.57]}>
            <boxGeometry args={[0.22, 0.72, 0.05]} />
            <meshBasicMaterial color="#d2423a" />
          </mesh>
          {/* Rooftop helipad with H marking */}
          <mesh position={[0, 3.34, -0.25]}>
            <cylinderGeometry args={[0.66, 0.66, 0.04, 28]} />
            <meshStandardMaterial color="#4b5663" roughness={0.9} />
          </mesh>
          {[-0.18, 0.18].map((x) => (
            <mesh key={x} position={[x, 3.37, -0.25]}>
              <boxGeometry args={[0.07, 0.01, 0.5]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}
          <mesh position={[0, 3.37, -0.25]}>
            <boxGeometry args={[0.36, 0.01, 0.07]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* Emergency entrance canopy */}
          <mesh position={[0.2, 0.72, 1.55]} castShadow>
            <boxGeometry args={[1.2, 0.06, 0.45]} />
            <meshStandardMaterial color="#d2423a" />
          </mesh>
        </group>
      );
    case "WATER_TREATMENT":
      return (
        <group>
          {[-0.8, 0.8].map((x) => (
            <group key={x} position={[x, 0, -0.75]}>
              <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.74, 0.78, 0.6, 32]} />
                <meshStandardMaterial color="#a9b8c4" roughness={0.7} />
              </mesh>
              <mesh position={[0, 0.73, 0]}>
                <cylinderGeometry args={[0.66, 0.66, 0.02, 32]} />
                <meshStandardMaterial color="#5f93b8" roughness={0.2} metalness={0.2} />
              </mesh>
            </group>
          ))}
          <Block position={[0.35, 0.78, 0.85]} size={[2.0, 1.32, 1.0]} body={primary} />
          {/* Elevated water tower */}
          {[
            [-1.45, 0.65],
            [-1.05, 0.65],
            [-1.45, 1.05],
            [-1.05, 1.05],
          ].map(([x, z]) => (
            <mesh key={`${x}${z}`} position={[x, 1.05, z]}>
              <cylinderGeometry args={[0.035, 0.035, 1.9, 6]} />
              <meshStandardMaterial color="#8394a3" />
            </mesh>
          ))}
          <mesh position={[-1.25, 2.3, 0.85]} castShadow>
            <cylinderGeometry args={[0.42, 0.36, 0.7, 20]} />
            <meshStandardMaterial color="#7fa6c4" metalness={0.2} />
          </mesh>
        </group>
      );
    case "CONTROL_CENTER":
      return (
        <group>
          <mesh position={[0, 1.42, 0]} castShadow receiveShadow material={[primary, primary, primary]}>
            <cylinderGeometry args={[1.15, 1.32, 2.6, 8]} />
          </mesh>
          <mesh position={[0, 2.76, 0]}>
            <cylinderGeometry args={[1.18, 1.18, 0.08, 8]} />
            <meshStandardMaterial color="#aeb7c0" />
          </mesh>
          <mesh position={[0.2, 3.5, 0.1]}>
            <cylinderGeometry args={[0.04, 0.07, 1.4, 8]} />
            <meshStandardMaterial color="#9aa5b0" />
          </mesh>
          <mesh position={[-0.55, 3.05, -0.3]} rotation={[-0.7, 0.4, 0]}>
            <sphereGeometry args={[0.32, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
            <meshStandardMaterial color="#e6eaee" side={THREE.DoubleSide} />
          </mesh>
        </group>
      );
    case "UNIVERSITY":
      return (
        <group>
          <Block position={[0, 1.02, -0.3]} size={[2.9, 1.8, 1.5]} body={primary} />
          <Block position={[1.05, 0.7, 0.7]} size={[0.8, 1.16, 0.9]} body={secondary} />
          <mesh position={[0, 1.92, -0.3]} castShadow>
            <sphereGeometry args={[0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#6f9c8d" roughness={0.5} metalness={0.3} />
          </mesh>
          {[-0.9, -0.45, 0].map((x) => (
            <mesh key={x} position={[x, 0.72, 0.62]} castShadow>
              <cylinderGeometry args={[0.08, 0.08, 1.2, 10]} />
              <meshStandardMaterial color="#f1ebe0" />
            </mesh>
          ))}
          <mesh position={[-0.45, 1.38, 0.62]} castShadow>
            <boxGeometry args={[1.25, 0.16, 0.34]} />
            <meshStandardMaterial color="#efe7d8" />
          </mesh>
        </group>
      );
    case "INDUSTRIAL":
      return (
        <group>
          <Block position={[-0.35, 0.92, 0.1]} size={[2.3, 1.6, 2.6]} body={primary} />
          {[-0.8, 0, 0.8].map((z) => (
            <mesh key={z} position={[-0.35, 1.82, z + 0.1]} rotation={[0.45, 0, 0]} castShadow>
              <boxGeometry args={[2.2, 0.06, 0.62]} />
              <meshStandardMaterial color="#9fb6c8" metalness={0.3} roughness={0.35} />
            </mesh>
          ))}
          {[
            [1.3, -0.95, 3.2],
            [1.3, -0.25, 2.7],
          ].map(([x, z, h]) => (
            <group key={z} position={[x, 0, z]}>
              <mesh position={[0, h / 2 + 0.12, 0]} castShadow>
                <cylinderGeometry args={[0.19, 0.25, h, 14]} />
                <meshStandardMaterial color="#8a929b" />
              </mesh>
              <mesh position={[0, h - 0.05, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.2, 14]} />
                <meshStandardMaterial color="#c8584f" />
              </mesh>
            </group>
          ))}
          <mesh position={[1.25, 1.0, 1.0]} castShadow>
            <cylinderGeometry args={[0.42, 0.42, 1.75, 18]} />
            <meshStandardMaterial color="#b7bec5" metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      );
    case "SOLAR":
      return (
        <group>
          {[-0.75, 0.65].flatMap((z) =>
            [-1.1, 0, 1.1].map((x) => (
              <group key={`${x}${z}`} position={[x, 0, z]}>
                <mesh position={[0, 0.35, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
                  <meshStandardMaterial color="#9aa5b0" />
                </mesh>
                <mesh position={[0, 0.62, 0]} rotation={[-0.5, 0, 0]} castShadow>
                  <boxGeometry args={[0.98, 0.05, 0.78]} />
                  <meshStandardMaterial color="#2c4a6b" metalness={0.6} roughness={0.25} />
                </mesh>
              </group>
            )),
          )}
        </group>
      );
    case "BATTERY": {
      const soc = Math.max(0, Math.min(100, battery?.soc_percent ?? building.battery_soc_pct ?? 0)) / 100;
      return (
        <group>
          {[-1.0, 0, 1.0].map((x) => (
            <group key={x}>
              <mesh position={[x, 0.6, -0.2]} castShadow receiveShadow>
                <boxGeometry args={[0.82, 0.95, 2.1]} />
                <meshStandardMaterial color="#e8edf0" roughness={0.6} />
              </mesh>
              <mesh position={[x, 0.95, -0.2]}>
                <boxGeometry args={[0.84, 0.1, 2.12]} />
                <meshStandardMaterial color="#2a9d8f" />
              </mesh>
            </group>
          ))}
          {/* State-of-charge gauge from the battery model */}
          <mesh position={[0, 0.3, 1.25]}>
            <boxGeometry args={[2.7, 0.14, 0.14]} />
            <meshStandardMaterial color="#cfd6dc" />
          </mesh>
          <mesh position={[-1.35 + (2.7 * soc) / 2, 0.3, 1.33]}>
            <boxGeometry args={[Math.max(0.02, 2.7 * soc), 0.16, 0.04]} />
            <meshBasicMaterial color="#2a9d8f" />
          </mesh>
        </group>
      );
    }
    case "GRID_INTAKE":
    case "SUBSTATION":
      return (
        <group>
          <mesh position={[0, 0.14, 0]} receiveShadow>
            <boxGeometry args={[3.3, 0.04, 3.3]} />
            <meshStandardMaterial color="#c9ced2" roughness={1} />
          </mesh>
          {(
            [
              [0, 1.62, 3.3, 0.04],
              [0, -1.62, 3.3, 0.04],
              [1.62, 0, 0.04, 3.3],
              [-1.62, 0, 0.04, 3.3],
            ] as const
          ).map(([x, z, w, d]) => (
            <mesh key={`${x}${z}`} position={[x, 0.42, z]}>
              <boxGeometry args={[w, 0.55, d]} />
              <meshStandardMaterial color="#8b97a3" transparent opacity={0.45} />
            </mesh>
          ))}
          {[-0.7, 0.7].map((x) => (
            <group key={x} position={[x, 0, 0.55]}>
              <mesh position={[0, 0.62, 0]} castShadow>
                <boxGeometry args={[0.9, 0.9, 0.7]} />
                <meshStandardMaterial color="#7d8a96" metalness={0.5} roughness={0.5} />
              </mesh>
              <mesh position={[0, 0.55, 0.4]}>
                <boxGeometry args={[0.8, 0.6, 0.1]} />
                <meshStandardMaterial color="#6c7884" />
              </mesh>
              {[-0.25, 0, 0.25].map((bx) => (
                <mesh key={bx} position={[bx, 1.24, 0]}>
                  <cylinderGeometry args={[0.05, 0.07, 0.36, 8]} />
                  <meshStandardMaterial color="#e6e9ec" />
                </mesh>
              ))}
            </group>
          ))}
          {[-1.3, 1.3].map((x) => (
            <mesh key={x} position={[x, 1.2, -0.95]}>
              <cylinderGeometry args={[0.05, 0.06, 2.2, 8]} />
              <meshStandardMaterial color="#9aa5b0" />
            </mesh>
          ))}
          <mesh position={[0, 2.25, -0.95]}>
            <boxGeometry args={[2.7, 0.09, 0.09]} />
            <meshStandardMaterial color="#9aa5b0" />
          </mesh>
          <Block position={[0, 0.5, -0.35]} size={[0.9, 0.72, 0.55]} body={primary} />
        </group>
      );
    case "RESIDENTIAL":
      return (
        <group>
          <Block position={[-0.75, 1.7 * scale + 0.12, -0.6]} size={[1.1, 3.4 * scale, 1.1]} body={primary} />
          <Block position={[0.7, 1.2 * scale + 0.12, -0.5]} size={[1.0, 2.4 * scale, 1.2]} body={secondary} />
          <Block position={[0.05, 0.62, 0.9]} size={[1.9, 1.0, 0.85]} body={primary} />
          <mesh position={[-0.75, 3.4 * scale + 0.2, -0.6]}>
            <boxGeometry args={[0.4, 0.18, 0.4]} />
            <meshStandardMaterial color="#9aa5b0" />
          </mesh>
        </group>
      );
    case "COMMERCIAL":
      return (
        <group>
          <Block position={[-0.6, 2.15, -0.55]} size={[1.3, 4.1, 1.3]} body={primary} />
          <Block position={[0.45, 0.58, 0.6]} size={[2.3, 0.92, 1.6]} body={secondary} />
          <mesh position={[0.45, 0.6, 1.5]} castShadow>
            <boxGeometry args={[2.3, 0.05, 0.38]} />
            <meshStandardMaterial color="#2f6fb0" />
          </mesh>
          <mesh position={[-0.6, 4.32, -0.55]}>
            <boxGeometry args={[0.7, 0.2, 0.7]} />
            <meshStandardMaterial color="#9aa5b0" />
          </mesh>
        </group>
      );
    default:
      return (
        <group>
          <Block position={[0, 1.2, 0]} size={[2.2, 2.2, 2.2]} body={primary} />
        </group>
      );
  }
}

function ProceduralBuildingMesh({
  building,
  battery,
  isSelected,
  isInTrace,
  overlayMode,
  onSelect,
  labelContainer,
}: {
  building: Building3DState;
  battery?: BatteryModel;
  isSelected: boolean;
  isInTrace: boolean;
  overlayMode: string;
  onSelect: (id: string) => void;
  labelContainer: HTMLDivElement;
}) {
  const shared = useShared();
  const invalidate = useThree((s) => s.invalidate);
  const [hovered, setHovered] = useState(false);
  const type = (building.facility_type || "SUBSTATION").toUpperCase();
  const [base, accent] = palette(type, building.bus_id);
  const tint = overlayTint(building, overlayMode, isInTrace);
  const primary = useFacadeMaterial(tint ?? base);
  const secondary = useFacadeMaterial(tint ?? accent);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const flash = useRef<THREE.Mesh>(null);
  const support = useRef<THREE.MeshStandardMaterial>(null);
  const target = powerTarget(building.power_state);
  const anim = useRef({
    level: target,
    prev: target,
    pending: "" as "" | "trip" | "restore",
    trip: -10,
    restored: -10,
  });
  const criticalOut =
    building.power_state === "BLACKOUT" &&
    building.priority_tier === 1 &&
    building.demand_mw > 0;
  const batterySupport =
    building.power_state === "BACKUP_BATTERY" ||
    (battery?.current_dispatch_kw ?? 0) > 0;

  useEffect(() => {
    const a = anim.current;
    if (target < a.prev - 0.3) a.pending = "trip";
    else if (target > a.prev + 0.3) a.pending = "restore";
    a.prev = target;
    invalidate();
  }, [target, invalidate]);
  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );

  useFrame(({ clock }, delta) => {
    const a = anim.current;
    const t = clock.elapsedTime;
    if (a.pending === "trip") a.trip = t;
    if (a.pending === "restore") a.restored = t;
    a.pending = "";
    a.level += (target - a.level) * (1 - Math.exp(-delta * (shared.effects ? 2.6 : 40)));
    let shown = a.level;
    const flickering = shared.effects && t - a.trip < 0.7;
    // A brief flicker as supply is lost, then the facade settles dark.
    if (flickering) shown = Math.sin((t - a.trip) * 38) > 0 ? 0.85 : 0.08;
    const glow = shared.dusk ? 1.2 : 0.3;
    for (const m of [primary, secondary]) {
      m.color.copy(m.userData.base as THREE.Color).lerp(DARK, (1 - shown) * 0.5);
      m.emissiveIntensity = shown * glow;
    }
    if (ring.current) {
      let opacity = isSelected || hovered || isInTrace ? 0.75 : 0;
      if (criticalOut)
        opacity = shared.effects ? 0.5 + 0.3 * Math.sin(t * 3) : 0.75;
      ring.current.opacity = opacity;
      ring.current.color.set(
        criticalOut ? "#c2413b" : isInTrace ? "#6d4fd1" : "#2f6fb0",
      );
    }
    const sinceRestore = t - a.restored;
    const restoring = shared.effects && sinceRestore < 1.6;
    if (flash.current) {
      flash.current.visible = restoring;
      if (restoring) {
        const s = 1 + sinceRestore * 1.4;
        flash.current.scale.set(s, s, 1);
        (flash.current.material as THREE.MeshBasicMaterial).opacity =
          0.65 * (1 - sinceRestore / 1.6);
      }
    }
    if (support.current)
      support.current.emissiveIntensity = batterySupport
        ? shared.effects
          ? 0.6 + 0.4 * Math.sin(t * 2.4)
          : 0.8
        : 0;
    if (
      Math.abs(target - a.level) > 0.002 ||
      flickering ||
      restoring ||
      (shared.effects && (criticalOut || batterySupport))
    )
      invalidate();
  });

  const [x, , z] = building.position_3d;
  const title = `${building.bus_id} · ${facilityNames[type] || building.name.split(" ")[0]}`;
  const showLabel =
    isSelected || hovered || criticalOut || (isInTrace && type === "HOSPITAL");

  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(building.bus_id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[3.6, 0.12, 3.6]} />
        <meshStandardMaterial color={isSelected ? "#cfdcea" : "#dfe4e8"} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.86, 2.06, 48]} />
        <meshBasicMaterial ref={ring} transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={flash} visible={false} position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 1.92, 48]} />
        <meshBasicMaterial color="#2a9d6f" transparent opacity={0} depthWrite={false} />
      </mesh>
      <FacilityModel
        type={type}
        primary={primary}
        secondary={secondary}
        building={building}
        battery={battery}
      />
      {battery && type !== "BATTERY" && (
        <group position={[1.42, 0, 1.42]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[0.46, 0.6, 0.36]} />
            <meshStandardMaterial color="#e8edf0" />
          </mesh>
          <mesh position={[0, 0.76, 0]}>
            <boxGeometry args={[0.48, 0.08, 0.38]} />
            <meshStandardMaterial ref={support} color="#2a9d8f" emissive="#2a9d8f" emissiveIntensity={0} />
          </mesh>
        </group>
      )}
      {showLabel && (
        <SceneLabel
          container={labelContainer}
          assetId={building.bus_id}
          position={[0, type === "COMMERCIAL" ? 5 : 4.1, 0]}
          title={title}
          detail={
            criticalOut
              ? "No modeled supply"
              : `${building.voltage_pu.toFixed(3)} pu${building.demand_mw > 0 ? ` · ${building.served_mw.toFixed(1)}/${building.demand_mw.toFixed(1)} MW` : ""}${building.battery_soc_pct != null ? ` · SOC ${building.battery_soc_pct.toFixed(0)}%` : ""}`
          }
          onSelect={onSelect}
          alert={criticalOut}
          selected={isSelected || isInTrace}
        />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Feeders, switches and faults                                         */
/* ------------------------------------------------------------------ */

function PowerCorridorLine({
  line,
  fromPos,
  toPos,
  isSelected,
  isInTrace,
  isFaulted,
  switchState,
  overlayMode,
  showPoles,
  onSelect,
  labelContainer,
}: {
  line: LineResult;
  fromPos: Vec3;
  toPos: Vec3;
  isSelected: boolean;
  isInTrace: boolean;
  isFaulted: boolean;
  switchState?: SwitchModel;
  overlayMode: string;
  showPoles: boolean;
  onSelect: (id: string) => void;
  labelContainer: HTMLDivElement;
}) {
  const shared = useShared();
  const invalidate = useThree((s) => s.invalidate);
  const out = line.status === "OUT_OF_SERVICE" || isFaulted;
  const geometry = useMemo(() => {
    const a = new THREE.Vector3(fromPos[0], 0, fromPos[2]);
    const b = new THREE.Vector3(toPos[0], 0, toPos[2]);
    const dir = b.clone().sub(a);
    const length = dir.length();
    dir.normalize();
    const inset = Math.min(1.9, length * 0.3);
    const start = a.clone().addScaledVector(dir, inset).setY(WIRE_HEIGHT);
    const end = b.clone().addScaledVector(dir, -inset).setY(WIRE_HEIGHT);
    const span = start.distanceTo(end);
    const count = Math.max(1, Math.round(span / 4));
    const poles = Array.from({ length: count + 1 }, (_, i) =>
      start.clone().lerp(end, i / count),
    );
    return {
      start,
      end,
      span,
      poles,
      mid: start.clone().lerp(end, 0.5),
      switchAt: start.clone().lerp(end, 0.25),
      heading: Math.atan2(dir.x, dir.z),
    };
  }, [fromPos, toPos]);

  const flow = line.p_from_mw || (line.loading_percent > 1 ? 0.5 : 0);
  const color = isFaulted
    ? "#c2413b"
    : isInTrace
      ? "#6d4fd1"
      : out
        ? "#a7b3bf"
        : line.loading_percent > 95
          ? "#dd6b20"
          : line.loading_percent > 80 || (overlayMode === "THERMAL" && line.loading_percent > 60)
            ? "#c98a2e"
            : "#2f6fb0";

  const pulses = useRef<(THREE.Mesh | null)[]>([]);
  const burst = useRef<THREE.Mesh>(null);
  const charge = useRef<THREE.Mesh>(null);
  const marker = useRef<THREE.Mesh>(null);
  const blade = useRef<THREE.Group>(null);
  const state = useRef({ faulted: isFaulted, out, pending: "" as "" | "fault" | "energize", fault: -10, energize: -10 });
  useEffect(() => {
    const s = state.current;
    if (isFaulted && !s.faulted) s.pending = "fault";
    else if (!out && s.out) s.pending = "energize";
    s.faulted = isFaulted;
    s.out = out;
    invalidate();
  }, [isFaulted, out, invalidate]);

  useFrame(({ clock }, delta) => {
    const s = state.current;
    const t = clock.elapsedTime;
    if (s.pending === "fault") s.fault = t;
    if (s.pending === "energize") s.energize = t;
    s.pending = "";
    const forward = flow >= 0;
    const from = forward ? geometry.start : geometry.end;
    const to = forward ? geometry.end : geometry.start;
    let busy = false;
    // Direction-of-flow markers on energized feeders (sign of the solved branch flow).
    const moving = !out && shared.effects && Math.abs(flow) > 0.01;
    const speed = Math.min(4, 1.2 + Math.abs(flow) * 0.8) / Math.max(1, geometry.span);
    pulses.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.visible = moving;
      if (moving) {
        mesh.position.lerpVectors(from, to, (t * speed + i / pulses.current.length) % 1);
        busy = true;
      }
    });
    const sinceFault = t - s.fault;
    if (burst.current) {
      const active = shared.effects && sinceFault < 1.3;
      burst.current.visible = active;
      if (active) {
        const k = 1 + sinceFault * 5;
        burst.current.scale.set(k, k, 1);
        (burst.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - sinceFault / 1.3);
        busy = true;
      }
    }
    const sinceEnergize = t - s.energize;
    if (charge.current) {
      const active = shared.effects && sinceEnergize < 1;
      charge.current.visible = active;
      if (active) {
        charge.current.position.lerpVectors(from, to, sinceEnergize);
        busy = true;
      }
    }
    if (marker.current && shared.effects) {
      marker.current.rotation.y += delta * 0.8;
      busy = true;
    }
    if (blade.current && switchState) {
      const goal = switchState.closed ? 0 : -0.95;
      const r = blade.current.rotation;
      r.x += (goal - r.x) * (1 - Math.exp(-delta * (shared.effects ? 6 : 60)));
      if (Math.abs(goal - r.x) > 0.002) busy = true;
    }
    if (busy) invalidate();
  });

  const select = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSelect(line.line_id);
  };
  return (
    <group>
      <Line
        points={[
          [geometry.start.x, geometry.start.y, geometry.start.z],
          [geometry.end.x, geometry.end.y, geometry.end.z],
        ]}
        color={color}
        lineWidth={isSelected || isInTrace ? 4 : isFaulted ? 3 : 2}
        dashed={out}
        dashSize={0.45}
        gapSize={0.3}
        onClick={select}
      />
      {showPoles &&
        geometry.poles.map((p, i) => (
          <mesh key={i} position={[p.x, WIRE_HEIGHT / 2, p.z]} castShadow>
            <cylinderGeometry args={[0.04, 0.055, WIRE_HEIGHT, 6]} />
            <meshStandardMaterial color="#8f8173" roughness={0.9} />
          </mesh>
        ))}
      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            pulses.current[i] = m;
          }}
          visible={false}
        >
          <sphereGeometry args={[isSelected || isInTrace ? 0.16 : 0.1, 10, 8]} />
          <meshBasicMaterial color={isInTrace ? "#a996ff" : shared.dusk ? "#ffe2a8" : "#8fc1ef"} />
        </mesh>
      ))}
      <mesh ref={charge} visible={false}>
        <sphereGeometry args={[0.24, 14, 10]} />
        <meshBasicMaterial color="#5fd3a6" />
      </mesh>
      <mesh
        ref={burst}
        visible={false}
        position={[geometry.mid.x, 0.16, geometry.mid.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.25, 0.42, 32]} />
        <meshBasicMaterial color="#c2413b" transparent opacity={0} depthWrite={false} />
      </mesh>
      {isFaulted && (
        <mesh ref={marker} position={[geometry.mid.x, WIRE_HEIGHT + 0.5, geometry.mid.z]} onClick={select}>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color="#c2413b" emissive="#c2413b" emissiveIntensity={0.4} />
        </mesh>
      )}
      {switchState && (
        <group
          position={[geometry.switchAt.x, WIRE_HEIGHT, geometry.switchAt.z]}
          rotation={[0, geometry.heading, 0]}
          onClick={select}
        >
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[0.22, 0.22, 0.22]} />
            <meshStandardMaterial color="#7d8a96" />
          </mesh>
          <group ref={blade} rotation={[switchState.closed ? 0 : -0.95, 0, 0]}>
            <mesh position={[0, 0, 0.3]}>
              <boxGeometry args={[0.07, 0.07, 0.6]} />
              <meshStandardMaterial color={switchState.closed ? "#2a9d8f" : "#d39a2c"} />
            </mesh>
          </group>
        </group>
      )}
      {isFaulted && (
        <SceneLabel
          container={labelContainer}
          assetId={line.line_id}
          position={[geometry.mid.x, WIRE_HEIGHT + 1.1, geometry.mid.z]}
          title={`Fault isolated · ${line.line_id}`}
          onSelect={onSelect}
          alert
        />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Scenery: roads, trees, streetlights and light traffic                */
/* ------------------------------------------------------------------ */

function pickRoads(values: number[], lo: number, hi: number) {
  const candidates: [number, number][] = [];
  for (let c = lo + 3; c <= hi - 3; c += 0.5) {
    const clearance = Math.min(...values.map((v) => Math.abs(v - c)));
    if (clearance >= 2.7) candidates.push([c, clearance]);
  }
  candidates.sort((a, b) => b[1] - a[1]);
  const picked: number[] = [];
  for (const [c] of candidates)
    if (picked.length < 3 && picked.every((p) => Math.abs(p - c) >= 7))
      picked.push(c);
  return picked;
}

function planCity(buildings: Building3DState[], effects: boolean) {
  const xs = buildings.map((b) => b.position_3d[0]);
  const zs = buildings.map((b) => b.position_3d[2]);
  const minX = Math.min(...xs) - 5,
    maxX = Math.max(...xs) + 5,
    minZ = Math.min(...zs) - 5,
    maxZ = Math.max(...zs) + 5;
  const roads: Road[] = [
    { axis: "x", at: minZ, from: minX, to: maxX },
    { axis: "x", at: maxZ, from: minX, to: maxX },
    { axis: "z", at: minX, from: minZ, to: maxZ },
    { axis: "z", at: maxX, from: minZ, to: maxZ },
    ...pickRoads(zs, minZ, maxZ).map(
      (at): Road => ({ axis: "x", at, from: minX, to: maxX }),
    ),
    ...pickRoads(xs, minX, maxX).map(
      (at): Road => ({ axis: "z", at, from: minZ, to: maxZ }),
    ),
  ];
  const nearBuilding = (x: number, z: number, r: number) =>
    buildings.some(
      (b) =>
        Math.max(Math.abs(b.position_3d[0] - x), Math.abs(b.position_3d[2] - z)) < r,
    );
  const nearRoad = (x: number, z: number, r: number, skip?: Road) =>
    roads.some((rd) =>
      rd === skip
        ? false
        : rd.axis === "x"
          ? Math.abs(z - rd.at) < r && x > rd.from - r && x < rd.to + r
          : Math.abs(x - rd.at) < r && z > rd.from - r && z < rd.to + r,
    );
  const point = (rd: Road, along: number, side: number): [number, number] =>
    rd.axis === "x" ? [along, rd.at + side] : [rd.at + side, along];

  const trees: THREE.Matrix4[] = [];
  const trunks: THREE.Matrix4[] = [];
  const treeColors: THREE.Color[] = [];
  const cap = effects ? 260 : 90;
  const m = new THREE.Matrix4();
  for (let x = minX - 4; x <= maxX + 4 && trees.length < cap; x += 2.1)
    for (let z = minZ - 4; z <= maxZ + 4 && trees.length < cap; z += 2.1) {
      if (hash(x, z) > 0.42) continue;
      const tx = x + (hash(z, x) - 0.5) * 1.2,
        tz = z + (hash(x + 1, z) - 0.5) * 1.2;
      if (nearBuilding(tx, tz, 2.75) || nearRoad(tx, tz, 1.45)) continue;
      const s = 0.75 + hash(tx, tz) * 0.6;
      trees.push(m.clone().compose(new THREE.Vector3(tx, 0.95 * s, tz), new THREE.Quaternion(), new THREE.Vector3(s, s * 1.15, s)));
      trunks.push(m.clone().compose(new THREE.Vector3(tx, 0.3 * s, tz), new THREE.Quaternion(), new THREE.Vector3(s, s, s)));
      treeColors.push(new THREE.Color().setHSL(0.34 + hash(tz, tx) * 0.06, 0.24, 0.5 + hash(tx, 3) * 0.1));
    }

  const lamps: THREE.Matrix4[] = [];
  const heads: THREE.Matrix4[] = [];
  const dashes: THREE.Matrix4[] = [];
  roads.forEach((rd) => {
    let k = 0;
    for (let a = rd.from + 2.5; a <= rd.to - 2.5; a += 5, k++) {
      const [lx, lz] = point(rd, a, k % 2 ? 1.1 : -1.1);
      if (nearBuilding(lx, lz, 2.3) || nearRoad(lx, lz, 1.0, rd)) continue;
      lamps.push(new THREE.Matrix4().makeTranslation(lx, 0.75, lz));
      heads.push(new THREE.Matrix4().makeTranslation(lx, 1.52, lz));
    }
    for (let a = rd.from + 1; a <= rd.to - 1; a += 1.6) {
      const [dx, dz] = point(rd, a, 0);
      if (nearRoad(dx, dz, 1.0, rd)) continue;
      dashes.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(dx, 0.035, dz),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rd.axis === "x" ? 0 : Math.PI / 2, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
    }
  });
  return {
    roads,
    trees,
    trunks,
    treeColors,
    lamps,
    heads,
    dashes,
    bounds: { minX, maxX, minZ, maxZ },
  };
}

function Instanced({
  matrices,
  colors,
  children,
  castShadow = false,
}: {
  matrices: THREE.Matrix4[];
  colors?: THREE.Color[];
  children: React.ReactNode;
  castShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    colors?.forEach((color, i) => mesh.setColorAt(i, color));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matrices, colors]);
  if (!matrices.length) return null;
  return (
    <instancedMesh
      key={matrices.length}
      ref={ref}
      args={[undefined, undefined, matrices.length]}
      castShadow={castShadow}
    >
      {children}
    </instancedMesh>
  );
}

function Traffic({ roads }: { roads: Road[] }) {
  const invalidate = useThree((s) => s.invalidate);
  const ref = useRef<THREE.InstancedMesh>(null);
  const cars = useMemo(
    () =>
      roads
        .flatMap((road, i) =>
          [1, -1].map((dir, j) => ({
            road,
            dir,
            phase: hash(i + 1, j + 2),
            speed: 1.1 + hash(j + 3, i) * 0.9,
            color: new THREE.Color(
              ["#e8ecef", "#5b7895", "#c8584f", "#d9b65c", "#4d5a66"][(i * 2 + j) % 5],
            ),
          })),
        )
        .slice(0, 12),
    [roads],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    cars.forEach((car, i) => mesh.setColorAt(i, car.color));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [cars]);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    cars.forEach((car, i) => {
      const length = car.road.to - car.road.from;
      let u = (car.phase * length + clock.elapsedTime * car.speed) % length;
      if (car.dir < 0) u = length - u;
      const along = car.road.from + u,
        lane = 0.38 * car.dir;
      if (car.road.axis === "x") {
        dummy.position.set(along, 0.2, car.road.at + lane);
        dummy.rotation.set(0, 0, 0);
      } else {
        dummy.position.set(car.road.at + lane, 0.2, along);
        dummy.rotation.set(0, Math.PI / 2, 0);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    invalidate();
  });
  if (!cars.length) return null;
  return (
    <instancedMesh
      key={cars.length}
      ref={ref}
      args={[undefined, undefined, cars.length]}
      frustumCulled={false}
      castShadow
    >
      <boxGeometry args={[0.72, 0.28, 0.38]} />
      <meshStandardMaterial roughness={0.4} metalness={0.3} />
    </instancedMesh>
  );
}

function Scenery({
  buildings,
}: {
  buildings: Building3DState[];
}) {
  const { dusk, effects } = useShared();
  // Layout depends only on building positions, never on electrical state.
  const layoutKey = buildings.map((b) => b.position_3d.join(",")).join(";");
  const city = useMemo(
    () => planCity(buildings, effects),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutKey, effects],
  );
  const { minX, maxX, minZ, maxZ } = city.bounds;
  const cx = (minX + maxX) / 2,
    cz = (minZ + maxZ) / 2;
  return (
    <group>
      <mesh position={[cx, -0.02, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[maxX - minX + 40, maxZ - minZ + 40]} />
        <meshStandardMaterial color="#e3eae3" roughness={1} />
      </mesh>
      {city.roads.map((rd, i) => {
        const length = rd.to - rd.from + 1.6;
        const mid = (rd.from + rd.to) / 2;
        return (
          <mesh
            key={i}
            position={rd.axis === "x" ? [mid, 0.01, rd.at] : [rd.at, 0.012, mid]}
            receiveShadow
          >
            <boxGeometry args={rd.axis === "x" ? [length, 0.02, 1.6] : [1.6, 0.02, length]} />
            <meshStandardMaterial color="#bcc5ce" roughness={0.95} />
          </mesh>
        );
      })}
      <Instanced matrices={city.dashes}>
        <boxGeometry args={[0.7, 0.01, 0.08]} />
        <meshBasicMaterial color="#f4f6f8" />
      </Instanced>
      <Instanced matrices={city.trunks}>
        <cylinderGeometry args={[0.07, 0.1, 0.6, 6]} />
        <meshStandardMaterial color="#8a6f55" />
      </Instanced>
      <Instanced matrices={city.trees} colors={city.treeColors} castShadow={effects}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </Instanced>
      <Instanced matrices={city.lamps}>
        <cylinderGeometry args={[0.035, 0.05, 1.5, 6]} />
        <meshStandardMaterial color="#7f8b97" />
      </Instanced>
      <Instanced matrices={city.heads}>
        <boxGeometry args={[0.24, 0.08, 0.16]} />
        <meshStandardMaterial
          color={dusk ? "#fff1d6" : "#cfd6dc"}
          emissive="#ffd7a1"
          emissiveIntensity={dusk ? 1.6 : 0}
        />
      </Instanced>
      {effects && <Traffic roads={city.roads} />}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Camera                                                               */
/* ------------------------------------------------------------------ */

function cameraGoal(
  preset: string,
  buildings: Building3DState[],
  faults: FaultModel[],
  lines: LineResult[],
  posByBus: Record<string, Vec3>,
  traceEdgeIds: string[],
): number[] | null {
  if (!buildings.length || preset === "FREE") return null;
  const xs = buildings.map((b) => b.position_3d[0]),
    zs = buildings.map((b) => b.position_3d[2]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2,
    cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const s = Math.max(1, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 36);
  const near = (x: number, z: number, dx: number, dy: number, dz: number, ty = 1) => [
    x + dx,
    dy,
    z + dz,
    x,
    ty,
    z,
  ];
  const find = (...types: string[]) =>
    buildings.find((b) => types.includes(b.facility_type)) ?? buildings[0];
  const lineMid = (id: string) => {
    const l = lines.find((x) => x.line_id === id);
    const a = l && posByBus[l.from_bus],
      b = l && posByBus[l.to_bus];
    return a && b ? [(a[0] + b[0]) / 2, (a[2] + b[2]) / 2] : null;
  };
  switch (preset) {
    case "TOP_DOWN":
      return [cx, 40 * s, cz + 0.01, cx, 0, cz];
    case "HOSPITAL": {
      const [x, , z] = find("HOSPITAL").position_3d;
      return near(x, z, 7, 8, 9, 1.6);
    }
    case "SUBSTATION": {
      const [x, , z] = find("SUBSTATION", "GRID_INTAKE").position_3d;
      return near(x, z, 8, 9, 9);
    }
    case "FAULT": {
      const fault = faults.find((f) => !f.cleared);
      const mid = fault && lineMid(fault.asset_id);
      if (mid) return near(mid[0], mid[1], 7, 10, 11);
      const dark = buildings.find((b) => b.power_state === "BLACKOUT");
      if (dark) return near(dark.position_3d[0], dark.position_3d[2], 7, 10, 11);
      break;
    }
    case "RESTORATION": {
      const points = traceEdgeIds
        .map(lineMid)
        .filter((p): p is number[] => !!p);
      const pts = points.length
        ? points
        : buildings
            .filter((b) => b.priority_tier === 1)
            .map((b) => [b.position_3d[0], b.position_3d[2]]);
      const px = pts.reduce((sum, p) => sum + p[0], 0) / pts.length,
        pz = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
      return near(px, pz, 13 * s, 17 * s, 16 * s);
    }
  }
  return [cx + 19 * s, 18 * s, cz + 22 * s, cx, 0, cz];
}

function CameraRig({
  goal,
  effects,
  maxDistance,
}: {
  goal: number[] | null;
  effects: boolean;
  maxDistance: number;
}) {
  const { camera, invalidate } = useThree();
  const controls = useRef<any>(null);
  const flight = useRef<{
    p0: THREE.Vector3;
    p1: THREE.Vector3;
    t0: THREE.Vector3;
    t1: THREE.Vector3;
    k: number;
  } | null>(null);
  const first = useRef(true);
  const latest = useRef(goal);
  latest.current = goal;
  const goalKey = goal ? goal.map((v) => v.toFixed(2)).join(",") : "free";

  useEffect(() => {
    const g = latest.current;
    const c = controls.current;
    if (!g || !c) return;
    const p1 = new THREE.Vector3(g[0], g[1], g[2]),
      t1 = new THREE.Vector3(g[3], g[4], g[5]);
    if (first.current || !effects) {
      first.current = false;
      flight.current = null;
      camera.position.copy(p1);
      c.target.copy(t1);
      c.update();
    } else {
      flight.current = {
        p0: camera.position.clone(),
        p1,
        t0: c.target.clone(),
        t1,
        k: 0,
      };
    }
    invalidate();
  }, [goalKey, effects, camera, invalidate]);

  useFrame((_, delta) => {
    const f = flight.current,
      c = controls.current;
    if (!f || !c) return;
    f.k = Math.min(1, f.k + delta / 1.4);
    const e = f.k < 0.5 ? 4 * f.k ** 3 : 1 - (-2 * f.k + 2) ** 3 / 2;
    camera.position.lerpVectors(f.p0, f.p1, e);
    c.target.lerpVectors(f.t0, f.t1, e);
    c.update();
    if (f.k >= 1) flight.current = null;
    invalidate();
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2.08}
      minDistance={5}
      maxDistance={maxDistance}
      // Any user gesture cancels an in-progress camera flight.
      onStart={() => {
        flight.current = null;
      }}
    />
  );
}

function Lighting({ extent }: { extent: number }) {
  const { dusk, effects } = useShared();
  const sky = dusk ? "#2f3a50" : "#eef3f6";
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, extent * 1.8, extent * 3.8]} />
      <hemisphereLight
        args={[
          dusk ? "#5a6d96" : "#f4f8ff",
          dusk ? "#2b2a33" : "#d8d4c8",
          dusk ? 0.6 : 1.05,
        ]}
      />
      <ambientLight intensity={dusk ? 0.12 : 0.2} />
      <directionalLight
        position={dusk ? [-24, 9, 16] : [18, 30, 14]}
        intensity={dusk ? 0.55 : 1.65}
        color={dusk ? "#ffb27a" : "#fffaf0"}
        castShadow={effects}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-extent * 1.3}
        shadow-camera-right={extent * 1.3}
        shadow-camera-top={extent * 1.3}
        shadow-camera-bottom={-extent * 1.3}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
}

function RendererLifecycle({ effects }: { effects: boolean }) {
  const { gl, setFrameloop, invalidate } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      markGraphicsUnavailable(
        "The graphics device was reset, so the 3D view paused. The 2D network shows the same simulation.",
        "lost",
      );
    };
    const visibility = () => {
      // Continuous rendering only while ambient effects are on and the tab is visible.
      setFrameloop(document.hidden ? "never" : effects ? "always" : "demand");
      if (!document.hidden) invalidate();
    };
    canvas.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      canvas.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", visibility);
      // R3F unmount disposes declarative geometries/materials, its renderer, render
      // lists, OrbitControls and frame subscriptions. Imperative materials and
      // textures are disposed by their owning hooks above.
    };
  }, [gl, setFrameloop, invalidate, effects]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Renderer                                                             */
/* ------------------------------------------------------------------ */

const cameraOptions = [
  ["ISOMETRIC", "City overview"],
  ["HOSPITAL", "Hospital focus"],
  ["FAULT", "Incident focus"],
  ["SUBSTATION", "Substation focus"],
  ["RESTORATION", "Restoration overview"],
  ["TOP_DOWN", "Top-down network"],
] as const;

export default function CityRenderer3D({
  heightClass = "h-[560px]",
  session: sessionOverride,
  interactive = true,
  overrides = {},
}: {
  heightClass?: string;
  /** Render a recorded state (replay) instead of the live session. */
  session?: SimulationSessionState;
  interactive?: boolean;
  overrides?: ViewOverrides;
}) {
  const {
    session: liveSession,
    selectedAssetId: storeSelection,
    setSelectedAssetId: storeSelect,
    cameraPreset,
    setCameraPreset,
    overlayMode,
    setOverlayMode,
    activeTraceNodeIds: storeTraceNodes,
    activeTraceEdgeIds: storeTraceEdges,
    applyAction,
  } = useSimulationStore();
  const session = sessionOverride ?? liveSession;
  const selectedAssetId =
    overrides.selectedAssetId !== undefined
      ? overrides.selectedAssetId
      : storeSelection;
  const setSelectedAssetId = overrides.onSelectAsset ?? storeSelect;
  const activeTraceNodeIds = overrides.traceNodeIds ?? storeTraceNodes;
  const activeTraceEdgeIds = overrides.traceEdgeIds ?? storeTraceEdges;
  const { dusk, reducedEffects, setDusk, setReducedEffects } = useViewPrefs();
  const [systemReduced, setSystemReduced] = useState(false);
  useEffect(() => setSystemReduced(prefersReducedMotion()), []);
  const effects = !reducedEffects && !systemReduced;

  const [labelHost, setLabelHost] = useState<HTMLDivElement | null>(null);
  const buildings = session.buildings_3d;
  const lines = useMemo(
    () => [
      ...(session.power_flow?.lines || []),
      ...(session.power_flow?.transformers || []).map((t) => ({
        ...t,
        line_id: t.transformer_id,
        p_from_mw: 0,
        q_from_mvar: 0,
        p_to_mw: 0,
        q_to_mvar: 0,
        pl_mw: 0,
        ql_mvar: 0,
        i_ka: 0,
      })),
    ],
    [session.power_flow],
  );
  const faults = session.active_faults;
  const switches = session.switches;
  const switchByLine = useMemo(() => {
    const map: Record<string, SwitchModel> = {};
    switches.forEach((sw) => {
      if (sw.line_id) map[sw.line_id] = sw;
    });
    return map;
  }, [switches]);
  const batteryByBus = useMemo(() => {
    const map: Record<string, BatteryModel> = {};
    (session.batteries || []).forEach((b) => {
      map[b.bus_id] = b;
    });
    return map;
  }, [session.batteries]);
  const posByBus = useMemo(() => {
    const map: Record<string, Vec3> = {};
    buildings.forEach((b) => {
      map[b.bus_id] = b.position_3d;
    });
    return map;
  }, [buildings]);
  const faultedAssets = useMemo(
    () => new Set(faults.filter((f) => !f.cleared).map((f) => f.asset_id)),
    [faults],
  );
  const goal = cameraGoal(cameraPreset, buildings, faults, lines, posByBus, activeTraceEdgeIds);
  const extent = useMemo(() => {
    if (!buildings.length) return 30;
    const xs = buildings.map((b) => b.position_3d[0]),
      zs = buildings.map((b) => b.position_3d[2]);
    return Math.max(20, (Math.max(...xs) - Math.min(...xs)) / 2 + 8, (Math.max(...zs) - Math.min(...zs)) / 2 + 8);
  }, [buildings]);
  const showPoles = effects && lines.length <= 60;

  return (
    <div
      data-testid="city-canvas-3d"
      data-effects={effects ? "full" : "reduced"}
      className={`relative w-full ${heightClass} rounded-xl border border-slate-200 bg-slate-50 overflow-hidden`}
    >
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center gap-2 presentation-hide pointer-events-none">
        <label className="pointer-events-auto bg-white rounded-lg border border-slate-200 p-2 text-xs">
          Camera{" "}
          <select
            aria-label="Camera preset"
            value={cameraPreset}
            onChange={(e) => setCameraPreset(e.target.value as typeof cameraPreset)}
            className="ml-2 bg-white"
          >
            {cameraOptions.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
            {cameraPreset === "FREE" && <option value="FREE">Free</option>}
          </select>
        </label>
        <label className="pointer-events-auto bg-white rounded-lg border border-slate-200 p-2 text-xs">
          Layer{" "}
          <select
            aria-label="City overlay"
            value={overlayMode}
            onChange={(e) => setOverlayMode(e.target.value as typeof overlayMode)}
            className="ml-2 bg-white"
          >
            {[
              ["ENERGIZATION", "Energization"],
              ["CRITICALITY", "Priority tiers"],
              ["VOLTAGE", "Bus voltage"],
              ["THERMAL", "Line loading"],
              ["ALGORITHM_TRACE", "Algorithm trace"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className="pointer-events-auto ml-auto flex gap-2">
          <button
            type="button"
            className="quiet-button bg-white"
            aria-pressed={dusk}
            onClick={() => setDusk(!dusk)}
          >
            {dusk ? "Dusk" : "Daylight"}
          </button>
          <button
            type="button"
            className="quiet-button bg-white"
            aria-pressed={!effects}
            title={systemReduced ? "Your system prefers reduced motion" : undefined}
            onClick={() => setReducedEffects(!reducedEffects)}
          >
            {effects ? "Full effects" : "Reduced effects"}
          </button>
        </div>
      </div>

      <div
        ref={setLabelHost}
        data-testid="city-label-overlay"
        className="absolute inset-0 z-10 pointer-events-none"
      />
      {/* Canvas mounts only after its independently owned label host exists. */}
      {labelHost && (
        <Canvas
          frameloop="demand"
          dpr={effects ? [1, 1.75] : [1, 1]}
          shadows={effects}
          camera={{ position: [19, 18, 21], fov: 42, far: 400 }}
          gl={{
            preserveDrawingBuffer: false,
            antialias: true,
            alpha: false,
            powerPreference: "default",
          }}
          onPointerMissed={() => undefined}
        >
          <SceneResources dusk={dusk} effects={effects}>
            <RendererLifecycle effects={effects} />
            <Lighting extent={extent} />
            <Scenery buildings={buildings} />

            {lines.map((ln) => {
              const fromPos = posByBus[ln.from_bus];
              const toPos = posByBus[ln.to_bus];
              if (!fromPos || !toPos) return null;
              return (
                <PowerCorridorLine
                  key={ln.line_id}
                  line={ln}
                  fromPos={fromPos}
                  toPos={toPos}
                  isSelected={selectedAssetId === ln.line_id}
                  isInTrace={activeTraceEdgeIds.includes(ln.line_id)}
                  isFaulted={faultedAssets.has(ln.line_id)}
                  switchState={switchByLine[ln.line_id]}
                  overlayMode={overlayMode}
                  showPoles={showPoles}
                  onSelect={setSelectedAssetId}
                  labelContainer={labelHost}
                />
              );
            })}

            {buildings.map((b) => (
              <ProceduralBuildingMesh
                key={b.building_id}
                building={b}
                battery={batteryByBus[b.bus_id]}
                isSelected={selectedAssetId === b.bus_id}
                isInTrace={activeTraceNodeIds.includes(b.bus_id)}
                overlayMode={overlayMode}
                onSelect={setSelectedAssetId}
                labelContainer={labelHost}
              />
            ))}

            <CameraRig goal={goal} effects={effects} maxDistance={extent * 3} />
          </SceneResources>
        </Canvas>
      )}

      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-end justify-between gap-2 pointer-events-none">
        {interactive && !sessionOverride ? (
          <details className="pointer-events-auto presentation-hide rounded-lg bg-white/95 px-3 py-1.5 border border-slate-200 text-xs">
            <summary>Tie switches</summary>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {switches.slice(0, 5).map((sw) => (
                <button
                  key={sw.switch_id}
                  onClick={() =>
                    applyAction(
                      sw.closed ? "OPEN_SWITCH" : "CLOSE_SWITCH",
                      sw.switch_id,
                    )
                  }
                  className={`flex items-center gap-1.5 rounded px-2 py-1 border transition ${
                    sw.closed
                      ? "bg-teal-50 border-teal-200 text-teal-700"
                      : "bg-slate-50 border-slate-200 text-amber-700"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${sw.closed ? "bg-teal-600" : "bg-amber-400"}`}
                  />
                  {sw.switch_id} ({sw.closed ? "closed" : "open"})
                </button>
              ))}
            </div>
          </details>
        ) : (
          <span />
        )}
        <div className="pointer-events-auto hidden md:flex items-center gap-3 rounded-lg bg-white/95 px-3 py-1.5 border border-slate-200 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-200 ring-1 ring-amber-400" /> Lit windows: supplied
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-600" /> Dark: no modeled supply
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4 bg-red-600" /> Faulted section
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4 bg-orange-500" /> Overloaded
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-4 bg-violet-600" /> Highlighted route
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Open switch
          </span>
        </div>
      </div>
    </div>
  );
}
