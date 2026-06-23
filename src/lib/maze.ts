// Maze definition for the asylum.
// 1 = wall, 0 = open floor, 2 = exit door location (open floor with door object)
// Hand-designed for atmosphere: corridors, rooms, dead ends.
// Each cell is CELL_SIZE units wide.

export const CELL_SIZE = 4

// 17 wide x 13 deep maze
export const MAZE: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,1,0,1,1,1,1,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,1],
  [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,1,1,0,1,0,1,1,1,0,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,1],
  [1,1,1,1,0,1,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
]

export const MAZE_WIDTH = MAZE[0].length // 17
export const MAZE_DEPTH = MAZE.length    // 13

// Convert grid coords to world coords (center of cell)
export function cellToWorld(col: number, row: number): [number, number, number] {
  const x = (col - MAZE_WIDTH / 2) * CELL_SIZE
  const z = (row - MAZE_DEPTH / 2) * CELL_SIZE
  return [x, 0, z]
}

// Convert world coords to grid coords
export function worldToCell(x: number, z: number): [number, number] {
  const col = Math.round(x / CELL_SIZE + MAZE_WIDTH / 2)
  const row = Math.round(z / CELL_SIZE + MAZE_DEPTH / 2)
  return [col, row]
}

// Check if a world position collides with a wall (with player radius)
export function isWallAt(x: number, z: number, radius = 0.6): boolean {
  // Check the cell of the point and neighboring cells for wall blocks
  const col = x / CELL_SIZE + MAZE_WIDTH / 2
  const row = z / CELL_SIZE + MAZE_DEPTH / 2

  // Check the four corners of the player's bounding circle
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const c = Math.floor(col + dx * radius / CELL_SIZE + (dx > 0 ? radius/CELL_SIZE : 0))
      const r = Math.floor(row + dz * radius / CELL_SIZE + (dz > 0 ? radius/CELL_SIZE : 0))
      if (r < 0 || r >= MAZE_DEPTH || c < 0 || c >= MAZE_WIDTH) return true
      if (MAZE[r][c] === 1) {
        // Detailed AABB check against this wall cell
        const wallMinX = (c - MAZE_WIDTH / 2) * CELL_SIZE - CELL_SIZE / 2
        const wallMaxX = (c - MAZE_WIDTH / 2) * CELL_SIZE + CELL_SIZE / 2
        const wallMinZ = (r - MAZE_DEPTH / 2) * CELL_SIZE - CELL_SIZE / 2
        const wallMaxZ = (r - MAZE_DEPTH / 2) * CELL_SIZE + CELL_SIZE / 2
        // closest point on wall to (x,z)
        const cx = Math.max(wallMinX, Math.min(x, wallMaxX))
        const cz = Math.max(wallMinZ, Math.min(z, wallMaxZ))
        const ddx = x - cx
        const ddz = z - cz
        if (ddx * ddx + ddz * ddz < radius * radius) return true
      }
    }
  }
  return false
}

// Player start position (in cell coords)
export const PLAYER_START_CELL: [number, number] = [1, 1]

// Key positions (in cell coords) - scattered around the maze
export const KEY_CELLS: [number, number][] = [
  [15, 1],   // top right room
  [3, 11],   // bottom left area
  [9, 9],    // mid area
]

// Exit door cell (where value === 2)
export const EXIT_CELL: [number, number] = [15, 11]

// Monster spawn (far from player)
export const MONSTER_SPAWN_CELL: [number, number] = [8, 6]

// Whisper trigger positions (cell coords) - when player enters these, whispers play
export const WHISPER_ZONES: { cell: [number, number]; audio: string }[] = [
  { cell: [7, 1], audio: '/audio/whisper1.mp3' },
  { cell: [1, 5], audio: '/audio/whisper2.mp3' },
  { cell: [15, 5], audio: '/audio/whisper3.mp3' },
  { cell: [9, 11], audio: '/audio/whisper4.mp3' },
  { cell: [3, 9], audio: '/audio/whisper5.mp3' },
  { cell: [13, 11], audio: '/audio/whisper6.mp3' },
]

// Light positions (cells that have ceiling lights)
export const LIGHT_CELLS: [number, number][] = [
  [3, 1], [9, 1], [15, 3],
  [1, 7], [7, 7], [13, 7],
  [5, 11], [11, 11],
]

// ===== Granny-style additions =====

// Furniture (decorative + blocking). type: bed, table, sofa, shelf, chair
export interface FurnitureDef {
  cell: [number, number]
  type: 'bed' | 'table' | 'sofa' | 'shelf' | 'chair' | 'crate'
  rot: number // yaw radians
}
export const FURNITURE: FurnitureDef[] = [
  // Bedroom (top-left)
  { cell: [2, 2], type: 'bed', rot: 0 },
  { cell: [4, 1], type: 'shelf', rot: 0 },
  { cell: [1, 3], type: 'chair', rot: Math.PI / 2 },
  // Top-right room
  { cell: [13, 1], type: 'bed', rot: 0 },
  { cell: [15, 1], type: 'shelf', rot: 0 },
  // Central areas
  { cell: [7, 3], type: 'table', rot: 0 },
  { cell: [9, 3], type: 'sofa', rot: Math.PI },
  { cell: [11, 5], type: 'shelf', rot: -Math.PI / 2 },
  { cell: [5, 5], type: 'table', rot: 0 },
  // Mid-low
  { cell: [3, 7], type: 'sofa', rot: 0 },
  { cell: [13, 7], type: 'table', rot: 0 },
  { cell: [9, 9], type: 'crate', rot: 0 },
  { cell: [11, 9], type: 'crate', rot: 0.3 },
  // Bottom rooms
  { cell: [5, 11], type: 'bed', rot: 0 },
  { cell: [3, 11], type: 'shelf', rot: 0 },
  { cell: [11, 11], type: 'table', rot: 0 },
  { cell: [13, 9], type: 'chair', rot: -Math.PI / 2 },
]

// Wardrobes / closets — interactive hiding spots. Press E to hide inside.
export const WARDROBE_CELLS: { cell: [number, number]; rot: number }[] = [
  { cell: [3, 1], rot: 0 },      // bedroom
  { cell: [15, 5], rot: -Math.PI / 2 },
  { cell: [1, 5], rot: 0 },
  { cell: [13, 11], rot: -Math.PI / 2 },
  { cell: [9, 7], rot: 0 },
  { cell: [5, 9], rot: 0 },
]

// Creaky floorboard cells — stepping on these makes a loud noise that attracts Granny.
export const CREAKY_CELLS: [number, number][] = [
  [5, 3], [11, 5], [3, 7], [13, 9], [7, 11], [9, 1], [5, 7], [11, 11],
]

// Patrol waypoints for Granny's wandering AI (cell coords). She cycles through these.
export const PATROL_WAYPOINTS: [number, number][] = [
  [8, 6],   // spawn / center
  [3, 1],   // bedroom
  [7, 1],   // top hall
  [15, 1],  // top-right room
  [15, 7],  // right hall
  [13, 11], // bottom-right
  [7, 11],  // bottom hall
  [1, 7],   // left hall
  [3, 11],  // bottom-left
  [8, 7],   // back to center
]

// Check if a world position is on a creaky floorboard
export function isCreakyAt(x: number, z: number): boolean {
  const [col, row] = worldToCell(x, z)
  return CREAKY_CELLS.some(([c, r]) => c === col && r === row)
}

// Find nearest wardrobe within range; returns index or -1
export function nearestWardrobe(x: number, z: number, maxDist = 1.8): number {
  let best = -1
  let bestD = maxDist * maxDist
  WARDROBE_CELLS.forEach((w, i) => {
    const [wx, , wz] = cellToWorld(w.cell[0], w.cell[1])
    const d = (wx - x) ** 2 + (wz - z) ** 2
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}

// Furniture collision radii per type (used as circular obstacles)
const FURN_RADIUS: Record<FurnitureDef['type'], number> = {
  bed: 1.0,
  table: 0.7,
  sofa: 0.8,
  shelf: 0.6,
  chair: 0.35,
  crate: 0.45,
}

// Check collision against furniture (circular obstacles)
export function isFurnitureBlocked(x: number, z: number, radius: number): boolean {
  for (const f of FURNITURE) {
    const [fx, , fz] = cellToWorld(f.cell[0], f.cell[1])
    const r = FURN_RADIUS[f.type] + radius
    const dx = x - fx
    const dz = z - fz
    if (dx * dx + dz * dz < r * r) return true
  }
  return false
}

// Combined solid check: walls OR furniture
export function isBlocked(x: number, z: number, radius: number): boolean {
  return isWallAt(x, z, radius) || isFurnitureBlocked(x, z, radius)
}

// Line-of-sight check: sample along the segment, return false if a wall blocks it.
export function hasLineOfSight(x1: number, z1: number, x2: number, z2: number): boolean {
  const dx = x2 - x1
  const dz = z2 - z1
  const dist = Math.hypot(dx, dz)
  const steps = Math.ceil(dist / 0.5)
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const sx = x1 + dx * t
    const sz = z1 + dz * t
    if (isWallAt(sx, sz, 0.2)) return false
  }
  return true
}
