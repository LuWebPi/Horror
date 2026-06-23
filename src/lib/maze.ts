// ===== HOUSE LAYOUT (Granny-style clone) =====
// Two-story house: ground floor + upper floor + basement.
// Each cell is CELL_SIZE units. Floor 0 = ground, Floor 1 = upper, Floor 2 = basement.
// Values: 1 = wall, 0 = open floor, 2 = exit door (front door)
// A real house layout with rooms: Foyer, Living Room, Kitchen, Dining,
// Bedroom, Bathroom, Closet, Hallway, Stairs, Basement.

export const CELL_SIZE = 4

// ----- GROUND FLOOR (floor 0) -----
// 17 wide x 13 deep
// Rooms:
//   Top-left (cols 1-5, rows 1-5):     FOYER (entrance hall) + front door (exit) at [1,6]
//   Top-mid (cols 6-10, rows 1-4):    LIVING ROOM
//   Top-right (cols 12-15, rows 1-5): DINING ROOM
//   Mid (cols 1-15, row 6):            HALLWAY (with stairs up at [8,6])
//   Bottom-left (cols 1-5, rows 7-11): KITCHEN
//   Bottom-mid (cols 6-10, rows 7-11): STUDY / OFFICE
//   Bottom-right (cols 12-15, rows 7-11): BATHROOM
export const HOUSE_GROUND: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],  // 0  outer wall
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 1  foyer | living | dining
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 2
  [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],  // 3  (opening to living)
  [1,0,0,0,0,0,1,0,0,0,0,1,1,0,1,0,1],  // 4
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 5
  [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],  // 6  HALLWAY (front door at left edge = exit)
  [1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,1],  // 7  doorways into kitchen/study/bath
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 8  kitchen | study | bathroom
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 9
  [1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,1],  // 10 (opening study->bath)
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 11
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],  // 12 outer wall
]

// ----- UPPER FLOOR (floor 1) -----
// Same outer footprint, interior = BEDROOM + BATHROOM + CLOSET + HALLWAY.
// Stairs down at [8,6].
export const HOUSE_UPPER: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],  // 0
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 1  master bedroom | kids room | closet
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 2
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 3
  [1,0,0,0,0,0,1,0,0,0,0,1,1,1,1,0,1],  // 4
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 5
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],  // 6  HALLWAY (stairs down at center)
  [1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,1],  // 7  doorways
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 8  bathroom | storage | spare bedroom
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 9
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 10
  [1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],  // 11
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],  // 12
]

// ----- BASEMENT (floor 2) -----
// Smaller, darker. Tools, washer/dryer, boiler. One key hidden here.
export const HOUSE_BASEMENT: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,1,0,1,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,0,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,1],
  [1,1,0,1,1,0,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1],
]

// Stacked layout: floor 0 first, then floor 1, then floor 2.
export const FLOOR_HEIGHT = 4.2
export const FLOORS = [HOUSE_GROUND, HOUSE_UPPER, HOUSE_BASEMENT]
export const MAZE_WIDTH = HOUSE_GROUND[0].length
export const MAZE_DEPTH = HOUSE_GROUND.length

// Cell value lookup for any floor
export function cellAt(floor: number, col: number, row: number): number {
  const m = FLOORS[floor]
  if (!m || row < 0 || row >= m.length || col < 0 || col >= m[0].length) return 1
  return m[row][col]
}

// Convert grid coords to world coords (center of cell). Y depends on floor.
export function cellToWorld(col: number, row: number, floor = 0): [number, number, number] {
  const x = (col - MAZE_WIDTH / 2) * CELL_SIZE
  const z = (row - MAZE_DEPTH / 2) * CELL_SIZE
  const y = floor * FLOOR_HEIGHT
  return [x, y, z]
}

// Convert world coords to grid coords (col, row, floor)
export function worldToCell(x: number, y: number, z: number): [number, number, number] {
  const col = Math.round(x / CELL_SIZE + MAZE_WIDTH / 2)
  const row = Math.round(z / CELL_SIZE + MAZE_DEPTH / 2)
  const floor = Math.round(y / FLOOR_HEIGHT)
  return [col, row, floor]
}

// Check if a world position collides with a wall (with player radius) on the player's current floor
export function isWallAt(x: number, y: number, z: number, radius = 0.6): boolean {
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

// Player start position (ground floor foyer)
export const PLAYER_START_CELL: [number, number] = [1, 1]
export const PLAYER_START_FLOOR = 0

// Stairs cells: walk here to move between floors.
// Ground [8,6] <-> Upper [8,6]  ;  Ground [2,6] <-> Basement [?,?]
export const STAIRS: { cell: [number, number]; fromFloor: number; toFloor: number }[] = [
  { cell: [8, 6], fromFloor: 0, toFloor: 1 }, // ground -> upper
  { cell: [8, 6], fromFloor: 1, toFloor: 0 }, // upper -> ground
  { cell: [1, 6], fromFloor: 0, toFloor: 2 }, // ground -> basement (trapdoor in foyer)
  { cell: [1, 6], fromFloor: 2, toFloor: 0 }, // basement -> ground
]

// Is the player on a stairs cell? Returns target floor or -1.
export function stairsTarget(floor: number, col: number, row: number): number {
  for (const s of STAIRS) {
    if (s.fromFloor === floor && s.cell[0] === col && s.cell[1] === row) {
      return s.toFloor
    }
  }
  return -1
}

// Key positions scattered across all floors (cell, floor)
export const KEY_CELLS: { cell: [number, number]; floor: number }[] = [
  { cell: [14, 1], floor: 1 },  // upstairs kids room
  { cell: [3, 11], floor: 0 },  // kitchen
  { cell: [9, 5], floor: 2 },   // basement
]

// Exit door cell (front door of the house) on ground floor
export const EXIT_CELL: [number, number] = [0, 6]
export const EXIT_FLOOR = 0

// Monster spawn (basement, far from player)
export const MONSTER_SPAWN_CELL: [number, number] = [6, 4]
export const MONSTER_SPAWN_FLOOR = 2

// Whisper trigger positions
export const WHISPER_ZONES: { cell: [number, number]; floor: number; audio: string }[] = [
  { cell: [7, 1], floor: 0, audio: '/audio/whisper1.mp3' },
  { cell: [1, 5], floor: 0, audio: '/audio/whisper2.mp3' },
  { cell: [15, 5], floor: 1, audio: '/audio/whisper3.mp3' },
  { cell: [9, 11], floor: 0, audio: '/audio/whisper4.mp3' },
  { cell: [3, 9], floor: 1, audio: '/audio/whisper5.mp3' },
  { cell: [9, 5], floor: 2, audio: '/audio/whisper6.mp3' },
]

// Light positions per floor (cells with ceiling lights)
export const LIGHT_CELLS: { cell: [number, number]; floor: number }[] = [
  // ground
  { cell: [3, 2], floor: 0 }, { cell: [8, 2], floor: 0 }, { cell: [14, 2], floor: 0 },
  { cell: [3, 9], floor: 0 }, { cell: [8, 9], floor: 0 }, { cell: [14, 9], floor: 0 },
  { cell: [8, 6], floor: 0 },
  // upper
  { cell: [3, 2], floor: 1 }, { cell: [8, 2], floor: 1 }, { cell: [14, 2], floor: 1 },
  { cell: [3, 9], floor: 1 }, { cell: [8, 9], floor: 1 }, { cell: [14, 9], floor: 1 },
  // basement (fewer, dimmer)
  { cell: [6, 1], floor: 2 }, { cell: [3, 5], floor: 2 }, { cell: [9, 7], floor: 2 },
]

// ===== Furniture: a real house worth =====
export interface FurnitureDef {
  cell: [number, number]
  floor: number
  type: string
  rot: number
  room: string
}

export const FURNITURE: FurnitureDef[] = [
  // ===== GROUND FLOOR — FOYER =====
  { cell: [2, 1], floor: 0, type: 'coatRack', rot: Math.PI, room: 'foyer' },
  { cell: [4, 1], floor: 0, type: 'shoeRack', rot: 0, room: 'foyer' },
  { cell: [3, 5], floor: 0, type: 'consoleTable', rot: 0, room: 'foyer' },

  // ===== GROUND FLOOR — LIVING ROOM =====
  { cell: [7, 2], floor: 0, type: 'sofa', rot: Math.PI / 2, room: 'living' },
  { cell: [9, 2], floor: 0, type: 'sofa', rot: Math.PI / 2, room: 'living' },
  { cell: [8, 4], floor: 0, type: 'coffeeTable', rot: 0, room: 'living' },
  { cell: [6, 1], floor: 0, type: 'tvStand', rot: 0, room: 'living' },
  { cell: [10, 1], floor: 0, type: 'armchair', rot: -Math.PI / 2, room: 'living' },
  { cell: [8, 1], floor: 0, type: 'rug', rot: 0, room: 'living' },

  // ===== GROUND FLOOR — DINING ROOM =====
  { cell: [13, 2], floor: 0, type: 'diningTable', rot: 0, room: 'dining' },
  { cell: [13, 1], floor: 0, type: 'chair', rot: Math.PI, room: 'dining' },
  { cell: [13, 3], floor: 0, type: 'chair', rot: 0, room: 'dining' },
  { cell: [15, 2], floor: 0, type: 'chair', rot: -Math.PI / 2, room: 'dining' },
  { cell: [15, 1], floor: 0, type: 'cabinet', rot: 0, room: 'dining' },

  // ===== GROUND FLOOR — KITCHEN =====
  { cell: [1, 7], floor: 0, type: 'fridge', rot: 0, room: 'kitchen' },
  { cell: [3, 7], floor: 0, type: 'stove', rot: 0, room: 'kitchen' },
  { cell: [5, 7], floor: 0, type: 'sink', rot: 0, room: 'kitchen' },
  { cell: [2, 9], floor: 0, type: 'kitchenIsland', rot: 0, room: 'kitchen' },
  { cell: [4, 11], floor: 0, type: 'cabinet', rot: Math.PI, room: 'kitchen' },
  { cell: [1, 11], floor: 0, type: 'chair', rot: 0, room: 'kitchen' },
  { cell: [3, 11], floor: 0, type: 'chair', rot: 0, room: 'kitchen' },

  // ===== GROUND FLOOR — STUDY =====
  { cell: [7, 8], floor: 0, type: 'desk', rot: 0, room: 'study' },
  { cell: [7, 9], floor: 0, type: 'chair', rot: 0, room: 'study' },
  { cell: [9, 8], floor: 0, type: 'bookshelf', rot: 0, room: 'study' },
  { cell: [9, 10], floor: 0, type: 'bookshelf', rot: 0, room: 'study' },

  // ===== GROUND FLOOR — BATHROOM =====
  { cell: [13, 8], floor: 0, type: 'toilet', rot: 0, room: 'bathroom' },
  { cell: [15, 8], floor: 0, type: 'sink', rot: 0, room: 'bathroom' },
  { cell: [14, 10], floor: 0, type: 'bathtub', rot: 0, room: 'bathroom' },

  // ===== UPPER FLOOR — MASTER BEDROOM =====
  { cell: [2, 2], floor: 1, type: 'bed', rot: 0, room: 'master' },
  { cell: [5, 1], floor: 1, type: 'wardrobe', rot: 0, room: 'master' },
  { cell: [5, 5], floor: 1, type: 'dresser', rot: Math.PI, room: 'master' },
  { cell: [1, 5], floor: 1, type: 'armchair', rot: 0, room: 'master' },

  // ===== UPPER FLOOR — KIDS ROOM =====
  { cell: [8, 2], floor: 1, type: 'bed', rot: 0, room: 'kids' },
  { cell: [10, 1], floor: 1, type: 'toybox', rot: 0, room: 'kids' },
  { cell: [10, 5], floor: 1, type: 'desk', rot: 0, room: 'kids' },

  // ===== UPPER FLOOR — CLOSET =====
  { cell: [13, 2], floor: 1, type: 'wardrobe', rot: 0, room: 'closet' },
  { cell: [15, 2], floor: 1, type: 'dresser', rot: 0, room: 'closet' },
  { cell: [14, 4], floor: 1, type: 'shelf', rot: 0, room: 'closet' },

  // ===== UPPER FLOOR — BATHROOM =====
  { cell: [2, 9], floor: 1, type: 'toilet', rot: 0, room: 'bath2' },
  { cell: [4, 9], floor: 1, type: 'bathtub', rot: 0, room: 'bath2' },
  { cell: [5, 11], floor: 1, type: 'sink', rot: Math.PI, room: 'bath2' },

  // ===== UPPER FLOOR — STORAGE =====
  { cell: [8, 9], floor: 1, type: 'crate', rot: 0, room: 'storage' },
  { cell: [9, 9], floor: 1, type: 'crate', rot: 0.3, room: 'storage' },
  { cell: [10, 9], floor: 1, type: 'shelf', rot: 0, room: 'storage' },

  // ===== UPPER FLOOR — SPARE BEDROOM =====
  { cell: [13, 9], floor: 1, type: 'bed', rot: 0, room: 'spare' },
  { cell: [15, 11], floor: 1, type: 'wardrobe', rot: 0, room: 'spare' },
  { cell: [13, 11], floor: 1, type: 'desk', rot: 0, room: 'spare' },

  // ===== BASEMENT =====
  { cell: [2, 1], floor: 2, type: 'washingMachine', rot: 0, room: 'basement' },
  { cell: [4, 1], floor: 2, type: 'boiler', rot: 0, room: 'basement' },
  { cell: [9, 1], floor: 2, type: 'shelf', rot: 0, room: 'basement' },
  { cell: [10, 1], floor: 2, type: 'crate', rot: 0, room: 'basement' },
  { cell: [10, 7], floor: 2, type: 'crate', rot: 0.2, room: 'basement' },
  { cell: [11, 5], floor: 2, type: 'workbench', rot: 0, room: 'basement' },
  { cell: [3, 7], floor: 2, type: 'crate', rot: 0, room: 'basement' },
]

// Wardrobes / closets — interactive hiding spots
export const WARDROBE_CELLS: { cell: [number, number]; floor: number; rot: number }[] = [
  { cell: [5, 1], floor: 1, rot: 0 },       // master bedroom
  { cell: [13, 2], floor: 1, rot: 0 },      // upstairs closet
  { cell: [15, 11], floor: 1, rot: 0 },     // spare bedroom
  { cell: [4, 11], floor: 0, rot: Math.PI },// kitchen cabinet (small)
  { cell: [15, 1], floor: 0, rot: 0 },      // dining cabinet
  { cell: [9, 8], floor: 0, rot: 0 },       // study bookshelf gap
  { cell: [10, 1], floor: 2, rot: 0 },      // basement
]

// Creaky floorboard cells — per floor
export const CREAKY_CELLS: { cell: [number, number]; floor: number }[] = [
  { cell: [8, 6], floor: 0 },   // top of stairs
  { cell: [3, 6], floor: 0 },   // hallway
  { cell: [13, 6], floor: 0 },  // hallway
  { cell: [8, 6], floor: 1 },   // upstairs landing
  { cell: [3, 6], floor: 1 },
  { cell: [13, 6], floor: 1 },
  { cell: [6, 3], floor: 2 },   // basement creaky
  { cell: [9, 5], floor: 2 },
]

// Patrol waypoints for Granny (ground floor + upper + basement)
export const PATROL_WAYPOINTS: { cell: [number, number]; floor: number }[] = [
  { cell: [3, 2], floor: 0 },   // foyer
  { cell: [8, 2], floor: 0 },   // living
  { cell: [13, 2], floor: 0 },  // dining
  { cell: [8, 6], floor: 0 },   // hallway/stairs
  { cell: [3, 9], floor: 0 },   // kitchen
  { cell: [8, 9], floor: 0 },   // study
  { cell: [13, 9], floor: 0 },  // bathroom
  { cell: [8, 6], floor: 1 },   // upstairs landing
  { cell: [3, 2], floor: 1 },   // master bedroom
  { cell: [8, 2], floor: 1 },   // kids room
  { cell: [13, 9], floor: 1 },  // spare bedroom
  { cell: [8, 6], floor: 0 },   // back down
  { cell: [1, 6], floor: 0 },   // basement trapdoor
  { cell: [6, 4], floor: 2 },   // basement
  { cell: [9, 7], floor: 2 },   // basement
]

export function isCreakyAt(x: number, y: number, z: number): boolean {
  const floor = Math.round(y / FLOOR_HEIGHT)
  const [col, row] = [Math.round(x / CELL_SIZE + MAZE_WIDTH / 2), Math.round(z / CELL_SIZE + MAZE_DEPTH / 2)]
  return CREAKY_CELLS.some(c => c.cell[0] === col && c.cell[1] === row && c.floor === floor)
}

export function nearestWardrobe(x: number, y: number, z: number, maxDist = 1.8): number {
  const floor = Math.round(y / FLOOR_HEIGHT)
  let best = -1
  let bestD = maxDist * maxDist
  WARDROBE_CELLS.forEach((w, i) => {
    if (w.floor !== floor) return
    const [wx, , wz] = cellToWorld(w.cell[0], w.cell[1], w.floor)
    const d = (wx - x) ** 2 + (wz - z) ** 2
    if (d < bestD) { bestD = d; best = i }
  })
  return best
}

// Furniture collision radii per type
const FURN_RADIUS: Record<string, number> = {
  bed: 1.0, sofa: 0.8, diningTable: 1.1, coffeeTable: 0.7, kitchenIsland: 0.8,
  table: 0.7, shelf: 0.6, bookshelf: 0.6, wardrobe: 0.7, dresser: 0.6, cabinet: 0.6,
  chair: 0.35, armchair: 0.55, crate: 0.45, desk: 0.7, toilet: 0.45, bathtub: 0.8,
  sink: 0.5, stove: 0.55, fridge: 0.65, washingMachine: 0.6, boiler: 0.55,
  workbench: 0.7, tvStand: 0.6, toybox: 0.5, consoleTable: 0.5, coatRack: 0.3,
  shoeRack: 0.4, rug: 0, // rug is flat, no collision
}

export function isFurnitureBlocked(x: number, y: number, z: number, radius: number): boolean {
  const floor = Math.round(y / FLOOR_HEIGHT)
  for (const f of FURNITURE) {
    if (f.floor !== floor) continue
    const r = (FURN_RADIUS[f.type] || 0.5) + radius
    if (r <= 0) continue
    const [fx, , fz] = cellToWorld(f.cell[0], f.cell[1], f.floor)
    const dx = x - fx
    const dz = z - fz
    if (dx * dx + dz * dz < r * r) return true
  }
  return false
}

export function isBlocked(x: number, y: number, z: number, radius: number): boolean {
  return isWallAt(x, y, z, radius) || isFurnitureBlocked(x, y, z, radius)
}

// Line-of-sight check on the same floor
export function hasLineOfSight(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): boolean {
  // only same floor
  if (Math.round(y1 / FLOOR_HEIGHT) !== Math.round(y2 / FLOOR_HEIGHT)) return false
  const dx = x2 - x1
  const dz = z2 - z1
  const dist = Math.hypot(dx, dz)
  const steps = Math.ceil(dist / 0.5)
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const sx = x1 + dx * t
    const sz = z1 + dz * t
    if (isWallAt(sx, y1, sz, 0.2)) return false
  }
  return true
}
