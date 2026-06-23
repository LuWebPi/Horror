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
