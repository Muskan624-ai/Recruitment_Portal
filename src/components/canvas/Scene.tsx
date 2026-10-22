'use client';

import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrthographicCamera,
  OrbitControls,
  AdaptiveDpr,
} from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { MonumentModel } from './MonumentModel';
import { Mascot, mascotLiveWorldPos } from './Mascot';
import { MonumentLoader } from './MonumentLoader';
import { useGameStore } from '@/store/useGameStore';

// Module-scope scratch vectors for zero-allocation OrbitControls camera follow & overview zoom
const desiredTarget = new THREE.Vector3(6.8, 0.85, 3.9);
const prevControlsTarget = new THREE.Vector3(6.8, 0.85, 3.9);
const targetDelta = new THREE.Vector3();
const PALACE_OVERVIEW_CENTER = new THREE.Vector3(0, 3.8, 0);

/**
 * Dual-Mode Isometric Camera Rig + Free OrbitControls:
 * 1. Mascot Navigation Zoom Mode (`isCameraZoomedOut === false`):
 *    - Automatically zooms in closely (`~2.15x` base zoom) and locks `OrbitControls.target`
 *      smoothly onto the mascot's live 3D position (`mascotLiveWorldPos`) while navigating.
 * 2. Full Palace Overview Mode (`isCameraZoomedOut === true`):
 *    - Activated via the HUD `[ ZOOM OUT COMPLETELY ]` button; smoothly zooms out to frame
 *      the entire Monument Valley Water Palace (`[0, 3.8, 0]`).
 */
function IsometricCameraRig() {
  const { size } = useThree();
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const cameraZoomMultiplier = useGameStore((s) => s.cameraZoomMultiplier);
  const isCameraZoomedOut = useGameStore((s) => s.isCameraZoomedOut);

  // Compute responsive base orthographic zoom
  const aspect = size.width / Math.max(1, size.height);
  const baseZoom =
    aspect < 0.75
      ? Math.min(size.width / 15.0, size.height / 17.5)
      : Math.min(size.width / 16.5, size.height / 14.5);

  // Full Palace Overview zoom vs Close-Up Mascot Navigation zoom
  const overviewZoom = Math.max(
    16,
    Math.min(36, baseZoom * 0.82 * cameraZoomMultiplier)
  );
  const mascotCloseZoom = Math.max(
    52,
    Math.min(98, baseZoom * 2.15 * cameraZoomMultiplier)
  );

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const cam = cameraRef.current;
    if (!controls || !cam) return;

    const dt = Math.min(delta, 0.05);

    if (isCameraZoomedOut) {
      // Smoothly interpolate target to the full Water Palace center
      desiredTarget.copy(PALACE_OVERVIEW_CENTER);
    } else {
      // Smoothly track the mascot's exact 3D position closely while navigating
      desiredTarget.set(
        mascotLiveWorldPos.x,
        mascotLiveWorldPos.y + 0.65,
        mascotLiveWorldPos.z
      );
    }

    prevControlsTarget.copy(controls.target);
    controls.target.lerp(desiredTarget, Math.min(1, dt * 6.5));

    // Shift camera position by the exact target delta to preserve user's orbit angle & distance
    targetDelta.subVectors(controls.target, prevControlsTarget);
    cam.position.add(targetDelta);

    // Smoothly interpolate orthographic zoom between Close-Up Mascot Zoom and Full Overview Zoom
    const targetZoom = isCameraZoomedOut ? overviewZoom : mascotCloseZoom;
    if (Math.abs(cam.zoom - targetZoom) > 0.08) {
      cam.zoom = THREE.MathUtils.lerp(
        cam.zoom,
        targetZoom,
        Math.min(1, dt * 5.5)
      );
      cam.updateProjectionMatrix();
    }

    controls.update();
  });

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}
        makeDefault
        position={[30.8, 28.85, 27.9]}
        zoom={mascotCloseZoom}
        near={-100}
        far={200}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[6.8, 0.85, 3.9]}
        enableRotate={true}
        enablePan={true}
        enableZoom={true}
        enableDamping={true}
        dampingFactor={0.05}
        minPolarAngle={Math.PI / 7}
        maxPolarAngle={Math.PI / 2.2}
        minZoom={14}
        maxZoom={110}
      />
    </>
  );
}

/**
 * High-Key Sunlit Monument Valley Water Palace Lighting Rig:
 * 1. Ambient Light: Soft cool cyan/sky bounce (#E0F7FA, intensity 1.5) for high-key shading.
 * 2. Key Directional Sunlight: Warm golden sun ([30, 45, 20], intensity 2.0, #FFF8E7) angled from upper-right.
 * 3. Fill Light: Subtle soft pink/warm fill from opposite angle ([-20, 20, -20], intensity 0.8, #FFE0EC) eliminating pitch-black shadow faces.
 */
function SunlitWaterPalaceLighting() {
  return (
    <>
      {/* Vibrant Tropical Aqua Background + Horizon Teal Gradient Fog */}
      <color attach="background" args={['#00BFA5']} />
      <fog attach="fog" args={['#009688', 42, 95]} />

      {/* 1. Soft Cyan Sky Ambient Fill Light */}
      <ambientLight intensity={1.5} color="#E0F7FA" />

      {/* 2. Warm Golden Directional Sun from Upper-Right */}
      <directionalLight
        position={[30, 45, 20]}
        intensity={2.0}
        color="#FFF8E7"
      />

      {/* 3. Opposite Warm Rose Bounce Fill Light (No pitch-black shadow faces) */}
      <directionalLight
        position={[-20, 20, -20]}
        intensity={0.8}
        color="#FFE0EC"
      />
    </>
  );
}

export default function Scene() {
  return (
    <div
      className="fixed inset-0 w-full h-full z-0 pointer-events-auto select-none"
      aria-label="Interactive 3D Monument Valley Water Palace Recruitment Spire"
    >
      <Canvas
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        shadows={false}
        raycaster={
          {
            filter: (items: THREE.Intersection[]) => items.slice(0, 1),
          } as unknown as Partial<THREE.Raycaster>
        }
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = false;
        }}
      >
        <AdaptiveDpr pixelated />
        <IsometricCameraRig />
        <SunlitWaterPalaceLighting />
        <Suspense fallback={<MonumentLoader />}>
          <MonumentModel />
          <Mascot />
        </Suspense>
      </Canvas>
    </div>
  );
}
