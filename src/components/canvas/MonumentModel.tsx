'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import {
  useGameStore,
  DOMAIN_META,
  DomainId,
  AnchorName,
  isRegistrationComplete,
} from '@/store/useGameStore';
import { FALLBACK_NODE_COORDS } from '@/lib/spatialPathfinder';

// Dynamic mesh names whose transforms update at runtime (Astrolabe rings & Portcullis barrier)
const DYNAMIC_TRANSFORM_NAMES = new Set([
  'Astrolabe_Ring_Outer',
  'Astrolabe_Ring_Inner',
  'Astrolabe_Core',
  'Lock_Summit_Portcullis',
]);

// Pre-allocated shared Color constants to prevent GC allocations on state updates
const COLOR_GLACIAL_CYAN = new THREE.Color('#26E6E6');
const COLOR_EMISSIVE_CYAN = new THREE.Color('#00E5FF');
const COLOR_PASTEL_CYAN = new THREE.Color('#64FFDA');
const COLOR_DORMANT_RUNE = new THREE.Color('#B59A84');
const COLOR_DORMANT_EMISSIVE = new THREE.Color('#9E8070');
const COLOR_SHADED_TAUPE_VEIL = new THREE.Color('#9E8070');

export function MonumentModel() {
  // Load Draco-compressed monument_opt.glb using local /draco/ WASM decoder (zero external CDN stall)
  const { scene } = useGLTF('/models/monument_opt.glb', '/draco/');

  // Subscribe ONLY to structural/timestamp state — never raw keystroke strings (`savedDrafts`)
  const currentAnchor = useGameStore((s) => s.currentAnchor);
  const isMoving = useGameStore((s) => s.isMoving);
  const oauthVerified = useGameStore((s) => isRegistrationComplete(s.userProfile));
  const selectedDomains = useGameStore((s) => s.userProfile.selectedDomains);
  const savedQuestionTimestamps = useGameStore((s) => s.savedQuestionTimestamps);
  const applicationSealed = useGameStore((s) => s.applicationSealed);
  const isShortlisted = useGameStore((s) => s.isShortlisted);
  const pulsedDomain = useGameStore((s) => s.pulsedDomain);

  const navigateToAnchor = useGameStore((s) => s.navigateToAnchor);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const setActiveDomain = useGameStore((s) => s.setActiveDomain);
  const showToast = useGameStore((s) => s.showToast);
  const isDomainComplete = useGameStore((s) => s.isDomainComplete);

  // References to dynamic scene objects inside monument_opt.glb
  const outerRingRef = useRef<THREE.Object3D | null>(null);
  const innerRingRef = useRef<THREE.Object3D | null>(null);
  const astrolabeCoreRef = useRef<THREE.Object3D | null>(null);
  const portcullisRef = useRef<THREE.Object3D | null>(null);
  const waterfallRef = useRef<THREE.Mesh | null>(null);
  const runeMeshesRef = useRef<Partial<Record<DomainId, THREE.Mesh>>>({});
  const veilMeshesRef = useRef<Partial<Record<DomainId, THREE.Mesh>>>({});

  // Cursor targeting ring reference on walkways
  const cursorRingRef = useRef<THREE.Group | null>(null);
  const pulseIntensityRef = useRef<Record<DomainId, number>>({
    CoreML: 0,
    WebDev: 0,
    Design: 0,
    Mgmt: 0,
  });

  // Trigger a temporary cyan surge on a portal doorway when `[ SAVE DRAFT ]` is clicked
  useEffect(() => {
    if (pulsedDomain?.domain) {
      pulseIntensityRef.current[pulsedDomain.domain] = 1.1;
    }
  }, [pulsedDomain]);

  // Traverse the loaded scene once to apply the sunlit Monument Valley Water Palace palette,
  // deduplicate shared materials, enable frustum culling, bypass decorative raycasting, and freeze static matrices.
  useEffect(() => {
    outerRingRef.current = scene.getObjectByName('Astrolabe_Ring_Outer') || null;
    innerRingRef.current = scene.getObjectByName('Astrolabe_Ring_Inner') || null;
    astrolabeCoreRef.current = scene.getObjectByName('Astrolabe_Core') || null;
    portcullisRef.current = scene.getObjectByName('Lock_Summit_Portcullis') || null;
    waterfallRef.current = (scene.getObjectByName('FX_Waterfall') as THREE.Mesh) || null;

    // Pre-build shared Water Palace materials (zero harsh black/specular shine; matte sunlit clay & pastel cyan)
    const palaceMaterials = {
      sandstone: new THREE.MeshLambertMaterial({
        color: '#DEC7AA',
        flatShading: true,
      }),
      sandstoneWarmShade: new THREE.MeshLambertMaterial({
        color: '#D9C3A5',
        flatShading: true,
      }),
      candyPink: new THREE.MeshLambertMaterial({
        color: '#EE6E93',
        flatShading: true,
      }),
      dustyRoseBasin: new THREE.MeshLambertMaterial({
        color: '#E07A9A',
        flatShading: true,
      }),
      coralRamp: new THREE.MeshLambertMaterial({
        color: '#F48FB1',
        flatShading: true,
      }),
      portholeWhite: new THREE.MeshLambertMaterial({
        color: '#FFFFFF',
      }),
      oceanAqua: new THREE.MeshLambertMaterial({
        color: '#00BFA5',
      }),
      innerPoolCyan: new THREE.MeshStandardMaterial({
        color: '#64FFDA',
        emissive: '#80DEEA',
        emissiveIntensity: 0.35,
        roughness: 0.15,
        metalness: 0.0,
      }),
      waterfallCyan: new THREE.MeshStandardMaterial({
        color: '#00E5FF',
        emissive: '#00E5FF',
        emissiveIntensity: 1.0,
        roughness: 0.1,
        metalness: 0.0,
      }),
      splashFoam: new THREE.MeshStandardMaterial({
        color: '#E0F7FA',
        emissive: '#80DEEA',
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.0,
      }),
      archedWindows: new THREE.MeshStandardMaterial({
        color: '#80DEEA',
        emissive: '#26E6E6',
        emissiveIntensity: 0.55,
        roughness: 0.25,
      }),
      lilyPadGreen: new THREE.MeshLambertMaterial({
        color: '#76C043',
        flatShading: true,
      }),
      lotusPink: new THREE.MeshStandardMaterial({
        color: '#F48FB1',
        emissive: '#F48FB1',
        emissiveIntensity: 0.3,
        roughness: 0.5,
      }),
      aztecGold: new THREE.MeshStandardMaterial({
        color: '#FFB300',
        emissive: '#FFC107',
        emissiveIntensity: 0.25,
        metalness: 0.8,
        roughness: 0.2,
      }),
      portcullisRoseGold: new THREE.MeshStandardMaterial({
        color: '#D46A88',
        roughness: 0.45,
        metalness: 0.35,
      }),
    };

    scene.traverse((obj) => {
      // Strictly exclude Mascot_recruitment.glb node tree from palace material overrides
      if (
        obj.userData?.isMascotNode ||
        obj.name === 'TAM_Mascot_Controller' ||
        obj.name.includes('Mascot')
      ) {
        return;
      }

      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = true;
        // Disable expensive triangle raycasting on decorative GLB geometry
        mesh.raycast = () => null;

        const meshName = mesh.name || '';
        const matName = (mesh.material as THREE.Material)?.name || '';

        // Per-domain runes and doorway veils get independent material instances for state transitions
        if (meshName.startsWith('Rune_')) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: '#B59A84',
            emissive: '#9E8070',
            emissiveIntensity: 0.0,
            roughness: 0.4,
          });
        } else if (meshName.includes('_Veil')) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: '#9E8070',
            emissive: '#9E8070',
            emissiveIntensity: 0.08,
            roughness: 0.3,
            transparent: true,
            opacity: 0.65,
          });
        } else if (
          meshName === 'Arch_Porthole_Rims' ||
          meshName === 'Glow_Porthole_Cores'
        ) {
          // Crisp white circular porthole studs on the sunken basin
          mesh.material = palaceMaterials.portholeWhite;
        } else if (meshName === 'Arch_Plinth_Retaining_Walls') {
          // Sunken moat retaining basin in soft dusty rose
          mesh.material = palaceMaterials.dustyRoseBasin;
        } else if (
          meshName === 'Arch_Curved_Ramp' ||
          meshName === 'Arch_Curved_Ramp_Parapet'
        ) {
          // Facade sweeping curved ramp in soft coral pink
          mesh.material = palaceMaterials.coralRamp;
        } else if (meshName === 'Water_Inner_Pool') {
          // Inner Courtyard Pool: glowing pastel cyan basin
          mesh.material = palaceMaterials.innerPoolCyan;
        } else if (
          meshName === 'Water_Sea_Plane' ||
          matName === 'Mat_Midnight_Water'
        ) {
          // Surrounding Ocean Plane: vibrant tropical aqua/teal
          mesh.material = palaceMaterials.oceanAqua;
        } else if (
          meshName === 'FX_Waterfall' ||
          meshName === 'Astrolabe_Core' ||
          matName === 'Mat_Waterfall_Neon'
        ) {
          // Electric Glacial Cyan Waterfall & Core
          mesh.material = palaceMaterials.waterfallCyan;
        } else if (
          meshName === 'FX_Waterfall_Splash' ||
          matName === 'Mat_Splash_Foam'
        ) {
          // Soft white-cyan waterfall splash foam highlights
          mesh.material = palaceMaterials.splashFoam;
        } else if (
          meshName === 'Flora_LilyPads' ||
          matName === 'Mat_LilyPad'
        ) {
          // Bright chartreuse/warm leaf green lily pads
          mesh.material = palaceMaterials.lilyPadGreen;
        } else if (
          meshName === 'Flora_Lotus_Blooms' ||
          matName === 'Mat_Lotus_Glow'
        ) {
          // Vibrant soft pink lotus blooms
          mesh.material = palaceMaterials.lotusPink;
        } else if (
          meshName === 'Glow_Arched_Windows' ||
          matName === 'Mat_Window_Glow'
        ) {
          mesh.material = palaceMaterials.archedWindows;
        } else if (
          matName === 'Mat_Astrolabe_Gold' ||
          meshName.startsWith('Astrolabe_') ||
          meshName.startsWith('Gold_')
        ) {
          // Warm Aztec Gold / Saffron astrolabe & finials
          mesh.material = palaceMaterials.aztecGold;
        } else if (
          meshName === 'Lock_Summit_Portcullis' ||
          matName === 'Mat_Portcullis_Iron'
        ) {
          mesh.material = palaceMaterials.portcullisRoseGold;
        } else if (
          matName === 'Mat_Accent_Rose' ||
          meshName.includes('Dome') ||
          meshName.includes('Trim') ||
          meshName.includes('Lintel') ||
          meshName.includes('Battlements') ||
          meshName.includes('Balustrade') ||
          meshName.includes('Bands') ||
          meshName.includes('Spout')
        ) {
          // Vivid Candy/Blush Pink onion domes, canopy, and trims
          mesh.material = palaceMaterials.candyPink;
        } else if (
          meshName === 'Arch_Pool_Floor' ||
          meshName === 'Arch_Perimeter_Walkway'
        ) {
          mesh.material = palaceMaterials.sandstoneWarmShade;
        } else {
          // Main Monument Architecture (Walls, Walkways, Stairs, Minaret Shaft, Monolith): Warm Sunlit Sandstone
          mesh.material = palaceMaterials.sandstone;
        }
      }

      // Freeze static architecture transforms so Three.js does not recompute world matrices every frame
      const isDynamic =
        DYNAMIC_TRANSFORM_NAMES.has(obj.name) ||
        (obj.parent && DYNAMIC_TRANSFORM_NAMES.has(obj.parent.name));
      if (!isDynamic && obj !== scene) {
        obj.updateMatrix();
        obj.updateMatrixWorld(true);
        obj.matrixAutoUpdate = false;
      }
    });

    // Cache rune/veil references per domain after material assignment
    (Object.keys(DOMAIN_META) as DomainId[]).forEach((domainId) => {
      const meta = DOMAIN_META[domainId];
      const runeObj = scene.getObjectByName(meta.runeNode) as THREE.Mesh | undefined;
      if (runeObj) {
        runeMeshesRef.current[domainId] = runeObj;
      }
      const veilObj = scene.getObjectByName(meta.veilNode) as THREE.Mesh | undefined;
      if (veilObj) {
        veilMeshesRef.current[domainId] = veilObj;
      }
    });
  }, [scene]);

  // Synchronize Courtyard Doorways & Stone Glyphs with Selected Domains and Answered Questions
  useEffect(() => {
    const state = useGameStore.getState();

    (Object.keys(DOMAIN_META) as DomainId[]).forEach((domainId) => {
      const meta = DOMAIN_META[domainId];
      const completed = isDomainComplete(domainId);
      const selected = selectedDomains.includes(domainId);
      const hasAnySavedAnswer = meta.questions.some(
        (q) =>
          Boolean(savedQuestionTimestamps[q.id]) &&
          (state.savedDrafts[q.id] || '').trim().length > 0
      );

      const runeMesh = runeMeshesRef.current[domainId];
      if (runeMesh && runeMesh.material) {
        const mat = runeMesh.material as THREE.MeshStandardMaterial;
        if (completed || applicationSealed) {
          mat.emissive.copy(COLOR_EMISSIVE_CYAN);
          mat.emissiveIntensity = 1.25;
          mat.color.copy(COLOR_GLACIAL_CYAN);
        } else if (hasAnySavedAnswer && selected && oauthVerified) {
          mat.emissive.copy(COLOR_EMISSIVE_CYAN);
          mat.emissiveIntensity = 0.9;
          mat.color.copy(COLOR_GLACIAL_CYAN);
        } else if (selected && oauthVerified) {
          mat.emissive.copy(COLOR_EMISSIVE_CYAN);
          mat.emissiveIntensity = 0.55;
          mat.color.copy(COLOR_PASTEL_CYAN);
        } else {
          mat.emissive.copy(COLOR_DORMANT_EMISSIVE);
          mat.emissiveIntensity = 0.0;
          mat.color.copy(COLOR_DORMANT_RUNE);
        }
      }

      const veilMesh = veilMeshesRef.current[domainId];
      if (veilMesh && veilMesh.material) {
        const mat = veilMesh.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        if (completed || applicationSealed) {
          mat.color.copy(COLOR_GLACIAL_CYAN);
          mat.emissive.copy(COLOR_EMISSIVE_CYAN);
          mat.emissiveIntensity = 1.1;
          mat.opacity = 0.92;
        } else if (selected && oauthVerified) {
          mat.color.copy(COLOR_PASTEL_CYAN);
          mat.emissive.copy(COLOR_EMISSIVE_CYAN);
          mat.emissiveIntensity = 0.75;
          mat.opacity = 0.82;
        } else {
          mat.color.copy(COLOR_SHADED_TAUPE_VEIL);
          mat.emissive.copy(COLOR_SHADED_TAUPE_VEIL);
          mat.emissiveIntensity = 0.08;
          mat.opacity = 0.65;
        }
      }
    });
  }, [
    scene,
    savedQuestionTimestamps,
    selectedDomains,
    oauthVerified,
    applicationSealed,
    isDomainComplete,
  ]);

  // Zero-Allocation 60 FPS Runtime Loop for Dynamic Objects Only
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (outerRingRef.current) {
      outerRingRef.current.rotation.y += delta * 0.45;
      outerRingRef.current.rotation.x = Math.sin(t * 0.7) * 0.25;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= delta * 0.7;
      innerRingRef.current.rotation.y -= delta * 0.35;
    }
    if (astrolabeCoreRef.current) {
      astrolabeCoreRef.current.position.y = 8.16 + Math.sin(t * 2.4) * 0.06;
    }

    // Lower / raise Lock_Summit_Portcullis smoothly when shortlisted
    if (portcullisRef.current) {
      const targetY = isShortlisted ? 2.3 : 4.0;
      if (Math.abs(portcullisRef.current.position.y - targetY) > 0.005) {
        portcullisRef.current.position.y = THREE.MathUtils.lerp(
          portcullisRef.current.position.y,
          targetY,
          0.07
        );
        portcullisRef.current.visible = portcullisRef.current.position.y > 2.45;
      }
    }

    // Gentle Electric Glacial Cyan waterfall glow (0.85 - 1.15 intensity, never blown-out white)
    if (waterfallRef.current && waterfallRef.current.material) {
      const mat = waterfallRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.0 + Math.sin(t * 2.5) * 0.15;
    }

    // Decay any active `[ SAVE DRAFT ]` cyan doorway pulse smoothly
    (Object.keys(DOMAIN_META) as DomainId[]).forEach((domainId) => {
      const boost = pulseIntensityRef.current[domainId];
      if (boost > 0.02) {
        pulseIntensityRef.current[domainId] = THREE.MathUtils.lerp(boost, 0, 0.06);
        const veilObj = veilMeshesRef.current[domainId];
        if (veilObj && veilObj.material) {
          const mat = veilObj.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.8 + pulseIntensityRef.current[domainId];
        }
      }
    });
  });

  // Handle Spatial Anchor Navigation & Interaction
  const handleAnchorInteraction = (anchor: AnchorName, domainId?: DomainId) => {
    if (anchor === 'Anchor_Spawn_Point') {
      navigateToAnchor('Anchor_Spawn_Point');
      return;
    }

    if (anchor === 'Anchor_Gate_SignUp') {
      if (currentAnchor === 'Anchor_Gate_SignUp' && !isMoving) {
        setActiveModal('SIGNUP');
      } else {
        navigateToAnchor('Anchor_Gate_SignUp');
      }
      return;
    }

    if (anchor.startsWith('Anchor_Portal_')) {
      if (!oauthVerified) {
        showToast(
          'Please verify your @vitstudent.ac.in email at the front archway first.',
          'gold'
        );
        if (currentAnchor === 'Anchor_Gate_SignUp' && !isMoving) {
          setActiveModal('SIGNUP');
        } else {
          navigateToAnchor('Anchor_Gate_SignUp');
        }
        return;
      }

      if (domainId && !selectedDomains.includes(domainId)) {
        showToast(
          'This domain is not currently selected. Click Edit Preferences in your profile to add it.',
          'gold'
        );
        return;
      }

      if (domainId) {
        setActiveDomain(domainId);
      }
      if (currentAnchor === anchor && !isMoving) {
        setActiveModal('DOMAIN_FORM');
      } else {
        navigateToAnchor(anchor);
      }
      return;
    }

    if (anchor === 'Anchor_Summit_Astrolabe') {
      if (!oauthVerified) {
        showToast(
          'Please complete your registration at the front archway first.',
          'gold'
        );
        navigateToAnchor('Anchor_Gate_SignUp');
        return;
      }
      if (!isShortlisted) {
        showToast(
          'Your application is under review. Interview slot booking unlocks once shortlisted.',
          'gold'
        );
        return;
      }
      if (currentAnchor === 'Anchor_Summit_Astrolabe' && !isMoving) {
        setActiveModal('SLOT_PICKER');
      } else {
        navigateToAnchor('Anchor_Summit_Astrolabe');
      }
    }
  };

  // Shared invisible hit-box material (0 GPU fragment cost, ultra-fast 12-triangle raycast)
  const invisibleColliderMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    []
  );

  // Move the subtle 3D cyan cursor targeting ring using raw coordinates (zero `new THREE.Vector3` allocations)
  const updateCursorRingCoords = (x: number, y: number, z: number) => {
    if (cursorRingRef.current) {
      cursorRingRef.current.visible = true;
      cursorRingRef.current.position.set(x, y + 0.03, z);
    }
    document.body.style.cursor = 'pointer';
  };

  const hideCursorRing = () => {
    if (cursorRingRef.current) {
      cursorRingRef.current.visible = false;
    }
    document.body.style.cursor = 'auto';
  };

  return (
    <group>
      {/* Baked Monument Valley GLB (Raycasting bypassed & static matrices frozen) */}
      <primitive object={scene} />

      {/* Subtle 3D Cyan Targeting Ring following cursor on walkable platforms */}
      <group ref={cursorRingRef} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[0.24, 0.31, 24]} />
          <meshBasicMaterial
            color="#00E5FF"
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} raycast={() => null}>
          <ringGeometry args={[0.07, 0.11, 4]} />
          <meshBasicMaterial
            color="#00E5FF"
            transparent
            opacity={0.95}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ==================== LIGHTWEIGHT SPATIAL COLLIDERS & DIEGETIC FLOOR SEALS ==================== */}

      {/* 1. Outer Stone Moat Walkway Collider -> Glides Mascot toward First Front Archway */}
      <mesh
        position={[3.2, 0.35, 4.8]}
        material={invisibleColliderMat}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          updateCursorRingCoords(e.point.x, e.point.y, e.point.z);
        }}
        onPointerOut={hideCursorRing}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          handleAnchorInteraction('Anchor_Gate_SignUp');
        }}
      >
        <boxGeometry args={[8.5, 0.6, 3.2]} />
      </mesh>

      {/* Diegetic Floor Seal at Spawn Point */}
      <group position={FALLBACK_NODE_COORDS.Anchor_Spawn_Point}>
        <mesh
          position={[0, 0.03, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 4]}
          raycast={() => null}
        >
          <ringGeometry args={[0.28, 0.36, 4]} />
          <meshBasicMaterial
            color="#00E5FF"
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* 2. Ground Archway Lock Collider & Diegetic Seal (Anchor_Gate_SignUp) */}
      <group position={FALLBACK_NODE_COORDS.Anchor_Gate_SignUp}>
        <mesh
          position={[0, 0.04, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 4]}
          raycast={() => null}
        >
          <ringGeometry args={[0.34, 0.46, 4]} />
          <meshBasicMaterial
            color={oauthVerified ? '#26E6E6' : '#FFB300'}
            side={THREE.DoubleSide}
            transparent
            opacity={0.9}
          />
        </mesh>

        <mesh
          position={[0, 0.9, 0.2]}
          material={invisibleColliderMat}
          onPointerMove={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            updateCursorRingCoords(
              FALLBACK_NODE_COORDS.Anchor_Gate_SignUp[0],
              FALLBACK_NODE_COORDS.Anchor_Gate_SignUp[1],
              FALLBACK_NODE_COORDS.Anchor_Gate_SignUp[2]
            );
          }}
          onPointerOut={hideCursorRing}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            handleAnchorInteraction('Anchor_Gate_SignUp');
          }}
        >
          <boxGeometry args={[1.8, 2.2, 2.2]} />
        </mesh>
      </group>

      {/* 3. Courtyard of Portals: 4 Domain Doorway Colliders & Diegetic Runic Floor Seals */}
      {(Object.keys(DOMAIN_META) as DomainId[]).map((domainId) => {
        const meta = DOMAIN_META[domainId];
        const coords = FALLBACK_NODE_COORDS[meta.anchor];
        const completed = isDomainComplete(domainId);
        const selected = selectedDomains.includes(domainId);

        return (
          <group key={domainId} position={coords}>
            {/* Diegetic Diamond Floor Pad in front of each Portal */}
            <mesh
              position={[0, 0.03, 0]}
              rotation={[-Math.PI / 2, 0, Math.PI / 4]}
              raycast={() => null}
            >
              <ringGeometry args={[0.2, 0.28, 4]} />
              <meshBasicMaterial
                color={
                  completed
                    ? '#26E6E6'
                    : selected && oauthVerified
                    ? '#26E6E6'
                    : '#EE6E93'
                }
                transparent
                opacity={completed ? 0.95 : selected && oauthVerified ? 0.7 : 0.45}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Lightweight Box Hit-Target covering the Archway & Threshold */}
            <mesh
              position={[0, 1.0, -0.35]}
              material={invisibleColliderMat}
              onPointerMove={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                updateCursorRingCoords(coords[0], coords[1], coords[2]);
              }}
              onPointerOut={hideCursorRing}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                handleAnchorInteraction(meta.anchor, domainId);
              }}
            >
              <boxGeometry args={[0.88, 2.4, 1.3]} />
            </mesh>
          </group>
        );
      })}

      {/* 4. Lowered Portcullis / Upper Staircase Gate Hit-Target */}
      <mesh
        position={[2.4, 4.8, 1.35]}
        material={invisibleColliderMat}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          updateCursorRingCoords(2.4, 4.0, 1.5);
        }}
        onPointerOut={hideCursorRing}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          handleAnchorInteraction('Anchor_Summit_Astrolabe');
        }}
      >
        <boxGeometry args={[1.4, 2.0, 1.2]} />
      </mesh>

      {/* 5. Summit Gazebo & Golden Astrolabe Collider (Anchor_Summit_Astrolabe) */}
      <group position={FALLBACK_NODE_COORDS.Anchor_Summit_Astrolabe}>
        <mesh
          position={[0, 0.04, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={() => null}
        >
          <ringGeometry args={[0.38, 0.5, 8]} />
          <meshBasicMaterial
            color={isShortlisted ? '#FFB300' : '#EE6E93'}
            transparent
            opacity={isShortlisted ? 0.9 : 0.55}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh
          position={[0, 1.2, 0]}
          material={invisibleColliderMat}
          onPointerMove={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            updateCursorRingCoords(
              FALLBACK_NODE_COORDS.Anchor_Summit_Astrolabe[0],
              FALLBACK_NODE_COORDS.Anchor_Summit_Astrolabe[1],
              FALLBACK_NODE_COORDS.Anchor_Summit_Astrolabe[2]
            );
          }}
          onPointerOut={hideCursorRing}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            handleAnchorInteraction('Anchor_Summit_Astrolabe');
          }}
        >
          <boxGeometry args={[2.2, 2.8, 2.2]} />
        </mesh>
      </group>
    </group>
  );
}

useGLTF.preload('/models/monument_opt.glb', '/draco/');
