// ===== SMALL CRAMPED HOUSE (Granny-style) =====
// Compact 2-story house: tight corridors, every room packed with furniture.
// Small grid for performance and that claustrophobic Granny feel.
// Values: 1 = wall, 0 = open floor, 2 = exit door (front door)

export const CELL_SIZE = 3.2  // smaller cells = tighter feel
const WALL_HEIGHT = 3.4

// ----- GROUND FLOOR (floor 0) ----- 11x9
// Layout:
//   Row 1-3 left:   FOYER (entrance + front door at [0,2])
//   Row 1-3 mid:    LIVING ROOM
//   Row 1-3 right:  KITCHEN
//   Row 4:           HALLWAY (stairs at [5,4])
//   Row 5-7 left:   DINING
//   Row 5-7 mid:    BATHROOM
//   Row 5-7 right:  STUDY
export const HOUSE_GROUND: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1],  // 0
  [1,0,0,0,1,0,0,0,1,0,1],  // 1  foyer | living | kitchen
  [2,0,0,0,1,0,0,0,1,0,1],  // 2  front door at left edge
  [1,0,0,0,0,0,0,0,0,0,1],  // 3  (openings between rooms)
  [1,0,0,0,1,0,1,0,1,0,1],  // 4  hallway + stairs [5,4]
  [1,1,0,1,1,0,1,0,1,1,1],  // 5  doorways
  [1,0,0,0,1,0,0,0,1,0,1],  // 6  dining | bathroom | study
  [1,0,0,0,1,0,0,0,1,0,1],  // 7
  [1,1,1,1,1,1,1,1,1,1,1],  // 8
]

// ----- UPPER FLOOR (floor 1) ----- 11x9
//   Row 1-3 left:   MASTER BEDROOM
//   Row 1-3 mid:    KIDS BEDROOM
//   Row 1-3 right:  CLOSET
//   Row 4:           HALLWAY (stairs down at [5,4])
//   Row 5-7 left:   BATHROOM
//   Row 5-7 mid:    SPARE ROOM
//   Row 5-7 right:  STORAGE
export const HOUSE_UPPER: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1],  // 0
  [1,0,0,0,1,0,0,0,1,0,1],  // 1  master | kids | closet
  [1,0,0,0,1,0,0,0,1,0,1],  // 2
  [1,0,0,0,0,0,0,0,0,0,1],  // 3
  [1,0,0,0,1,0,1,0,1,0,1],  // 4  hallway + stairs
  [1,1,0,1,1,0,1,0,1,1,1],  // 5
  [1,0,0,0,1,0,0,0,1,0,1],  // 6  bathroom | spare | storage
  [1,0,0,0,1,0,0,0,1,0,1],  // 7
  [1,1,1,1,1,1,1,1,1,1,1],  // 8
]

// Basement is gone — keep it small (just 2 floors now for performance)
export const FLOORS = [HOUSE_GROUND, HOUSE_UPPER]
export const FLOOR_HEIGHT = 3.6
export const MAZE_WIDTH = HOUSE_GROUND[0].length   // 11
export const MAZE_DEPTH = HOUSE_GROUND.length      // 9
export { WALL_HEIGHT }

export function cellAt(floor: number, col: number, row: number): number {
  const m = FLOORS[floor]
  if (!m || row < 0 || row >= m.length || col < 0 || col >= m[0].length) return 1
  return m[row][col]
}

export function cellToWorld(col: number, row: number, floor = 0): [number, number, number] {
  const x = (col - MAZE_WIDTH / 2) * CELL_SIZE
  const z = (row - MAZE_DEPTH / 2) * CELL_SIZE
  const y = floor * FLOOR_HEIGHT
  return [x, y, z]
}

export function worldToCell(x: number, y: number, z: number): [number, number, number] {
  const col = Math.round(x / CELL_SIZE + MAZE_WIDTH / 2)
  const row = Math.round(z / CELL_SIZE + MAZE_DEPTH / 2)
  const floor = Math.round(y / FLOOR_HEIGHT)
  return [col, row, floor]
}

export function isWallAt(x: number, y: number, z: number, radius = 0.55): boolean {
  const floor = Math.round(y / FLOOR_HEIGHT)
  const maze = FLOORS[floor]
  if (!maze) return true
  const col = x / CELL_SIZE + MAZE_WIDTH / 2
  const row = z / CELL_SIZE + MAZE_DEPTH / 2

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const c = Math.floor(col + dx * radius / CELL_SIZE + (dx > 0 ? radius / CELL_SIZE : 0))
      const r = Math.floor(row + dz * radius / CELL_SIZE + (dz > 0 ? radius / CELL_SIZE : 0))
      if (r < 0 || r >= maze.length || c < 0 || c >= maze[0].length) return true
      if (maze[r][c] === 1) {
        const wallMinX = (c - MAZE_WIDTH / 2) * CELL_SIZE - CELL_SIZE / 2
        const wallMaxX = (c - MAZE_WIDTH / 2) * CELL_SIZE + CELL_SIZE / 2
        const wallMinZ = (r - MAZE_DEPTH / 2) * CELL_SIZE - CELL_SIZE / 2
        const wallMaxZ = (r - MAZE_DEPTH / 2) * CELL_SIZE + CELL_SIZE / 2
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

// Player start (foyer)
export const PLAYER_START_CELL: [number, number] = [1, 1]
export const PLAYER_START_FLOOR = 0

// Stairs: [5,4] connects floor 0 <-> floor 1
export const STAIRS: { cell: [number, number]; fromFloor: number; toFloor: number }[] = [
  { cell: [5, 4], fromFloor: 0, toFloor: 1 },
  { cell: [5, 4], fromFloor: 1, toFloor: 0 },
]

export function stairsTarget(floor: number, col: number, row: number): number {
  for (const s of STAIRS) {
    if (s.fromFloor === floor && s.cell[0] === col && s.cell[1] === row) return s.toFloor
  }
  return -1
}

// Keys: 3 keys, one per area
export const KEY_CELLS: { cell: [number, number]; floor: number }[] = [
  { cell: [9, 1], floor: 1 },   // upstairs closet
  { cell: [9, 7], floor: 0 },   // ground study
  { cell: [2, 7], floor: 0 },   // ground dining
]

// Exit = front door (left edge of foyer, row 2)
export const EXIT_CELL: [number, number] = [0, 2]
export const EXIT_FLOOR = 0

// Monster spawn (upstairs spare room)
export const MONSTER_SPAWN_CELL: [number, number] = [5, 7]
export const MONSTER_SPAWN_FLOOR = 1

// Whisper zones
export const WHISPER_ZONES: { cell: [number, number]; floor: number; audio: string }[] = [
  { cell: [5, 1], floor: 0, audio: '/audio/whisper1.mp3' },
  { cell: [1, 5], floor: 0, audio: '/audio/whisper2.mp3' },
  { cell: [9, 5], floor: 0, audio: '/audio/whisper3.mp3' },
  { cell: [5, 7], floor: 1, audio: '/audio/whisper4.mp3' },
  { cell: [1, 1], floor: 1, audio: '/audio/whisper5.mp3' },
  { cell: [9, 1], floor: 1, audio: '/audio/whisper6.mp3' },
]

// Light cells per floor
export const LIGHT_CELLS: { cell: [number, number]; floor: number }[] = [
  { cell: [2, 2], floor: 0 }, { cell: [6, 2], floor: 0 }, { cell: [9, 2], floor: 0 },
  { cell: [5, 4], floor: 0 },
  { cell: [2, 6], floor: 0 }, { cell: [5, 6], floor: 0 }, { cell: [9, 6], floor: 0 },
  { cell: [2, 2], floor: 1 }, { cell: [6, 2], floor: 1 }, { cell: [9, 2], floor: 1 },
  { cell: [5, 4], floor: 1 },
  { cell: [2, 6], floor: 1 }, { cell: [5, 6], floor: 1 }, { cell: [9, 6], floor: 1 },
]

// ===== FURNITURE: cramped Granny-style, packed rooms =====
export interface FurnitureDef {
  cell: [number, number]
  floor: number
  type: string
  rot: number
}

export const FURNITURE: FurnitureDef[] = [
  // ===== GROUND: FOYER =====
  { cell: [1, 1], floor: 0, type: 'coatRack', rot: 0, room: 'foyer' },
  { cell: [2, 1], floor: 0, type: 'shoeRack', rot: 0, room: 'foyer' },
  { cell: [3, 3], floor: 0, type: 'consoleTable', rot: Math.PI, room: 'foyer' },

  // ===== GROUND: LIVING ROOM (cols 5-7, rows 1-3) =====
  { cell: [5, 1], floor: 0, type: 'sofa', rot: 0, room: 'living' },
  { cell: [7, 2], floor: 0, type: 'armchair', rot: -Math.PI / 2, room: 'living' },
  { cell: [6, 3], floor: 0, type: 'coffeeTable', rot: 0, room: 'living' },
  { cell: [5, 3], floor: 0, type: 'tvStand', rot: Math.PI, room: 'living' },

  // ===== GROUND: KITCHEN (cols 9, rows 1-3) =====
  { cell: [9, 1], floor: 0, type: 'fridge', rot: 0, room: 'kitchen' },
  { cell: [9, 2], floor: 0, type: 'stove', rot: 0, room: 'kitchen' },
  { cell: [9, 3], floor: 0, type: 'sink', rot: 0, room: 'kitchen' },

  // ===== GROUND: DINING (cols 1-3, rows 6-7) =====
  { cell: [2, 6], floor: 0, type: 'diningTable', rot: 0, room: 'dining' },
  { cell: [2, 5], floor: 0, type: 'chair', rot: Math.PI, room: 'dining' },
  { cell: [1, 6], floor: 0, type: 'chair', rot: Math.PI / 2, room: 'dining' },
  { cell: [3, 6], floor: 0, type: 'chair', rot: -Math.PI / 2, room: 'dining' },
  { cell: [2, 7], floor: 0, type: 'cabinet', rot: 0, room: 'dining' },

  // ===== GROUND: BATHROOM (col 5, rows 6-7) =====
  { cell: [5, 6], floor: 0, type: 'toilet', rot: 0, room: 'bath' },
  { cell: [5, 7], floor: 0, type: 'bathtub', rot: 0, room: 'bath' },

  // ===== GROUND: STUDY (col 9, rows 6-7) =====
  { cell: [9, 6], floor: 0, type: 'desk', rot: 0, room: 'study' },
  { cell: [9, 7], floor: 0, type: 'bookshelf', rot: 0, room: 'study' },

  // ===== UPPER: MASTER BEDROOM (cols 1-3, rows 1-3) =====
  { cell: [2, 2], floor: 1, type: 'bed', rot: 0, room: 'master' },
  { cell: [3, 1], floor: 1, type: 'wardrobe', rot: 0, room: 'master' },
  { cell: [3, 3], floor: 1, type: 'dresser', rot: Math.PI, room: 'master' },

  // ===== UPPER: KIDS ROOM (cols 5-7, rows 1-3) =====
  { cell: [6, 2], floor: 1, type: 'bed', rot: 0, room: 'kids' },
  { cell: [7, 1], floor: 1, type: 'toybox', rot: 0, room: 'kids' },
  { cell: [5, 3], floor: 1, type: 'desk', rot: 0, room: 'kids' },

  // ===== UPPER: CLOSET (col 9, rows 1-3) =====
  { cell: [9, 2], floor: 1, type: 'wardrobe', rot: 0, room: 'closet' },
  { cell: [9, 3], floor: 1, type: 'shelf', rot: 0, room: 'closet' },

  // ===== UPPER: BATHROOM (col 2, rows 6-7) =====
  { cell: [2, 6], floor: 1, type: 'toilet', rot: 0, room: 'bath2' },
  { cell: [2, 7], floor: 1, type: 'sink', rot: Math.PI, room: 'bath2' },

  // ===== UPPER: SPARE ROOM (col 5-6, rows 6-7) =====
  { cell: [5, 7], floor: 1, type: 'bed', rot: 0, room: 'spare' },
  { cell: [6, 6], floor: 1, type: 'wardrobe', rot: 0, room: 'spare' },

  // ===== UPPER: STORAGE (col 9, rows 6-7) =====
  { cell: [9, 6], floor: 1, type: 'crate', rot: 0, room: 'storage' },
  { cell: [9, 7], floor: 1, type: 'shelf', rot: 0, room: 'storage' },
]

// Wardrobes (hiding spots) — keep a few
export const WARDROBE_CELLS: { cell: [number, number]; floor: number; rot: number }[] = [
  { cell: [3, 1], floor: 1, rot: 0 },   // master bedroom
  { cell: [9, 2], floor: 1, rot: 0 },   // upstairs closet
  { cell: [6, 6], floor: 1, rot: 0 },   // spare room
  { cell: [2, 7], floor: 0, rot: 0 },   // dining cabinet
]

// Creaky floors
export const CREAKY_CELLS: { cell: [number, number]; floor: number }[] = [
  { cell: [5, 4], floor: 0 },   // stairs
  { cell: [3, 3], floor: 0 },   // foyer threshold
  { cell: [5, 4], floor: 1 },   // upstairs landing
  { cell: [3, 3], floor: 1 },
  { cell: [7, 3], floor: 0 },
  { cell: [7, 3], floor: 1 },
]

// Patrol waypoints (compact loop through the house)
export const PATROL_WAYPOINTS: { cell: [number, number]; floor: number }[] = [
  { cell: [2, 2], floor: 0 }, { cell: [6, 2], floor: 0 }, { cell: [9, 2], floor: 0 },
  { cell: [5, 4], floor: 0 },
  { cell: [2, 6], floor: 0 }, { cell: [5, 6], floor: 0 }, { cell: [9, 6], floor: 0 },
  { cell: [5, 4], floor: 1 },  // up stairs
  { cell: [2, 2], floor: 1 }, { cell: [6, 2], floor: 1 }, { cell: [9, 2], floor: 1 },
  { cell: [2, 6], floor: 1 }, { cell: [5, 6], floor: 1 }, { cell: [9, 6], floor: 1 },
  { cell: [5, 4], floor: 0 },  // back down
]

export function isCreakyAt(x: number, y: number, z: number): boolean {
  const floor = Math.round(y / FLOOR_HEIGHT)
  const col = Math.round(x / CELL_SIZE + MAZE_WIDTH / 2)
  const row = Math.round(z / CELL_SIZE + MAZE_DEPTH / 2)
  return CREAKY_CELLS.some(c => c.cell[0] === col && c.cell[1] === row && c.floor === floor)
}

export function nearestWardrobe(x: number, y: number, z: number, maxDist = 1.6): number {
  const floor = Math.round(y / FLOOR_HEIGHT)
  let best = -1, bestD = maxDist * maxDist
  WARDROBE_CELLS.forEach((w, i) => {
    if (w.floor !== floor) return
    const [wx, , wz] = cellToWorld(w.cell[0], w.cell[1], w.floor)
    const d = (wx - x) ** 2 + (wz - z) ** 2
    if (d < bestD) { bestD = d; best = i }
  })
  return best
}

const FURN_RADIUS: Record<string, number> = {
  bed: 0.85, sofa: 0.7, diningTable: 0.95, coffeeTable: 0.6, table: 0.6,
  shelf: 0.5, bookshelf: 0.5, wardrobe: 0.6, dresser: 0.5, cabinet: 0.5,
  chair: 0.3, armchair: 0.45, crate: 0.38, desk: 0.6, toilet: 0.38,
  bathtub: 0.7, sink: 0.42, stove: 0.48, fridge: 0.55, tvStand: 0.5,
  toybox: 0.42, consoleTable: 0.42, coatRack: 0.25, shoeRack: 0.35, rug: 0,
}

export function isFurnitureBlocked(x: number, y: number, z: number, radius: number): boolean {
  const floor = Math.round(y / FLOOR_HEIGHT)
  for (const f of FURNITURE) {
    if (f.floor !== floor) continue
    const r = (FURN_RADIUS[f.type] || 0.45) + radius
    if (r <= 0) continue
    const [fx, , fz] = cellToWorld(f.cell[0], f.cell[1], f.floor)
    const dx = x - fx, dz = z - fz
    if (dx * dx + dz * dz < r * r) return true
  }
  return false
}

export function isBlocked(x: number, y: number, z: number, radius: number): boolean {
  return isWallAt(x, y, z, radius) || isFurnitureBlocked(x, y, z, radius)
}

export function hasLineOfSight(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): boolean {
  if (Math.round(y1 / FLOOR_HEIGHT) !== Math.round(y2 / FLOOR_HEIGHT)) return false
  const dx = x2 - x1, dz = z2 - z1
  const dist = Math.hypot(dx, dz)
  const steps = Math.ceil(dist / 0.5)
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    if (isWallAt(x1 + dx * t, y1, z1 + dz * t, 0.2)) return false
  }
  return true
}
