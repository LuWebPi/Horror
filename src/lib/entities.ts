// Shared mutable entity positions, read/written by 3D components each frame.
// Avoids prop drilling and re-renders for tight game-loop coordination.

export type MonsterState = 'patrol' | 'investigate' | 'chase' | 'search' | 'stunned'

export const entities = {
  player: {
    x: 0,
    z: 0,
    yaw: 0,    // facing direction (radians)
    fx: 0,     // forward vector X (normalized, XZ plane)
    fz: -1,    // forward vector Z (normalized, XZ plane)
    moving: false,
    sprinting: false,
    hidden: false,
    noiseLevel: 0,  // 0 silent, 1 walk, 2 run, 3 creaky/impact
  },
  monster: {
    x: 0,
    z: 0,
    active: false,    // spawned
    distanceToPlayer: 999,
    state: 'patrol' as MonsterState,
    // patrol target waypoint index
    waypoint: 0,
    // investigate/search target position
    targetX: 0,
    targetZ: 0,
    // last seen player position (for searching)
    lastSeenX: 0,
    lastSeenZ: 0,
    // timers (seconds)
    stateTimer: 0,
    stunTimer: 0,
    // can currently see the player
    canSeePlayer: false,
    // facing yaw (for body rotation)
    yaw: 0,
  },
}

// Flags set by Player, consumed by Monster/Player for jump scares & day transitions
export const scare = {
  caught: false,             // monster reached the player -> trigger jump scare
  scriptedScare: null as 'monster1' | 'monster2' | null,
  // noise event: a one-shot loud sound at a position (e.g. creaky floor, bump)
  noiseEvent: null as { x: number; z: number; level: number; t: number } | null,
}

export function emitNoise(x: number, z: number, level: number) {
  scare.noiseEvent = { x, z, level, t: performance.now() / 1000 }
}
