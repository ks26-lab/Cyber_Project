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
  isInTrace: boolean,
): { primary: string; emissive: string; windowColor: string } {
  if (isInTrace) {
    return { primary: "#375F9B", emissive: "#7C3AED", windowColor: "#C4B5FD" };
  }
  if (b.power_state === "BLACKOUT") {
    return { primary: "#A5B5C5", emissive: "#B95D59", windowColor: "#450A0A" };
  }
  if (overlayMode === "CRITICALITY") {
    if (b.priority_tier === 1) {
      return {
        primary: "#065F46",
        emissive: "#4F8A80",
        windowColor: "#6EE7B7",
      };
    }
    if (b.priority_tier === 2) {
      return {
        primary: "#1E3A8A",
        emissive: "#5787A5",
        windowColor: "#93C5FD",
      };
    }
    return { primary: "#334155", emissive: "#94A3B8", windowColor: "#CBD5E1" };
  }
  if (overlayMode === "VOLTAGE") {
    if (b.voltage_pu >= 0.97) {
      return {
        primary: "#065F46",
        emissive: "#4F8A80",
        windowColor: "#A7F3D0",
      };
    }
    if (b.voltage_pu >= 0.93) {
      return {
        primary: "#78350F",
        emissive: "#B28B48",
        windowColor: "#FDE68A",
      };
    }
    return { primary: "#7F1D1D", emissive: "#B95D59", windowColor: "#FCA5A5" };
  }
  // Default ENERGIZATION mode
  if (b.power_state === "BACKUP_BATTERY") {
    return { primary: "#0C4A6E", emissive: "#5787A5", windowColor: "#7DD3FC" };
  }
  if (b.power_state === "CURTAILED") {
    return { primary: "#78350F", emissive: "#B28B48", windowColor: "#FCD34D" };
  }
  if (b.power_state === "SOURCE_ACTIVE") {
    return { primary: "#164E63", emissive: "#3D739B", windowColor: "#3D739B" };
  }
  if (b.priority_tier === 1) {
    return { primary: "#718C9C", emissive: "#4F8A80", windowColor: "#A7F3D0" };
  }
  return {
    primary: isSelected ? "#1E3A8A" : "#7E95A9",
    emissive: isSelected ? "#3D739B" : "#0EA5E9",
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
      const s = 1;
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
          color={isSelected ? "#164E63" : "#DDE5EC"}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Selection / Status Base Ring */}
      <mesh
        ref={pulseRef}
        position={[0, 0.18, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[1.65, 1.92, 32]} />
        <meshBasicMaterial
          color={
            isBlackout
              ? "#B95D59"
              : isInTrace
                ? "#375F9B"
                : isSelected || hovered
                  ? "#3D739B"
                  : colors.emissive
          }
          transparent
          opacity={isSelected || hovered || isBlackout || isInTrace ? 0.7 : 0}
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
              emissiveIntensity={0.06}
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
              emissiveIntensity={0.06}
            />
          </mesh>
          {/* Glowing Red Cross Emblem on Facade */}
          <mesh position={[0, 2.6, 0.93]}>
            <boxGeometry args={[0.75, 0.22, 0.06]} />
            <meshBasicMaterial color={isBlackout ? "#F87171" : "#B95D59"} />
          </mesh>
          <mesh position={[0, 2.6, 0.93]}>
            <boxGeometry args={[0.22, 0.75, 0.06]} />
            <meshBasicMaterial color={isBlackout ? "#F87171" : "#B95D59"} />
          </mesh>
          {/* Rooftop Helipad */}
          <mesh position={[0, 3.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.65, 24]} />
            <meshBasicMaterial
              color={isBlackout ? "#7F1D1D" : "#4F8A80"}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ) : ftype === "WATER_TREATMENT" ? (
        <group>
          {/* Clarification Tanks */}
          <mesh position={[-0.65, 0.75, -0.5]} castShadow>
            <cylinderGeometry args={[0.65, 0.65, 1.2, 24]} />
            <meshStandardMaterial
              color="#0C4A6E"
              emissive={isBlackout ? "#7F1D1D" : "#3D739B"}
              emissiveIntensity={0.06}
            />
          </mesh>
          <mesh position={[0.65, 0.75, -0.5]} castShadow>
            <cylinderGeometry args={[0.65, 0.65, 1.2, 24]} />
            <meshStandardMaterial
              color="#0C4A6E"
              emissive={isBlackout ? "#7F1D1D" : "#3D739B"}
              emissiveIntensity={0.06}
            />
          </mesh>
          {/* Main Pumping Hall & Elevated Tower */}
          <mesh position={[0, 1.1, 0.65]} castShadow>
            <boxGeometry args={[2.1, 1.9, 1.0]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.emissive}
              emissiveIntensity={0.06}
            />
          </mesh>
          <mesh position={[0.7, 2.5, 0.65]} castShadow>
            <cylinderGeometry args={[0.45, 0.25, 1.2, 16]} />
            <meshStandardMaterial
              color="#0284C7"
              emissive="#5787A5"
              emissiveIntensity={0.06}
            />
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
              emissiveIntensity={0.06}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
          {/* Telemetry Spire & Dish */}
          <mesh position={[0, 3.7, 0]}>
            <cylinderGeometry args={[0.06, 0.12, 1.4, 12]} />
            <meshBasicMaterial color="#3D739B" />
          </mesh>
          <mesh position={[0, 4.4, 0]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshBasicMaterial color={isBlackout ? "#B95D59" : "#3D739B"} />
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
              emissiveIntensity={0.06}
            />
          </mesh>
          {/* Observatory / Library Dome */}
          <mesh position={[0, 2.35, 0]}>
            <sphereGeometry
              args={[0.75, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshStandardMaterial
              color="#1E3A8A"
              emissive={isBlackout ? "#450A0A" : "#5787A5"}
              emissiveIntensity={0.06}
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
              emissiveIntensity={0.06}
            />
          </mesh>
          {/* Twin Smokestacks */}
          <mesh position={[0.9, 2.2, -0.5]} castShadow>
            <cylinderGeometry args={[0.22, 0.28, 3.6, 16]} />
            <meshStandardMaterial
              color="#334155"
              emissive="#B28B48"
              emissiveIntensity={0.06}
            />
          </mesh>
          <mesh position={[0.9, 2.0, 0.5]} castShadow>
            <cylinderGeometry args={[0.22, 0.28, 3.2, 16]} />
            <meshStandardMaterial
              color="#334155"
              emissive="#B28B48"
              emissiveIntensity={0.06}
            />
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
                emissive="#3D739B"
                emissiveIntensity={0.06}
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
              emissive="#5787A5"
              emissiveIntensity={0.06}
              metalness={0.6}
            />
          </mesh>
          <mesh position={[0.65, 0.85, 0]} castShadow>
            <boxGeometry args={[1.0, 1.4, 2.2]} />
            <meshStandardMaterial
              color="#082F49"
              emissive="#4F8A80"
              emissiveIntensity={0.06}
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
              color="#CBD5DF"
              emissive="#3D739B"
              emissiveIntensity={0.06}
              metalness={0.75}
            />
          </mesh>
          {/* HV Bushing Insulators / Gantry */}
          {[-0.6, 0, 0.6].map((xOff, i) => (
            <mesh key={i} position={[xOff, 2.25, 0]}>
              <cylinderGeometry args={[0.1, 0.14, 1.0, 12]} />
              <meshBasicMaterial color={isBlackout ? "#B95D59" : "#3D739B"} />
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
              emissiveIntensity={0.06}
            />
          </mesh>
          <mesh position={[0.55, 1.35, 0.45]} castShadow>
            <boxGeometry args={[1.2, 2.4, 1.2]} />
            <meshStandardMaterial
              color={colors.primary}
              emissive={colors.emissive}
              emissiveIntensity={0.06}
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
          className={`city-label ${isSelected ? "selected" : ""} cursor-pointer select-none whitespace-nowrap rounded-md px-2 py-0.5 font-sans text-xs border shadow-lg transition ${
            isBlackout
              ? "bg-red-50 border-red-200 text-red-700 "
              : isInTrace
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : isSelected
                  ? "bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-cyan-400"
                  : "bg-slate-50 border-slate-200 text-slate-700"
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
                      : "bg-blue-800"
              }`}
            />
            <span>{building.bus_id}</span>
            <span className="text-slate-500">•</span>
            <span>{building.name.split(" ")[0]}</span>
          </div>
          <div className="city-label-detail text-xs text-slate-600 flex items-center gap-1.5">
            <span>{building.voltage_pu.toFixed(3)} pu</span>
            {building.demand_mw > 0 && (
              <span>
                {building.served_mw.toFixed(1)}/{building.demand_mw.toFixed(1)}{" "}
                MW
              </span>
            )}
            {building.battery_soc_pct != null && (
              <span className="text-blue-700">
                SOC {building.battery_soc_pct.toFixed(0)}%
              </span>
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

  const start = useMemo(
    () => new THREE.Vector3(fromPos[0], 0.45, fromPos[2]),
    [fromPos],
  );
  const end = useMemo(
    () => new THREE.Vector3(toPos[0], 0.45, toPos[2]),
    [toPos],
  );
  const mid = useMemo(() => start.clone().lerp(end, 0.5), [start, end]);

  const color = isFaulted
    ? "#B95D59"
    : isInTrace
      ? "#375F9B"
      : isOut
        ? "#475569"
        : line.loading_percent > 95
          ? "#B95D59"
          : line.loading_percent > 80
            ? "#B28B48"
            : isTie
              ? "#4F8A80"
              : "#3D739B";

  useFrame(({ clock }) => {
    if (particleRef.current && !isOut) {
      const speed = Math.max(
        0.35,
        Math.min(1.8, Math.abs(line.p_from_mw) * 0.25),
      );
      const t = (clock.getElapsedTime() * speed) % 1;
      const pos =
        line.p_from_mw >= 0
          ? start.clone().lerp(end, t)
          : end.clone().lerp(start, t);
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
        lineWidth={isSelected || isInTrace ? 3 : 1.5}
        dashed={isOut}
        dashSize={0.5}
        gapSize={0.35}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(line.line_id);
        }}
      />
      {!isOut && (isSelected || isInTrace) && (
        <mesh ref={particleRef} position={[mid.x, mid.y, mid.z]}>
          <sphereGeometry args={[0.19, 12, 12]} />
          <meshBasicMaterial color={isInTrace ? "#C084FC" : "#3D739B"} />
        </mesh>
      )}
      {isFaulted && (
        <Html position={[mid.x, 1.3, mid.z]} center distanceFactor={25}>
          <div
            onClick={() => onSelect(line.line_id)}
            className="cursor-pointer rounded bg-red-50 px-1.5 py-0.5 font-sans text-xs font-bold text-slate-900 border border-red-200 shadow-lg "
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
      const hosp =
        buildings.find((b) => b.facility_type === "HOSPITAL") || buildings[2];
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

export function CityCanvas3D({
  heightClass = "h-[560px]",
}: {
  heightClass?: string;
}) {
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
    [faults],
  );

  return (
    <div
      data-testid="city-canvas-3d"
      className={`relative w-full ${heightClass} rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-2xl`}
    >
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 presentation-hide">
        <label className="bg-white rounded-lg border border-slate-200 p-2 text-xs">
          Camera{" "}
          <select
            aria-label="Camera preset"
            value={cameraPreset}
            onChange={(e) => setCameraPreset(e.target.value as any)}
            className="ml-2 bg-white"
          >
            {[
              ["ISOMETRIC", "Isometric"],
              ["TOP_DOWN", "Top down"],
              ["HOSPITAL", "Hospital"],
              ["SUBSTATION", "Substation"],
              ["FAULT", "Fault focus"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="bg-white rounded-lg border border-slate-200 p-2 text-xs">
          Layer{" "}
          <select
            aria-label="City overlay"
            value={overlayMode}
            onChange={(e) => setOverlayMode(e.target.value as any)}
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
      </div>

      {/* Three.js WebGL 3D City Viewport */}
      <Canvas
        shadows
        camera={{ position: [19, 18, 21], fov: 42 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <color attach="background" args={["#EEF3F6"]} />
        <fog attach="fog" args={["#EEF3F6", 32, 68]} />

        <ambientLight intensity={0.75} />
        <directionalLight
          position={[18, 28, 16]}
          intensity={1.35}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-12, 12, -10]} intensity={0.8} color="#3D739B" />
        <pointLight position={[10, 10, 8]} intensity={0.6} color="#4F8A80" />

        {/* Ground Plane & Isometric Engineering Grid */}
        <mesh
          position={[0, -0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial
            color="#EEF3F6"
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
        <gridHelper
          args={[52, 26, "#A5B5C5", "#CBD5DF"]}
          position={[0, 0.01, 0]}
        />

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

        <CameraController
          preset={cameraPreset}
          buildings={buildings}
          faults={faults}
        />
      </Canvas>

      {/* Bottom Interactive Tie-Switch Dock & Legend Overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Quick Tie-Switch Control Bar */}
        <details className="pointer-events-auto presentation-hide flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-200 backdrop-blur-md">
          <summary>Tie switches</summary>
          {switches.slice(0, 5).map((sw) => (
            <button
              key={sw.switch_id}
              onClick={() =>
                applyAction(
                  sw.closed ? "OPEN_SWITCH" : "CLOSE_SWITCH",
                  sw.switch_id,
                )
              }
              className={`flex items-center gap-1.5 rounded px-2 py-1 font-sans text-xs border transition ${
                sw.closed
                  ? "bg-teal-50 border-teal-200 text-teal-700"
                  : "bg-slate-100 border-slate-200 text-amber-700 hover:border-amber-200"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  sw.closed ? "bg-blue-800" : "bg-amber-400"
                }`}
              />
              <span>{sw.switch_id}</span>
              <span className="text-xs opacity-80">
                ({sw.closed ? "CLOSED" : "NO-OPEN"})
              </span>
            </button>
          ))}
        </details>

        {/* Status Color Legend */}
        <div className="pointer-events-auto hidden md:flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-200 font-sans text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-800" /> Tier-1
            Critical
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-800" /> Energized
            Feeder
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> BESS Support
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Curtailed /
            Open Tie
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Fault /
            Blackout
          </span>
        </div>
      </div>
    </div>
  );
}
