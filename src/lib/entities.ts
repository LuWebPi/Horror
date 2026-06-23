// Shared mutable entity positions, read/written by 3D components each frame.

export type MonsterState = 'patrol' | 'investigate' | 'chase' | 'search' | 'stunned'
export type TimeOfDay = 'day' | 'night'

export const entities = {
  player: {
    x: 0,
    y: 0,
    z: 0,
    floor: 0,
    yaw: 0,
    fx: 0,
    fz: -1,
    moving: false,
    sprinting: false,
    hidden: false,
    noiseLevel: 0,
  },
  monster: {
    x: 0,
    y: 0,
    z: 0,
    floor: 0,
    active: false,
    distanceToPlayer: 999,
    state: 'patrol' as MonsterState,
    waypoint: 0,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    lastSeenX: 0,
    lastSeenY: 0,
    lastSeenZ: 0,
    stateTimer: 0,
    stunTimer: 0,
    canSeePlayer: false,
    yaw: 0,
  },
  time: {
    phase: 'day' as TimeOfDay,
    // 0..1 progress through the current phase
    progress: 0,
  },
}

// Flags set by Player, consumed by Monster/Player
export const scare = {
  caught: false,
  scriptedScare: null as 'monster1' | 'monster2' | null,
  noiseEvent: null as { x: number; y: number; z: number; level: number; t: number } | null,
}

export function emitNoise(x: number, y: number, z: number, level: number) {
  scare.noiseEvent = { x, y, z, level, t: performance.now() / 1000 }
}
