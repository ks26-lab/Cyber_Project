"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import {
  useSimulationStore,
  Building3DState,
  LineResult,
  SwitchModel,
  FaultModel,
} from "@/store/useSimulationStore";
import {
  Camera,
  Eye,
  Zap,
  ShieldAlert,
  BatteryCharging,
  Activity,
  Layers,
  Crosshair,
} from "lucide-react";

function getBuildingColor(
  b: Building3DState,
  overlayMode: string,
  isSelected: boolean,
  isInTrace: boolean
): { primary: string; emissive: string; windowColor: string } {
  if (isInTrace) {
    return { primary: "#8B5CF6", emissive: "#7C3AED", windowColor: "#C4B5FD" };
  }
  if (b.power_state === "BLACKOUT") {
    return { primary: "#1E293B", emissive: "#EF4444", windowColor: "#450A0A" };
  }
  if (overlayMode === "CRITICALITY") {
    if (b.priority_tier === 1) {
      return { primary: "#065F46", emissive: "#10B981", windowColor: "#6EE7B7" };
    }
    if (b.priority_tier === 2) {
      return { primary: "#1E3A8A", emissive: "#38BDF8", windowColor: "#93C5FD" };
    }
    return { primary: "#334155", emissive: "#94A3B8", windowColor: "#CBD5E1" };
  }
  if (overlayMode === "VOLTAGE") {
    if (b.voltage_pu >= 0.97) {
      return { primary: "#065F46", emissive: "#10B981", windowColor: "#A7F3D0" };
    }
    if (b.voltage_pu >= 0.93) {
      return { primary: "#78350F", emissive: "#F59E0B", windowColor: "#FDE68A" };
    }
    return { primary: "#7F1D1D", emissive: "#EF4444", windowColor: "#FCA5A5" };
  }
  // Default ENERGIZATION mode
  if (b.power_state === "BACKUP_BATTERY") {
    return { primary: "#0C4A6E", emissive: "#38BDF8", windowColor: "#7DD3FC" };
  }
  if (b.power_state === "CURTAILED") {
    return { primary: "#78350F", emissive: "#F59E0B", windowColor: "#FCD34D" };
  }
  if (b.power_state === "SOURCE_ACTIVE") {
    return { primary: "#164E63", emissive: "#22D3EE", windowColor: "#67E8F9" };
  }
  if (b.priority_tier === 1) {
    return { primary: "#0F2942", emissive: "#10B981", windowColor: "#A7F3D0" };
  }
  return {
    primary: isSelected ? "#1E3A8A" : "#152238",
    emissive: isSelected ? "#22D3EE" : "#0EA5E9",
    windowColor: "#BAE6FD",
  };
}

function ProceduralBuildingMesh({
  building,
  isSelected,
  isInTrace,
  overlayMode,
  onSelect,
}: {
  building: Building3DState;
  isSelected: boolean;
  isInTrace: boolean;
  overlayMode: string;
  onSelect: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const [x, , z] = building.position_3d;
  const colors = getBuildingColor(building, overlayMode, isSelected, isInTrace);
  const isBlackout = building.power_state === "BLACKOUT";
  const ftype = (building.facility_type || "SUBSTATION").toUpperCase();

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const t = clock.getElapsedTime();
      const s = 1 + 0.14 * Math.sin(t * (isBlackout ? 5.0 : 2.2));
      pulseRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group
      ref={groupRef}
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(building.bus_id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Concrete District Pad */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[3.4, 0.16, 3.4]} />
        <meshStandardMaterial
          color={isSelected ? "#164E63" : "#0D1524"}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Selection / Status Base Ring */}
      <mesh ref={pulseRef} position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.65, 1.92, 32]} />
        <meshBasicMaterial
          color={
            isBlackout
              ? "#EF4444"
              : isInTrace
              ? "#8B5CF6"
              : isSelected || hovered
              ? "#22D3EE"
              : colors.emissive
          }
          transparent
          opacity={isSelected || hovered || isBlackout || isInTrace ? 0.9 : 0.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Facility-Specific Architectural Geometry */}
      {ftype === "HOSPITAL" ? (
        <group>
          {/* Main Hospital Tower */}
          <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 3.4, 1.8]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.emissive}
              emissiveIntensity={isBlackout ? 0.05 : 0.35}
              roughness={0.3}
              metalness={0.5}
            />
          </mesh>
          {/* Emergency Trauma Wing */}
          <mesh position={[0.9, 1.0, 0.6]} castShadow>
            <boxGeometry args={[1.4, 1.8, 1.4]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.windowColor}
              emissiveIntensity={isBlackout ? 0.02 : 0.25}
            />
          </mesh>
          {/* Glowing Red Cross Emblem on Facade */}
          <mesh position={[0, 2.6, 0.93]}>
            <boxGeometry args={[0.75, 0.22, 0.06]} />
            <meshBasicMaterial color={isBlackout ? "#F87171" : "#EF4444"} />
          </mesh>
          <mesh position={[0, 2.6, 0.93]}>
            <boxGeometry args={[0.22, 0.75, 0.06]} />
            <meshBasicMaterial color={isBlackout ? "#F87171" : "#EF4444"} />
          </mesh>
          {/* Rooftop Helipad */}
          <mesh position={[0, 3.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.65, 24]} />
            <meshBasicMaterial color={isBlackout ? "#7F1D1D" : "#10B981"} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ) : ftype === "WATER_TREATMENT" ? (
        <group>
          {/* Clarification Tanks */}
          <mesh position={[-0.65, 0.75, -0.5]} castShadow>
            <cylinderGeometry args={[0.65, 0.65, 1.2, 24]} />
            <meshStandardMaterial
              color="#0C4A6E"
              emissive={isBlackout ? "#7F1D1D" : "#22D3EE"}
              emissiveIntensity={isBlackout ? 0.1 : 0.45}
            />
          </mesh>
          <mesh position={[0.65, 0.75, -0.5]} castShadow>
            <cylinderGeometry args={[0.65, 0.65, 1.2, 24]} />
            <meshStandardMaterial
              color="#0C4A6E"
              emissive={isBlackout ? "#7F1D1D" : "#22D3EE"}
              emissiveIntensity={isBlackout ? 0.1 : 0.45}
            />
          </mesh>
          {/* Main Pumping Hall & Elevated Tower */}
          <mesh position={[0, 1.1, 0.65]} castShadow>
            <boxGeometry args={[2.1, 1.9, 1.0]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.emissive}
              emissiveIntensity={isBlackout ? 0.05 : 0.3}
            />
          </mesh>
          <mesh position={[0.7, 2.5, 0.65]} castShadow>
            <cylinderGeometry args={[0.45, 0.25, 1.2, 16]} />
            <meshStandardMaterial color="#0284C7" emissive="#38BDF8" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ) : ftype === "CONTROL_CENTER" ? (
        <group>
          {/* Octagonal SCADA Command Fortress */}
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[1.1, 1.35, 3.0, 8]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.emissive}
              emissiveIntensity={isBlackout ? 0.08 : 0.45}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
          {/* Telemetry Spire & Dish */}
          <mesh position={[0, 3.7, 0]}>
            <cylinderGeometry args={[0.06, 0.12, 1.4, 12]} />
            <meshBasicMaterial color="#22D3EE" />
          </mesh>
          <mesh position={[0, 4.4, 0]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshBasicMaterial color={isBlackout ? "#EF4444" : "#22D3EE"} />
          </mesh>
        </group>
      ) : ftype === "UNIVERSITY" ? (
        <group>
          {/* Academic Main Hall */}
          <mesh position={[0, 1.2, 0]} castShadow>
            <boxGeometry args={[2.4, 2.1, 1.8]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.emissive}
              emissiveIntensity={isBlackout ? 0.05 : 0.3}
            />
          </mesh>
          {/* Observatory / Library Dome */}
          <mesh position={[0, 2.35, 0]}>
            <sphereGeometry args={[0.75, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color="#1E3A8A"
              emissive={isBlackout ? "#450A0A" : "#38BDF8"}
              emissiveIntensity={isBlackout ? 0.05 : 0.45}
            />
          </mesh>
        </group>
      ) : ftype === "INDUSTRIAL" ? (
        <group>
          {/* Heavy Factory Hall */}
          <mesh position={[-0.3, 1.1, 0]} castShadow>
            <boxGeometry args={[2.0, 1.9, 2.2]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.emissive}
              emissiveIntensity={isBlackout ? 0.05 : 0.25}
            />
          </mesh>
          {/* Twin Smokestacks */}
          <mesh position={[0.9, 2.2, -0.5]} castShadow>
            <cylinderGeometry args={[0.22, 0.28, 3.6, 16]} />
            <meshStandardMaterial color="#334155" emissive="#F59E0B" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0.9, 2.0, 0.5]} castShadow>
            <cylinderGeometry args={[0.22, 0.28, 3.2, 16]} />
            <meshStandardMaterial color="#334155" emissive="#F59E0B" emissiveIntensity={0.25} />
          </mesh>
        </group>
      ) : ftype === "SOLAR" ? (
        <group>
          {[-0.7, 0.2, 1.0].map((zOff, i) => (
            <mesh
              key={i}
              position={[0, 0.75, zOff - 0.2]}
              rotation={[Math.PI / 5, 0, 0]}
              castShadow
            >
              <boxGeometry args={[2.4, 0.1, 0.7]} />
              <meshStandardMaterial
                color="#0284C7"
                emissive="#22D3EE"
                emissiveIntensity={0.5}
                metalness={0.8}
                roughness={0.15}
              />
            </mesh>
          ))}
        </group>
      ) : ftype === "BATTERY" ? (
        <group>
          {/* Twin BESS Enclosures */}
          <mesh position={[-0.55, 0.85, 0]} castShadow>
            <boxGeometry args={[1.0, 1.4, 2.2]} />
            <meshStandardMaterial
              color="#082F49"
              emissive="#38BDF8"
              emissiveIntensity={0.55}
              metalness={0.6}
            />
          </mesh>
          <mesh position={[0.65, 0.85, 0]} castShadow>
            <boxGeometry args={[1.0, 1.4, 2.2]} />
            <meshStandardMaterial
              color="#082F49"
              emissive="#10B981"
              emissiveIntensity={0.45}
              metalness={0.6}
            />
          </mesh>
        </group>
      ) : ftype === "GRID_INTAKE" || ftype === "SUBSTATION" ? (
        <group>
          {/* High-Voltage Transformer Bay */}
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[1.9, 1.7, 1.9]} />
            <meshStandardMaterial
              color="#0F172A"
              emissive="#22D3EE"
              emissiveIntensity={isBlackout ? 0.05 : 0.55}
              metalness={0.75}
            />
          </mesh>
          {/* HV Bushing Insulators / Gantry */}
          {[-0.6, 0, 0.6].map((xOff, i) => (
            <mesh key={i} position={[xOff, 2.25, 0]}>
              <cylinderGeometry args={[0.1, 0.14, 1.0, 12]} />
              <meshBasicMaterial color={isBlackout ? "#EF4444" : "#22D3EE"} />
            </mesh>
          ))}
        </group>
      ) : (
        /* Residential / Commercial Twin High-Rise Towers */
        <group>
          <mesh position={[-0.45, 1.85, -0.3]} castShadow>
            <boxGeometry args={[1.25, 3.4, 1.25]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.windowColor}
              emissiveIntensity={isBlackout ? 0.02 : 0.35}
            />
          </mesh>
          <mesh position={[0.55, 1.35, 0.45]} castShadow>
            <boxGeometry args={[1.2, 2.4, 1.2]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.emissive}
              emissiveIntensity={isBlackout ? 0.02 : 0.3}
            />
          </mesh>
        </group>
      )}

      {/* Floating 3D Status Badge */}
      <Html
        position={[0, ftype === "CONTROL_CENTER" ? 4.9 : 3.9, 0]}
        center
        distanceFactor={28}
        zIndexRange={[10, 0]}
      >
        <div
          onClick={() => onSelect(building.bus_id)}
          className={`cursor-pointer select-none whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-[10px] border shadow-lg transition ${
            isBlackout
              ? "bg-red-950/95 border-red-500 text-red-200 animate-pulse"
              : isInTrace
              ? "bg-violet-950/95 border-violet-400 text-violet-100"
              : isSelected
              ? "bg-cyan-950/95 border-cyan-400 text-cyan-100 ring-1 ring-cyan-400"
              : "bg-[#0B111C]/90 border-slate-700/80 text-slate-200"
          }`}
        >
          <div className="flex items-center gap-1 font-bold">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isBlackout
                  ? "bg-red-400"
                  : building.power_state === "BACKUP_BATTERY"
                  ? "bg-sky-400"
                  : building.power_state === "CURTAILED"
                  ? "bg-amber-400"
                  : "bg-emerald-400"
              }`}
            />
            <span>{building.bus_id}</span>
            <span className="text-slate-400">•</span>
            <span>{building.name.split(" ")[0]}</span>
          </div>
          <div className="text-[9px] text-slate-300 flex items-center gap-1.5">
            <span>{building.voltage_pu.toFixed(3)} pu</span>
            {building.demand_mw > 0 && (
              <span>
                {building.served_mw.toFixed(1)}/{building.demand_mw.toFixed(1)} MW
              </span>
            )}
            {building.battery_soc_pct != null && (
              <span className="text-sky-300">SOC {building.battery_soc_pct.toFixed(0)}%</span>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}

function PowerCorridorLine({
  line,
  fromPos,
  toPos,
  isSelected,
  isInTrace,
  isFaulted,
  onSelect,
}: {
  line: LineResult;
  fromPos: [number, number, number];
  toPos: [number, number, number];
  isSelected: boolean;
  isInTrace: boolean;
  isFaulted: boolean;
  onSelect: (id: string) => void;
}) {
  const particleRef = useRef<THREE.Mesh>(null);
  const isTie = line.line_id.toUpperCase().includes("TIE");
  const isOut = line.status === "OUT_OF_SERVICE" || isFaulted;

  const start = useMemo(() => new THREE.Vector3(fromPos[0], 0.45, fromPos[2]), [fromPos]);
  const end = useMemo(() => new THREE.Vector3(toPos[0], 0.45, toPos[2]), [toPos]);
  const mid = useMemo(() => start.clone().lerp(end, 0.5), [start, end]);

  const color = isFaulted
    ? "#EF4444"
    : isInTrace
    ? "#A855F7"
    : isOut
    ? "#475569"
    : line.loading_percent > 95
    ? "#EF4444"
    : line.loading_percent > 80
    ? "#F59E0B"
    : isTie
    ? "#10B981"
    : "#22D3EE";

  useFrame(({ clock }) => {
    if (particleRef.current && !isOut) {
      const speed = Math.max(0.35, Math.min(1.8, Math.abs(line.p_from_mw) * 0.25));
      const t = (clock.getElapsedTime() * speed) % 1;
      const pos = line.p_from_mw >= 0 ? start.clone().lerp(end, t) : end.clone().lerp(start, t);
      particleRef.current.position.copy(pos);
    }
  });

  return (
    <group>
      <Line
        points={[
          [start.x, start.y, start.z],
          [end.x, end.y, end.z],
        ]}
        color={color}
        lineWidth={isSelected || isInTrace ? 4.2 : isOut ? 1.5 : 2.8}
        dashed={isOut}
        dashSize={0.5}
        gapSize={0.35}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(line.line_id);
        }}
      />
      {!isOut && (
        <mesh ref={particleRef} position={[mid.x, mid.y, mid.z]}>
          <sphereGeometry args={[0.19, 12, 12]} />
          <meshBasicMaterial color={isInTrace ? "#C084FC" : "#67E8F9"} />
        </mesh>
      )}
      {isFaulted && (
        <Html position={[mid.x, 1.3, mid.z]} center distanceFactor={25}>
          <div
            onClick={() => onSelect(line.line_id)}
            className="cursor-pointer rounded bg-red-600/95 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white border border-red-300 shadow-lg animate-bounce"
          >
            ⚡ FAULT: {line.line_id}
          </div>
        </Html>
      )}
    </group>
  );
}

function CameraController({
  preset,
  buildings,
  faults,
}: {
  preset: string;
  buildings: Building3DState[];
  faults: FaultModel[];
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    if (preset === "TOP_DOWN") {
      camera.position.set(0, 34, 0.01);
      controlsRef.current.target.set(0, 0, 0);
    } else if (preset === "HOSPITAL") {
      const hosp = buildings.find((b) => b.facility_type === "HOSPITAL") || buildings[2];
      const [hx, , hz] = hosp ? hosp.position_3d : [-2, 0, -9];
      camera.position.set(hx + 8, 9, hz + 9);
      controlsRef.current.target.set(hx, 1.5, hz);
    } else if (preset === "SUBSTATION") {
      const sub = buildings[0];
      const [sx, , sz] = sub ? sub.position_3d : [-14, 0, -10];
      camera.position.set(sx + 9, 10, sz + 9);
      controlsRef.current.target.set(sx, 1, sz);
    } else if (preset === "FAULT" && faults.length > 0) {
      camera.position.set(6, 14, 14);
      controlsRef.current.target.set(0, 0, -3);
    } else {
      // ISOMETRIC default
      camera.position.set(19, 18, 21);
      controlsRef.current.target.set(0, 0, 0);
    }
    controlsRef.current.update();
  }, [preset, camera, buildings, faults]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2.08}
      minDistance={6}
      maxDistance={48}
    />
  );
}

export function CityCanvas3D({ heightClass = "h-[560px]" }: { heightClass?: string }) {
  const {
    session,
    selectedAssetId,
    setSelectedAssetId,
    cameraPreset,
    setCameraPreset,
    overlayMode,
    setOverlayMode,
    activeTraceNodeIds,
    activeTraceEdgeIds,
    applyAction,
  } = useSimulationStore();

  const buildings = session.buildings_3d || [];
  const lines = session.power_flow?.lines || [];
  const faults = session.active_faults || [];
  const switches = session.switches || [];

  const posByBus = useMemo(() => {
    const map: Record<string, [number, number, number]> = {};
    buildings.forEach((b) => {
      map[b.bus_id] = b.position_3d;
    });
    return map;
  }, [buildings]);

  const faultedAssets = useMemo(
    () => new Set(faults.filter((f) => !f.cleared).map((f) => f.asset_id)),
    [faults]
  );

  return (
    <div
      data-testid="city-canvas-3d"
      className={`relative w-full ${heightClass} rounded-xl border border-slate-800/90 bg-[#06090F] overflow-hidden shadow-2xl`}
    >
      {/* Top Camera & Overlay Mode Floating HUD */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Camera Preset Switcher */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg bg-[#0B111C]/90 p-1 border border-slate-700/80 backdrop-blur-md">
          <span className="px-2 py-1 font-mono text-[10px] uppercase text-slate-400 flex items-center gap-1">
            <Camera className="h-3 w-3 text-cyan-400" /> Camera:
          </span>
          {(
            [
              ["ISOMETRIC", "Isometric"],
              ["TOP_DOWN", "Top-Down"],
              ["HOSPITAL", "Hospital"],
              ["SUBSTATION", "Substation"],
              ["FAULT", "Fault Focus"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setCameraPreset(id)}
              className={`rounded px-2 py-1 font-mono text-[11px] transition ${
                cameraPreset === id
                  ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 font-semibold"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Visual Overlay Switcher */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg bg-[#0B111C]/90 p-1 border border-slate-700/80 backdrop-blur-md">
          <span className="px-2 py-1 font-mono text-[10px] uppercase text-slate-400 flex items-center gap-1">
            <Layers className="h-3 w-3 text-violet-400" /> Layer:
          </span>
          {(
            [
              ["ENERGIZATION", "Energization"],
              ["CRITICALITY", "Priority Tiers"],
              ["VOLTAGE", "Bus Voltage (pu)"],
              ["THERMAL", "Line Loading (%)"],
              ["ALGORITHM_TRACE", "DSA Trace"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setOverlayMode(id)}
              className={`rounded px-2 py-1 font-mono text-[11px] transition ${
                overlayMode === id
                  ? "bg-violet-500/25 text-violet-200 border border-violet-400/50 font-semibold"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Three.js WebGL 3D City Viewport */}
      <Canvas
        shadows
        camera={{ position: [19, 18, 21], fov: 42 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={["#06090F"]} />
        <fog attach="fog" args={["#06090F", 32, 68]} />

        <ambientLight intensity={0.75} />
        <directionalLight
          position={[18, 28, 16]}
          intensity={1.35}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-12, 12, -10]} intensity={0.8} color="#22D3EE" />
        <pointLight position={[10, 10, 8]} intensity={0.6} color="#10B981" />

        {/* Ground Plane & Isometric Engineering Grid */}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color="#070B14" roughness={0.9} metalness={0.1} />
        </mesh>
        <gridHelper args={[52, 26, "#1E293B", "#0F172A"]} position={[0, 0.01, 0]} />

        {/* Render Power Feeder Corridors & Tie Lines */}
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
              onSelect={setSelectedAssetId}
            />
          );
        })}

        {/* Render All 3D City Buildings & Substations */}
        {buildings.map((b) => (
          <ProceduralBuildingMesh
            key={b.building_id}
            building={b}
            isSelected={selectedAssetId === b.bus_id}
            isInTrace={activeTraceNodeIds.includes(b.bus_id)}
            overlayMode={overlayMode}
            onSelect={setSelectedAssetId}
          />
        ))}

        <CameraController preset={cameraPreset} buildings={buildings} faults={faults} />
      </Canvas>

      {/* Bottom Interactive Tie-Switch Dock & Legend Overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Quick Tie-Switch Control Bar */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-lg bg-[#0B111C]/92 px-3 py-1.5 border border-slate-700/80 backdrop-blur-md">
          <span className="font-mono text-[10px] uppercase text-slate-400 mr-1">
            Tie Switches:
          </span>
          {switches.slice(0, 5).map((sw) => (
            <button
              key={sw.switch_id}
              onClick={() =>
                applyAction(sw.closed ? "OPEN_SWITCH" : "CLOSE_SWITCH", sw.switch_id)
              }
              className={`flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[11px] border transition ${
                sw.closed
                  ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200"
                  : "bg-slate-800/90 border-slate-700 text-amber-300 hover:border-amber-400/60"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  sw.closed ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span>{sw.switch_id}</span>
              <span className="text-[9px] opacity-80">
                ({sw.closed ? "CLOSED" : "NO-OPEN"})
              </span>
            </button>
          ))}
        </div>

        {/* Status Color Legend */}
        <div className="pointer-events-auto hidden md:flex items-center gap-3 rounded-lg bg-[#0B111C]/92 px-3 py-1.5 border border-slate-700/80 font-mono text-[10px] text-slate-300">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Tier-1 Critical
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400" /> Energized Feeder
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> BESS Support
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Curtailed / Open Tie
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Fault / Blackout
          </span>
        </div>
      </div>
    </div>
  );
}

