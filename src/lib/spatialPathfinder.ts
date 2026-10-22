import { AnchorName } from '@/store/useGameStore';

/**
 * Complete directed/undirected navigation graph of the 28 spatial locators
 * (7 primary Anchor_* + 21 intermediate Path_* empty objects) inside monument.glb.
 * Ensures the mascot glides along the true architectural walkways, bridges,
 * waterfall staircases, courtyard terrace, and summit steps without wall clipping.
 */
export const WAYPOINT_GRAPH: Record<string, string[]> = {
  // Ground Perimeter & Bridge (Y = 0.2 -> 1.0)
  Anchor_Spawn_Point: ['Path_Ring_East'],
  Path_Ring_East: ['Anchor_Spawn_Point', 'Path_Ring_SE', 'Path_Ramp_00'],
  Path_Ring_SE: ['Path_Ring_East', 'Path_Ring_South'],
  Path_Ring_South: ['Path_Ring_SE', 'Path_Bridge_Foot'],
  Path_Bridge_Foot: ['Path_Ring_South', 'Path_Bridge_Head'],
  Path_Bridge_Head: ['Path_Bridge_Foot', 'Anchor_Gate_SignUp'],
  Anchor_Gate_SignUp: ['Path_Bridge_Head', 'Path_Ledge_West'],

  // West Waterfall Staircase (Y = 1.0 -> 4.0)
  Path_Ledge_West: ['Anchor_Gate_SignUp', 'Path_Stairs_Foot'],
  Path_Stairs_Foot: ['Path_Ledge_West', 'Path_Stairs_Head'],
  Path_Stairs_Head: ['Path_Stairs_Foot', 'Path_Gallery_West'],
  Path_Gallery_West: ['Path_Stairs_Head', 'Anchor_Portal_CoreML'],

  // Courtyard Portal Gallery (Y = 4.0, Z = -2.25)
  Anchor_Portal_CoreML: ['Path_Gallery_West', 'Anchor_Portal_WebDev'],
  Anchor_Portal_WebDev: ['Anchor_Portal_CoreML', 'Anchor_Portal_Design'],
  Anchor_Portal_Design: ['Anchor_Portal_WebDev', 'Anchor_Portal_Mgmt'],
  Anchor_Portal_Mgmt: ['Anchor_Portal_Design', 'Path_Terrace_North'],

  // Courtyard Terrace & Curved East Ramp (Y = 4.0)
  Path_Terrace_North: ['Anchor_Portal_Mgmt', 'Path_Terrace_SW'],
  Path_Terrace_SW: ['Path_Terrace_North', 'Path_Summit_Gate', 'Path_EastWall_South'],
  Path_EastWall_South: ['Path_Terrace_SW', 'Path_EastWall_Ramp'],
  Path_EastWall_Ramp: ['Path_EastWall_South', 'Path_Ramp_90'],
  Path_Ramp_90: ['Path_EastWall_Ramp', 'Path_Ramp_60'],
  Path_Ramp_60: ['Path_Ramp_90', 'Path_Ramp_30'],
  Path_Ramp_30: ['Path_Ramp_60', 'Path_Ramp_00'],
  Path_Ramp_00: ['Path_Ramp_30', 'Path_Ring_East'],

  // Summit Staircase & Astrolabe Gazebo (Y = 4.0 -> 7.18)
  Path_Summit_Gate: ['Path_Terrace_SW', 'Path_Summit_Stairs_Foot'],
  Path_Summit_Stairs_Foot: ['Path_Summit_Gate', 'Path_Summit_Stairs_Head'],
  Path_Summit_Stairs_Head: ['Path_Summit_Stairs_Foot', 'Path_Summit_Top'],
  Path_Summit_Top: ['Path_Summit_Stairs_Head', 'Anchor_Summit_Astrolabe'],
  Anchor_Summit_Astrolabe: ['Path_Summit_Top'],
};

/**
 * Fallback exact world coordinates extracted from monument.glb.
 */
export const FALLBACK_NODE_COORDS: Record<string, [number, number, number]> = {
  Anchor_Spawn_Point: [6.8, 0.2, 3.9],
  Path_Ring_East: [5.7, 0.4, 3.9],
  Path_Ring_SE: [5.7, 0.4, 5.7],
  Path_Ring_South: [0.0, 0.4, 5.7],
  Path_Bridge_Foot: [0.0, 0.4, 5.2],
  Path_Bridge_Head: [0.0, 1.0, 4.6],
  Anchor_Gate_SignUp: [0.0, 1.0, 3.5],
  Path_Ledge_West: [-2.5, 1.0, 2.6],
  Path_Stairs_Foot: [-2.5, 1.0, 2.2],
  Path_Stairs_Head: [-2.5, 4.0, -1.2],
  Path_Gallery_West: [-2.5, 4.0, -2.25],
  Anchor_Portal_CoreML: [-1.6, 4.0, -2.25],
  Anchor_Portal_WebDev: [-0.7, 4.0, -2.25],
  Anchor_Portal_Design: [0.2, 4.0, -2.25],
  Anchor_Portal_Mgmt: [1.1, 4.0, -2.25],
  Path_Terrace_North: [1.27, 4.0, -0.9],
  Path_Terrace_SW: [1.27, 4.0, 1.8],
  Path_EastWall_South: [3.5, 4.0, 1.8],
  Path_EastWall_Ramp: [3.5, 4.0, 1.3],
  Path_Ramp_90: [4.0, 4.0, 1.3],
  Path_Ramp_60: [4.85, 2.8, 1.53],
  Path_Ramp_30: [5.47, 1.6, 2.15],
  Path_Ramp_00: [5.7, 0.4, 3.0],
  Path_Summit_Gate: [2.4, 4.0, 1.8],
  Path_Summit_Stairs_Foot: [2.4, 4.0, 1.2],
  Path_Summit_Stairs_Head: [2.4, 7.0, -1.2],
  Path_Summit_Top: [2.5, 7.0, -1.6],
  Anchor_Summit_Astrolabe: [2.9, 7.18, -2.6],
};

export interface WalkableSegment {
  aName: string;
  bName: string;
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  requiresAuth: boolean;
  requiresSummit: boolean;
}

const POST_GATE_NODES = new Set<string>([
  'Path_Ledge_West',
  'Path_Stairs_Foot',
  'Path_Stairs_Head',
  'Path_Gallery_West',
  'Anchor_Portal_CoreML',
  'Anchor_Portal_WebDev',
  'Anchor_Portal_Design',
  'Anchor_Portal_Mgmt',
  'Path_Terrace_North',
  'Path_Terrace_SW',
  'Path_EastWall_South',
  'Path_EastWall_Ramp',
  'Path_Ramp_90',
  'Path_Ramp_60',
  'Path_Ramp_30',
  'Path_Ramp_00',
  'Path_Summit_Gate',
  'Path_Summit_Stairs_Foot',
  'Path_Summit_Stairs_Head',
  'Path_Summit_Top',
  'Anchor_Summit_Astrolabe',
]);

const SUMMIT_ONLY_NODES = new Set<string>([
  'Path_Summit_Stairs_Foot',
  'Path_Summit_Stairs_Head',
  'Path_Summit_Top',
  'Anchor_Summit_Astrolabe',
]);

/**
 * Precomputed undirected walkable architectural segments for real-time arrow-key clamping.
 */
export const WALKABLE_SEGMENTS: WalkableSegment[] = (() => {
  const seen = new Set<string>();
  const list: WalkableSegment[] = [];

  for (const [nodeA, neighbors] of Object.entries(WAYPOINT_GRAPH)) {
    const coordA = FALLBACK_NODE_COORDS[nodeA];
    if (!coordA) continue;
    for (const nodeB of neighbors) {
      const coordB = FALLBACK_NODE_COORDS[nodeB];
      if (!coordB) continue;
      const key = nodeA < nodeB ? `${nodeA}|${nodeB}` : `${nodeB}|${nodeA}`;
      if (seen.has(key)) continue;
      seen.add(key);

      list.push({
        aName: nodeA,
        bName: nodeB,
        ax: coordA[0],
        ay: coordA[1],
        az: coordA[2],
        bx: coordB[0],
        by: coordB[1],
        bz: coordB[2],
        requiresAuth: POST_GATE_NODES.has(nodeA) || POST_GATE_NODES.has(nodeB),
        requiresSummit: SUMMIT_ONLY_NODES.has(nodeA) || SUMMIT_ONLY_NODES.has(nodeB),
      });
    }
  }
  return list;
})();

/**
 * Projects a candidate world position `(candX, candY, candZ)` onto the nearest unlocked
 * walkway segment so arrow-key navigation glides smoothly along stairs, ramps, and bridges
 * without falling into the sea or clipping through solid monument walls.
 */
export function clampPositionToWalkways(
  currentX: number,
  currentY: number,
  currentZ: number,
  candX: number,
  candZ: number,
  options: { allowPastGate: boolean; allowSummit: boolean },
  outPos: { x: number; y: number; z: number; nearestNode: string }
): void {
  let bestDistSq = Infinity;
  let bestX = currentX;
  let bestY = currentY;
  let bestZ = currentZ;
  let bestNode = 'Anchor_Spawn_Point';

  for (let i = 0; i < WALKABLE_SEGMENTS.length; i++) {
    const seg = WALKABLE_SEGMENTS[i];
    if (seg.requiresAuth && !options.allowPastGate) continue;
    if (seg.requiresSummit && !options.allowSummit) continue;

    // Prevent jumping between floors that are vertically disconnected (e.g., ground ring vs upper terrace)
    const minSegY = Math.min(seg.ay, seg.by) - 0.85;
    const maxSegY = Math.max(seg.ay, seg.by) + 0.85;
    if (currentY < minSegY || currentY > maxSegY) continue;

    const abx = seg.bx - seg.ax;
    const abz = seg.bz - seg.az;
    const abLenSq = abx * abx + abz * abz;

    let t = 0;
    if (abLenSq > 0.0001) {
      t = ((candX - seg.ax) * abx + (candZ - seg.az) * abz) / abLenSq;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
    }

    const projX = seg.ax + abx * t;
    const projY = seg.ay + (seg.by - seg.ay) * t;
    const projZ = seg.az + abz * t;

    const dx = candX - projX;
    const dz = candZ - projZ;
    const dy = (currentY - projY) * 0.6;
    const distSq = dx * dx + dz * dz + dy * dy;

    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestX = projX;
      bestY = projY;
      bestZ = projZ;
      bestNode = t < 0.5 ? seg.aName : seg.bName;
    }
  }

  outPos.x = bestX;
  outPos.y = bestY;
  outPos.z = bestZ;
  outPos.nearestNode = bestNode;
}

/**
 * Computes the shortest architectural path of node names between two anchors/waypoints.
 * Never returns a wall-clipping straight line; if a gate/barrier blocks the target,
 * it routes to the blocking threshold itself.
 */
export function findWaypointPath(
  startNode: AnchorName | string,
  endNode: AnchorName | string,
  options?: { allowPastGate?: boolean; allowSummit?: boolean }
): string[] {
  if (startNode === endNode) return [startNode];

  const allowPastGate = options?.allowPastGate ?? true;
  const allowSummit = options?.allowSummit ?? true;

  // If not authenticated, clamp any upper-level destination to Anchor_Gate_SignUp
  let effectiveEndNode = endNode;
  if (!allowPastGate && endNode !== 'Anchor_Spawn_Point' && endNode !== 'Anchor_Gate_SignUp') {
    effectiveEndNode = 'Anchor_Gate_SignUp';
  } else if (!allowSummit && endNode === 'Anchor_Summit_Astrolabe') {
    effectiveEndNode = 'Path_Summit_Gate';
  }

  if (startNode === effectiveEndNode) return [startNode];

  const queue: string[][] = [[startNode]];
  const visited = new Set<string>([startNode]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === effectiveEndNode) {
      return path;
    }

    const neighbors = WAYPOINT_GRAPH[current] || [];
    for (const next of neighbors) {
      if (visited.has(next)) continue;

      // Prevent bypassing the sign-up gate via the East Ramp if not authenticated
      if (!allowPastGate && (next === 'Path_Ledge_West' || next === 'Path_Ramp_00')) {
        continue;
      }

      // When climbing from ground to courtyard, always ascend the iconic waterfall staircase
      if (
        allowPastGate &&
        current === 'Path_Ring_East' &&
        next === 'Path_Ramp_00' &&
        (startNode === 'Anchor_Spawn_Point' || startNode === 'Anchor_Gate_SignUp')
      ) {
        continue;
      }

      if (!allowSummit && next === 'Path_Summit_Stairs_Foot') {
        continue;
      }

      visited.add(next);
      queue.push([...path, next]);
    }
  }

  return [startNode];
}
