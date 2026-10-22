'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import {
  useGameStore,
  DOMAIN_META,
  AnchorName,
  DomainId,
  isRegistrationComplete,
} from '@/store/useGameStore';
import {
  findWaypointPath,
  FALLBACK_NODE_COORDS,
  clampPositionToWalkways,
} from '@/lib/spatialPathfinder';

// Shared live telemetry exported for OrbitControls camera-follow in Scene.tsx (zero React re-renders)
export const mascotLiveWorldPos = new THREE.Vector3(6.8, 0.2, 3.9);
export const mascotLiveState = {
  isMoving: false,
};

// Module-scope scratch vectors to eliminate GC pauses in traversal and 60 FPS frame loops
const scratchVecA = new THREE.Vector3();
const scratchVecB = new THREE.Vector3();
const camForward = new THREE.Vector3();
const camRight = new THREE.Vector3();
const moveVec = new THREE.Vector3();
const gatePosVec = new THREE.Vector3(
  FALLBACK_NODE_COORDS.Anchor_Gate_SignUp[0],
  FALLBACK_NODE_COORDS.Anchor_Gate_SignUp[1],
  FALLBACK_NODE_COORDS.Anchor_Gate_SignUp[2]
);
const summitGatePosVec = new THREE.Vector3(
  FALLBACK_NODE_COORDS.Path_Summit_Gate[0],
  FALLBACK_NODE_COORDS.Path_Summit_Gate[1],
  FALLBACK_NODE_COORDS.Path_Summit_Gate[2]
);
const summitAstrolabePosVec = new THREE.Vector3(
  FALLBACK_NODE_COORDS.Anchor_Summit_Astrolabe[0],
  FALLBACK_NODE_COORDS.Anchor_Summit_Astrolabe[1],
  FALLBACK_NODE_COORDS.Anchor_Summit_Astrolabe[2]
);
const portalPosVecs: Record<DomainId, THREE.Vector3> = {
  CoreML: new THREE.Vector3(...FALLBACK_NODE_COORDS.Anchor_Portal_CoreML),
  WebDev: new THREE.Vector3(...FALLBACK_NODE_COORDS.Anchor_Portal_WebDev),
  Design: new THREE.Vector3(...FALLBACK_NODE_COORDS.Anchor_Portal_Design),
  Mgmt: new THREE.Vector3(...FALLBACK_NODE_COORDS.Anchor_Portal_Mgmt),
};

const clampOut = {
  x: 6.8,
  y: 0.2,
  z: 3.9,
  nearestNode: 'Anchor_Spawn_Point',
};

// Shortest-angle angular interpolation so rotation.y never spins 360 deg across -PI / +PI
function lerpAngleShortest(current: number, target: number, alpha: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * alpha;
}

export function Mascot() {
  const { scene } = useThree();

  // Load dedicated animated mascot model with its original club PBR/emissive shaders intact
  const { scene: mascotScene, animations } = useGLTF(
    '/models/Mascot_recruitment.glb'
  );

  const rootGroupRef = useRef<THREE.Group>(null);
  const modelGroupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  const { actions, names } = useAnimations(animations, modelGroupRef);

  const targetAnchor = useGameStore((s) => s.targetAnchor);
  const currentAnchor = useGameStore((s) => s.currentAnchor);
  const navigationNonce = useGameStore((s) => s.navigationNonce);
  const isMoving = useGameStore((s) => s.isMoving);
  const activeModal = useGameStore((s) => s.activeModal);
  const oauthVerified = useGameStore((s) => isRegistrationComplete(s.userProfile));
  const selectedDomains = useGameStore((s) => s.userProfile.selectedDomains);
  const isShortlisted = useGameStore((s) => s.isShortlisted);

  const navigateToAnchor = useGameStore((s) => s.navigateToAnchor);
  const setCurrentAnchor = useGameStore((s) => s.setCurrentAnchor);
  const setIsMoving = useGameStore((s) => s.setIsMoving);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const setActiveDomain = useGameStore((s) => s.setActiveDomain);
  const setCurrentStage = useGameStore((s) => s.setCurrentStage);
  const showToast = useGameStore((s) => s.showToast);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Track active Arrow / WASD keys in a ref for zero-re-render 60 FPS polling
  const keysPressedRef = useRef<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  }>({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  // Track which anchor threshold zones the mascot is currently inside so modals trigger
  // once upon entering (<= 0.8m) and only re-trigger after stepping outside (> 1.05m)
  const insideZoneRef = useRef<Record<string, boolean>>({
    Anchor_Gate_SignUp: false,
    Path_Summit_Gate: false,
    Anchor_Summit_Astrolabe: false,
    Anchor_Portal_CoreML: false,
    Anchor_Portal_WebDev: false,
    Anchor_Portal_Design: false,
    Anchor_Portal_Mgmt: false,
  });

  // Preserve 100% of Mascot_recruitment.glb original shaders (Matte Black face, Vibrant Blue brows,
  // Neon Blue emissive eye cutouts) — ONLY disable shadows & triangle raycasting on sub-meshes
  useEffect(() => {
    mascotScene.traverse((obj) => {
      obj.userData.isMascotNode = true;
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        mesh.frustumCulled = true;
        mesh.raycast = () => null;
      }
    });
  }, [mascotScene]);

  // Start embedded floating glide/hop and ear/eye animation loops from Mascot_recruitment.glb
  useEffect(() => {
    if (!actions || names.length === 0) return;

    // Play primary floating hop/glide clip ('Mascot_Guide_Hop') plus secondary ear & eye clips
    names.forEach((clipName) => {
      // Skip 'Mascot_Urge Look' so it doesn't conflict with 'Mascot_Guide_Hop' on the root Cube channel
      if (clipName === 'Mascot_Urge Look') return;
      const action = actions[clipName];
      if (action) {
        action.reset();
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.fadeIn(0.25).play();
      }
    });

    return () => {
      names.forEach((clipName) => {
        actions[clipName]?.fadeOut(0.2);
      });
    };
  }, [actions, names]);

  // Keyboard Event Controller for ArrowUp/Down/Left/Right & W/A/S/D
  useEffect(() => {
    const isInputFocused = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        (el as HTMLElement).isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused() || useGameStore.getState().activeModal !== null) {
        return;
      }

      let handled = false;
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          keysPressedRef.current.up = true;
          handled = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          keysPressedRef.current.down = true;
          handled = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          keysPressedRef.current.left = true;
          handled = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          keysPressedRef.current.right = true;
          handled = true;
          break;
      }

      if (handled) {
        e.preventDefault();
        // Automatically zoom camera into the mascot whenever navigating with keys
        if (useGameStore.getState().isCameraZoomedOut) {
          useGameStore.getState().setCameraZoomedOut(false);
        }
        // Cancel any automated GSAP path tween if the user takes manual keyboard control
        if (timelineRef.current) {
          timelineRef.current.kill();
          timelineRef.current = null;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          keysPressedRef.current.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          keysPressedRef.current.down = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          keysPressedRef.current.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          keysPressedRef.current.right = false;
          break;
      }
    };

    const clearAllKeys = () => {
      keysPressedRef.current.up = false;
      keysPressedRef.current.down = false;
      keysPressedRef.current.left = false;
      keysPressedRef.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearAllKeys);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearAllKeys);
    };
  }, []);

  // Clear active movement keys whenever a modal opens
  useEffect(() => {
    if (activeModal !== null) {
      keysPressedRef.current.up = false;
      keysPressedRef.current.down = false;
      keysPressedRef.current.left = false;
      keysPressedRef.current.right = false;
      mascotLiveState.isMoving = false;
    }
  }, [activeModal]);

  // Resolve a node's exact world position into `out` without heap allocations
  const writeNodeWorldPos = (
    nodeName: string,
    out: THREE.Vector3
  ): THREE.Vector3 => {
    const obj = scene.getObjectByName(nodeName);
    if (obj) {
      obj.getWorldPosition(out);
      return out;
    }
    const fb = FALLBACK_NODE_COORDS[nodeName] || [6.8, 0.2, 3.9];
    return out.set(fb[0], fb[1], fb[2]);
  };

  // Place mascot at currentAnchor on initial mount (clamped to Gate if registration is incomplete)
  useEffect(() => {
    if (!rootGroupRef.current) return;
    const regOk = isRegistrationComplete(useGameStore.getState().userProfile);
    const safeAnchor: AnchorName =
      !regOk &&
      currentAnchor !== 'Anchor_Spawn_Point' &&
      currentAnchor !== 'Anchor_Gate_SignUp'
        ? 'Anchor_Gate_SignUp'
        : currentAnchor;
    writeNodeWorldPos(safeAnchor, scratchVecA);
    rootGroupRef.current.position.copy(scratchVecA);
    mascotLiveWorldPos.copy(scratchVecA);
    // Face along the eastern walkway toward the gate on spawn
    if (safeAnchor === 'Anchor_Spawn_Point') {
      rootGroupRef.current.rotation.y = -Math.PI / 2;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to lock movement and slide modal into view
  const lockAndTriggerModal = (
    anchorName: AnchorName,
    modal: 'SIGNUP' | 'DOMAIN_FORM' | 'SLOT_PICKER',
    domainId?: DomainId
  ) => {
    keysPressedRef.current.up = false;
    keysPressedRef.current.down = false;
    keysPressedRef.current.left = false;
    keysPressedRef.current.right = false;
    mascotLiveState.isMoving = false;

    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    setIsMoving(false);
    setCurrentAnchor(anchorName);
    if (domainId) {
      setActiveDomain(domainId);
    }
    if (modal === 'SIGNUP' && !useGameStore.getState().userProfile.oauthVerified) {
      setCurrentStage('SIGNUP');
    } else if (modal === 'SLOT_PICKER') {
      setCurrentStage('SLOT_BOOKING');
    }
    setActiveModal(modal);
  };

  // Keep HUD & click-assisted multi-waypoint glide working seamlessly alongside Arrow Keys
  useEffect(() => {
    if (!rootGroupRef.current) return;

    const triggerDestinationModal = (dest: AnchorName | string) => {
      const state = useGameStore.getState();
      if (dest === 'Anchor_Gate_SignUp') {
        insideZoneRef.current.Anchor_Gate_SignUp = true;
        lockAndTriggerModal('Anchor_Gate_SignUp', 'SIGNUP');
      } else if (dest.startsWith('Anchor_Portal_')) {
        const domainEntry = Object.values(DOMAIN_META).find(
          (d) => d.anchor === dest
        );
        if (domainEntry) {
          insideZoneRef.current[dest] = true;
          lockAndTriggerModal(
            domainEntry.anchor,
            'DOMAIN_FORM',
            domainEntry.id
          );
        }
      } else if (dest === 'Anchor_Summit_Astrolabe') {
        if (state.isShortlisted) {
          insideZoneRef.current.Anchor_Summit_Astrolabe = true;
          lockAndTriggerModal('Anchor_Summit_Astrolabe', 'SLOT_PICKER');
        } else {
          showToast(
            'Your application is under review. Interview slot booking unlocks once shortlisted.',
            'gold'
          );
        }
      } else if (dest === 'Path_Summit_Gate' && !state.isShortlisted) {
        showToast(
          'Your application is under review. Interview slot booking unlocks once shortlisted.',
          'gold'
        );
      }
    };

    if (targetAnchor === currentAnchor && navigationNonce === 0) {
      return;
    }

    // Check if the mascot is already physically at targetAnchor
    writeNodeWorldPos(targetAnchor, scratchVecB);
    if (rootGroupRef.current.position.distanceTo(scratchVecB) <= 0.45) {
      if (navigationNonce > 0) {
        triggerDestinationModal(targetAnchor);
      }
      return;
    }

    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const waypoints = findWaypointPath(currentAnchor, targetAnchor, {
      allowPastGate: oauthVerified,
      allowSummit: isShortlisted,
    });

    if (waypoints.length <= 1) {
      triggerDestinationModal(targetAnchor);
      return;
    }

    const finalReachedNode = waypoints[waypoints.length - 1] as AnchorName;
    setIsMoving(true);
    mascotLiveState.isMoving = true;

    const tl = gsap.timeline({
      onUpdate: () => {
        if (rootGroupRef.current) {
          mascotLiveWorldPos.copy(rootGroupRef.current.position);
        }
      },
      onComplete: () => {
        mascotLiveState.isMoving = false;
        setIsMoving(false);
        setCurrentAnchor(finalReachedNode);
        triggerDestinationModal(finalReachedNode);
      },
    });

    timelineRef.current = tl;

    for (let i = 1; i < waypoints.length; i++) {
      if (i === 1) {
        scratchVecA.copy(rootGroupRef.current.position);
      } else {
        writeNodeWorldPos(waypoints[i - 1], scratchVecA);
      }
      writeNodeWorldPos(waypoints[i], scratchVecB);

      const distance = scratchVecA.distanceTo(scratchVecB);
      const duration = Math.max(0.42, Math.min(1.25, distance * 0.36));

      const dx = scratchVecB.x - scratchVecA.x;
      const dz = scratchVecB.z - scratchVecA.z;
      const targetYaw = Math.atan2(dx, dz);

      tl.to(
        rootGroupRef.current.position,
        {
          x: scratchVecB.x,
          y: scratchVecB.y,
          z: scratchVecB.z,
          duration,
          ease: i === waypoints.length - 1 ? 'power2.out' : 'none',
        },
        i === 1 ? 0 : '>'
      );

      tl.to(
        rootGroupRef.current.rotation,
        {
          y: targetYaw,
          duration: Math.min(0.16, duration),
          ease: 'sine.out',
        },
        '<'
      );
    }

    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetAnchor, navigationNonce]);

  // 60 FPS Real-Time Arrow-Key Navigation, Walkway Clamping & Threshold Detection Loop
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const root = rootGroupRef.current;
    if (!root) return;

    const keys = keysPressedRef.current;
    const modalOpen = useGameStore.getState().activeModal !== null;
    const hasKeyInput =
      !modalOpen && (keys.up || keys.down || keys.left || keys.right);

    if (hasKeyInput) {
      const dt = Math.min(delta, 0.05);
      const moveSpeed = 2.1; // Calm, unhurried Monument Valley traversal speed (m/s)

      // Compute horizontal forward & right vectors relative to the current camera angle
      state.camera.getWorldDirection(camForward);
      camForward.y = 0;
      if (camForward.lengthSq() < 0.0001) {
        camForward.set(-1, 0, -1);
      }
      camForward.normalize();

      camRight.crossVectors(camForward, THREE.Object3D.DEFAULT_UP).normalize();

      const forwardAxis = (keys.up ? 1 : 0) - (keys.down ? 1 : 0);
      const rightAxis = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);

      moveVec
        .set(0, 0, 0)
        .addScaledVector(camForward, forwardAxis)
        .addScaledVector(camRight, rightAxis);

      if (moveVec.lengthSq() > 0.0001) {
        moveVec.normalize();

        const prevX = root.position.x;
        const prevY = root.position.y;
        const prevZ = root.position.z;

        const candX = prevX + moveVec.x * moveSpeed * dt;
        const candZ = prevZ + moveVec.z * moveSpeed * dt;

        // Hard Gate Barrier: Before the first Sign-Up pop-up is completely filled (!oauthVerified),
        // if the mascot is at Anchor_Gate_SignUp and tries to push forward/climb,
        // block movement immediately, clamp at the gate, and open the Sign-Up pop-up!
        if (
          !oauthVerified &&
          root.position.distanceTo(gatePosVec) <= 0.85 &&
          (candZ < prevZ - 0.001 || candX < prevX - 0.001 || candZ < 3.55)
        ) {
          root.position.copy(gatePosVec);
          mascotLiveWorldPos.copy(gatePosVec);
          lockAndTriggerModal('Anchor_Gate_SignUp', 'SIGNUP');
          return;
        }

        // Constrain movement to the unlocked architectural walkways & stairs
        clampPositionToWalkways(
          prevX,
          prevY,
          prevZ,
          candX,
          candZ,
          {
            allowPastGate: oauthVerified,
            allowSummit: isShortlisted,
          },
          clampOut
        );

        const actualDx = clampOut.x - prevX;
        const actualDz = clampOut.z - prevZ;

        root.position.set(clampOut.x, clampOut.y, clampOut.z);
        mascotLiveWorldPos.copy(root.position);
        mascotLiveState.isMoving = true;

        // Smoothly rotate mascot heading toward actual movement vector (or input vector if Turning in place)
        const rotDx =
          actualDx * actualDx + actualDz * actualDz > 0.00002
            ? actualDx
            : moveVec.x;
        const rotDz =
          actualDx * actualDx + actualDz * actualDz > 0.00002
            ? actualDz
            : moveVec.z;
        const desiredYaw = Math.atan2(rotDx, rotDz);
        root.rotation.y = lerpAngleShortest(
          root.rotation.y,
          desiredYaw,
          Math.min(1, dt * 14)
        );
      }
    } else if (!timelineRef.current || !timelineRef.current.isActive()) {
      mascotLiveState.isMoving = false;
      mascotLiveWorldPos.copy(root.position);
    }

    // Modulate Mascot_Guide_Hop animation speed slightly when moving vs idle
    const hopAction = actions?.['Mascot_Guide_Hop'];
    if (hopAction) {
      hopAction.timeScale = mascotLiveState.isMoving ? 1.0 : 0.8;
    }

    // ==================== THRESHOLD DETECTION & AUTO-SLIDE MODALS ====================
    if (!modalOpen) {
      const pos = root.position;

      // 1. Ground Archway Gate Threshold (<= 0.8m of Anchor_Gate_SignUp)
      const gateDist = pos.distanceTo(gatePosVec);
      if (gateDist <= 0.8) {
        if (!insideZoneRef.current.Anchor_Gate_SignUp) {
          insideZoneRef.current.Anchor_Gate_SignUp = true;
          lockAndTriggerModal('Anchor_Gate_SignUp', 'SIGNUP');
          return;
        }
      } else if (gateDist > 1.15) {
        insideZoneRef.current.Anchor_Gate_SignUp = false;
      }

      // 2. Courtyard Domain Portal Thresholds (when OAuth verified)
      if (oauthVerified) {
        const domainIds = Object.keys(DOMAIN_META) as DomainId[];
        for (let i = 0; i < domainIds.length; i++) {
          const dId = domainIds[i];
          const meta = DOMAIN_META[dId];
          const pVec = portalPosVecs[dId];
          const pDist = pos.distanceTo(pVec);

          if (pDist <= 0.38) {
            if (!insideZoneRef.current[meta.anchor]) {
              insideZoneRef.current[meta.anchor] = true;
              if (selectedDomains.includes(dId)) {
                lockAndTriggerModal(meta.anchor, 'DOMAIN_FORM', dId);
                return;
              }
            }
          } else if (pDist > 0.65) {
            insideZoneRef.current[meta.anchor] = false;
          }
        }
      }

      // 3. Summit Portcullis & Summit Astrolabe Thresholds (<= 0.8m)
      if (!isShortlisted) {
        const portcullisDist = pos.distanceTo(summitGatePosVec);
        if (portcullisDist <= 0.75) {
          if (!insideZoneRef.current.Path_Summit_Gate) {
            insideZoneRef.current.Path_Summit_Gate = true;
            showToast(
              'Your application is under review. Interview slot booking unlocks once shortlisted.',
              'gold'
            );
          }
        } else if (portcullisDist > 1.1) {
          insideZoneRef.current.Path_Summit_Gate = false;
        }
      } else {
        const summitDist = pos.distanceTo(summitAstrolabePosVec);
        if (summitDist <= 0.8) {
          if (!insideZoneRef.current.Anchor_Summit_Astrolabe) {
            insideZoneRef.current.Anchor_Summit_Astrolabe = true;
            lockAndTriggerModal('Anchor_Summit_Astrolabe', 'SLOT_PICKER');
            return;
          }
        } else if (summitDist > 1.15) {
          insideZoneRef.current.Anchor_Summit_Astrolabe = false;
        }
      }
    }

    // Pulse the ground locator ring beneath the mascot
    if (haloRef.current) {
      const s = 1 + Math.sin(t * 3.2) * 0.12;
      haloRef.current.scale.set(s, s, 1);
    }
  });

  const hitBoxMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    []
  );

  const handleMascotClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (isMoving) return;

    if (currentAnchor === 'Anchor_Spawn_Point') {
      navigateToAnchor('Anchor_Gate_SignUp');
    } else if (currentAnchor === 'Anchor_Gate_SignUp') {
      if (!oauthVerified) {
        setActiveModal('SIGNUP');
      } else {
        const firstDomain = selectedDomains[0] || 'CoreML';
        navigateToAnchor(DOMAIN_META[firstDomain].anchor);
      }
    } else if (currentAnchor.startsWith('Anchor_Portal_')) {
      setActiveModal('DOMAIN_FORM');
    } else if (currentAnchor === 'Anchor_Summit_Astrolabe') {
      setActiveModal('SLOT_PICKER');
    }
  };

  return (
    <group ref={rootGroupRef} name="TAM_Mascot_Controller">
      {/* Ground Locator Ring beneath the Mascot */}
      <mesh
        ref={haloRef}
        position={[0, 0.04, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 4]}
        raycast={() => null}
      >
        <ringGeometry args={[0.22, 0.3, 4]} />
        <meshBasicMaterial
          color="#00E5FF"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Lightweight Click Hit-Box for Mascot */}
      <mesh
        position={[0, 0.48, 0]}
        material={hitBoxMat}
        onClick={handleMascotClick}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[0.7, 0.85, 0.7]} />
      </mesh>

      {/* Dedicated Animated Club Mascot Model (Mascot_recruitment.glb) with Original Shaders Preserved */}
      <group
        ref={modelGroupRef}
        position={[0, 0.14, 0]}
        scale={[0.32, 0.32, 0.32]}
      >
        <primitive object={mascotScene} />
      </group>
    </group>
  );
}

useGLTF.preload('/models/Mascot_recruitment.glb');
