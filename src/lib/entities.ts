// Shared mutable entity positions, read/written by 3D components each frame.
// Avoids prop drilling and re-renders for tight game-loop coordination.

export const entities = {
  player: {
    x: 0,
    z: 0,
    yaw: 0,    // facing direction (radians)
    fx: 0,     // forward vector X (normalized, XZ plane)
    fz: -1,    // forward vector Z (normalized, XZ plane)
    moving: false,
    sprinting: false,
  },
  monster: {
    x: 0,
    z: 0,
    active: false,    // is the monster currently chasing/spawned
    visible: false,   // currently in camera view & close
    distanceToPlayer: 999,
  },
}

// Flags set by GameLogic / Monster, consumed by Player for jump scares
export const scare = {
  // when true, the monster has reached the player -> trigger jump scare + game over
  caught: false,
  // scripted scare requested (e.g. on first key pickup)
  scriptedScare: null as 'monster1' | 'monster2' | null,
}
