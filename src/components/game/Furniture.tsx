'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { FURNITURE, CREAKY_CELLS, cellToWorld } from '@/lib/maze'

export function Furniture() {
  const items = useMemo(
    () => FURNITURE.map((f) => {
      const [x, y, z] = cellToWorld(f.cell[0], f.cell[1], f.floor)
      return { ...f, x, y, z }
    }),
    []
  )

  return (
    <group>
      {items.map((f, i) => (
        // scale 0.8 to fit the smaller CELL_SIZE (3.2) — keeps the cramped feel
        <group key={i} position={[f.x, f.y, f.z]} rotation={[0, f.rot, 0]} scale={[0.8, 0.8, 0.8]}>
          {renderPiece(f.type)}
        </group>
      ))}
    </group>
  )
}

function M({ children, color = '#5a4a3a', rough = 0.8, metal = 0 }: {
  children: React.ReactNode; color?: string; rough?: number; metal?: number
}) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
}

function renderPiece(type: string) {
  switch (type) {
    // ===== BEDS =====
    case 'bed': return (
      <group>
        <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[1.8, 0.5, 2.6]} /><M color="#2a1a14" /></mesh>
        <mesh position={[0, 0.65, 0]} castShadow><boxGeometry args={[1.6, 0.25, 2.4]} /><M color="#5a4a4a" rough={1} /></mesh>
        <mesh position={[0, 0.8, -0.9]} castShadow><boxGeometry args={[1.3, 0.15, 0.5]} /><M color="#6a5a5a" rough={1} /></mesh>
        <mesh position={[0, 0.9, -1.35]} castShadow><boxGeometry args={[1.8, 1.0, 0.12]} /><M color="#1a1010" /></mesh>
      </group>
    )
    // ===== SOFAS =====
    case 'sofa': return (
      <group>
        <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[2.0, 0.4, 0.9]} /><M color="#3a2828" rough={1} /></mesh>
        <mesh position={[0, 0.75, -0.4]} castShadow><boxGeometry args={[2.0, 0.7, 0.2]} /><M color="#332020" rough={1} /></mesh>
        <mesh position={[-1.0, 0.6, 0]} castShadow><boxGeometry args={[0.2, 0.6, 0.9]} /><M color="#2e1c1c" rough={1} /></mesh>
        <mesh position={[1.0, 0.6, 0]} castShadow><boxGeometry args={[0.2, 0.6, 0.9]} /><M color="#2e1c1c" rough={1} /></mesh>
      </group>
    )
    case 'armchair': return (
      <group>
        <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[0.9, 0.4, 0.9]} /><M color="#3a2828" rough={1} /></mesh>
        <mesh position={[0, 0.65, -0.35]} castShadow><boxGeometry args={[0.9, 0.6, 0.18]} /><M color="#332020" rough={1} /></mesh>
        <mesh position={[-0.42, 0.55, 0]} castShadow><boxGeometry args={[0.16, 0.5, 0.9]} /><M color="#2e1c1c" rough={1} /></mesh>
        <mesh position={[0.42, 0.55, 0]} castShadow><boxGeometry args={[0.16, 0.5, 0.9]} /><M color="#2e1c1c" rough={1} /></mesh>
      </group>
    )
    // ===== TABLES =====
    case 'diningTable': return (
      <group>
        <mesh position={[0, 0.74, 0]} castShadow><boxGeometry args={[2.2, 0.1, 1.1]} /><M color="#3a2a14" /></mesh>
        {[[-1.0, -0.45], [1.0, -0.45], [-1.0, 0.45], [1.0, 0.45]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.37, lz]} castShadow><boxGeometry args={[0.12, 0.74, 0.12]} /><M color="#2a1a08" /></mesh>
        ))}
      </group>
    )
    case 'coffeeTable': return (
      <group>
        <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[1.4, 0.08, 0.7]} /><M color="#2a1a0a" /></mesh>
        {[[-0.6, -0.28], [0.6, -0.28], [-0.6, 0.28], [0.6, 0.28]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.2, lz]}><boxGeometry args={[0.07, 0.4, 0.07]} /><M color="#1a0a00" /></mesh>
        ))}
      </group>
    )
    case 'kitchenIsland': return (
      <group>
        <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.6, 1.0, 0.8]} /><M color="#2a2018" /></mesh>
        <mesh position={[0, 1.05, 0]} castShadow><boxGeometry args={[1.7, 0.1, 0.9]} /><M color="#1a1810" /></mesh>
      </group>
    )
    case 'desk': return (
      <group>
        <mesh position={[0, 0.74, 0]} castShadow><boxGeometry args={[1.4, 0.08, 0.7]} /><M color="#3a2410" /></mesh>
        {[[-0.6, -0.28], [0.6, -0.28], [-0.6, 0.28], [0.6, 0.28]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.37, lz]}><boxGeometry args={[0.08, 0.74, 0.08]} /><M color="#2a1808" /></mesh>
        ))}
        <mesh position={[0, 0.45, -0.25]} castShadow><boxGeometry args={[1.3, 0.5, 0.05]} /><M color="#2a1808" /></mesh>
      </group>
    )
    case 'consoleTable': return (
      <group>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.2, 0.08, 0.35]} /><M color="#2a1808" /></mesh>
        {[[-0.5, -0.12], [0.5, -0.12], [-0.5, 0.12], [0.5, 0.12]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.4, lz]}><boxGeometry args={[0.06, 0.8, 0.06]} /><M color="#1a0a00" /></mesh>
        ))}
      </group>
    )
    // ===== STORAGE =====
    case 'shelf': return (
      <group>
        <mesh position={[0, 1.2, 0]} castShadow><boxGeometry args={[1.8, 2.4, 0.4]} /><M color="#241818" /></mesh>
        {[0.4, 1.0, 1.6, 2.0].map((y, i) => (
          <mesh key={i} position={[0, y, 0.05]}><boxGeometry args={[1.7, 0.04, 0.35]} /><M color="#3a2828" /></mesh>
        ))}
        {[[-0.5, 0.6], [0.2, 0.6], [0.5, 1.2], [-0.3, 1.2], [0.3, 1.8]].map(([bx, by], i) => (
          <mesh key={i} position={[bx, by, 0.1]}><boxGeometry args={[0.12, 0.3, 0.18]} /><M color={['#5a2020', '#20403a', '#3a3a20', '#402040', '#203a4a'][i % 5]} /></mesh>
        ))}
      </group>
    )
    case 'bookshelf': return (
      <group>
        <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[1.8, 2.0, 0.4]} /><M color="#2a1810" /></mesh>
        {[0.3, 0.8, 1.3, 1.7].map((y, i) => (
          <mesh key={i} position={[0, y, 0.05]}><boxGeometry args={[1.7, 0.04, 0.35]} /><M color="#3a2418" /></mesh>
        ))}
        {/* rows of "books" */}
        {[0.3, 0.8, 1.3, 1.7].flatMap((y, row) =>
          Array.from({ length: 8 }).map((_, i) => (
            <mesh key={`${row}-${i}`} position={[-0.7 + i * 0.2, y + 0.15, 0.1]}>
              <boxGeometry args={[0.1, 0.25, 0.15]} />
              <M color={['#5a2020', '#20403a', '#3a3a20', '#402040', '#203a4a'][i % 5]} />
            </mesh>
          ))
        )}
      </group>
    )
    case 'wardrobe': return (
      <group>
        <mesh position={[0, 1.1, 0]} castShadow><boxGeometry args={[1.2, 2.2, 0.7]} /><M color="#2a1810" /></mesh>
        <mesh position={[-0.3, 1.1, 0.37]}><boxGeometry args={[0.56, 2.0, 0.06]} /><M color="#33200f" /></mesh>
        <mesh position={[0.3, 1.1, 0.37]}><boxGeometry args={[0.56, 2.0, 0.06]} /><M color="#33200f" /></mesh>
        <mesh position={[-0.05, 1.1, 0.41]}><sphereGeometry args={[0.04, 8, 8]} /><M color="#1a1a1a" metal={0.6} rough={0.4} /></mesh>
        <mesh position={[0.05, 1.1, 0.41]}><sphereGeometry args={[0.04, 8, 8]} /><M color="#1a1a1a" metal={0.6} rough={0.4} /></mesh>
        <mesh position={[0, 2.3, 0]}><boxGeometry args={[1.3, 0.15, 0.8]} /><M color="#1f1208" /></mesh>
      </group>
    )
    case 'dresser': return (
      <group>
        <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[1.3, 1.2, 0.5]} /><M color="#2a1810" /></mesh>
        {[0.3, 0.65, 1.0].map((y, i) => (
          <mesh key={i} position={[0, y, 0.27]}><boxGeometry args={[1.2, 0.3, 0.04]} /><M color="#1a0e08" /></mesh>
        ))}
        {[0.3, 0.65, 1.0].map((y, i) => (
          <mesh key={i} position={[0, y, 0.3]}><sphereGeometry args={[0.04, 8, 8]} /><M color="#2a2a2a" metal={0.6} /></mesh>
        ))}
      </group>
    )
    case 'cabinet': return (
      <group>
        <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[1.2, 2.0, 0.5]} /><M color="#2a1810" /></mesh>
        <mesh position={[0, 1.0, 0.27]}><boxGeometry args={[1.1, 1.9, 0.05]} /><M color="#33200f" /></mesh>
        <mesh position={[0, 1.0, 0.31]}><sphereGeometry args={[0.05, 8, 8]} /><M color="#2a2a2a" metal={0.6} /></mesh>
      </group>
    )
    case 'toybox': return (
      <group>
        <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[1.0, 0.6, 0.7]} /><M color="#3a2820" /></mesh>
        <mesh position={[0, 0.62, 0]}><boxGeometry args={[1.0, 0.06, 0.7]} /><M color="#2a1810" /></mesh>
      </group>
    )
    case 'tvStand': return (
      <group>
        <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[1.6, 0.8, 0.4]} /><M color="#1a1814" /></mesh>
        {/* TV */}
        <mesh position={[0, 1.4, 0]} castShadow><boxGeometry args={[1.4, 0.85, 0.08]} /><M color="#050505" /></mesh>
        <mesh position={[0, 1.4, 0.05]}><boxGeometry args={[1.25, 0.7, 0.01]} /><M color="#0a0a1a" /></mesh>
      </group>
    )
    // ===== CHAIRS =====
    case 'chair': return (
      <group>
        <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.5, 0.08, 0.5]} /><M color="#2a1a0a" /></mesh>
        {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.22, lz]}><boxGeometry args={[0.06, 0.45, 0.06]} /><M color="#1a0a00" /></mesh>
        ))}
        <mesh position={[0, 0.7, -0.22]} castShadow><boxGeometry args={[0.5, 0.6, 0.06]} /><M color="#2a1a0a" /></mesh>
      </group>
    )
    // ===== KITCHEN =====
    case 'fridge': return (
      <group>
        <mesh position={[0, 1.0, 0]} castShadow><boxGeometry args={[0.9, 2.0, 0.7]} /><M color="#888888" metal={0.5} rough={0.4} /></mesh>
        <mesh position={[0, 1.5, 0.36]}><boxGeometry args={[0.8, 0.02, 0.02]} /><M color="#444" /></mesh>
        <mesh position={[0, 0.5, 0.36]}><boxGeometry args={[0.8, 0.02, 0.02]} /><M color="#444" /></mesh>
        <mesh position={[0.36, 1.2, 0.37]}><boxGeometry args={[0.04, 0.4, 0.04]} /><M color="#333" metal={0.7} /></mesh>
      </group>
    )
    case 'stove': return (
      <group>
        <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[0.9, 1.0, 0.7]} /><M color="#444" metal={0.5} /></mesh>
        <mesh position={[0, 1.01, 0]}><boxGeometry args={[0.85, 0.04, 0.65]} /><M color="#222" /></mesh>
        {[[-0.2, -0.15], [0.2, -0.15], [-0.2, 0.15], [0.2, 0.15]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 1.04, lz]}><cylinderGeometry args={[0.1, 0.1, 0.02, 16]} /><M color="#111" /></mesh>
        ))}
      </group>
    )
    case 'sink': return (
      <group>
        <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[0.9, 0.1, 0.6]} /><M color="#2a2a2a" /></mesh>
        <mesh position={[0, 0.65, 0]}><boxGeometry args={[0.7, 0.1, 0.4]} /><M color="#0a0a0a" /></mesh>
        <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[0.85, 0.7, 0.55]} /><M color="#1a1a1a" /></mesh>
        <mesh position={[0, 0.85, -0.2]}><cylinderGeometry args={[0.03, 0.03, 0.2, 8]} /><M color="#aaa" metal={0.8} /></mesh>
      </group>
    )
    // ===== BATHROOM =====
    case 'toilet': return (
      <group>
        <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.25, 0.3, 0.5, 16]} /><M color="#e8e8e8" rough={0.3} /></mesh>
        <mesh position={[0, 0.6, -0.25]} castShadow><boxGeometry args={[0.4, 0.5, 0.15]} /><M color="#e8e8e8" rough={0.3} /></mesh>
      </group>
    )
    case 'bathtub': return (
      <group>
        <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[0.9, 0.6, 2.2]} /><M color="#e0e0e0" rough={0.3} /></mesh>
        <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.7, 0.3, 2.0]} /><M color="#1a2a3a" /></mesh>
      </group>
    )
    // ===== BASEMENT =====
    case 'washingMachine': return (
      <group>
        <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[0.8, 1.2, 0.6]} /><M color="#ccc" metal={0.4} /></mesh>
        <mesh position={[0, 0.7, 0.31]}><cylinderGeometry args={[0.25, 0.25, 0.04, 24]} /><M color="#333" /></mesh>
        <mesh position={[0, 0.2, 0.31]}><boxGeometry args={[0.3, 0.1, 0.02]} /><M color="#888" /></mesh>
      </group>
    )
    case 'boiler': return (
      <group>
        <mesh position={[0, 1.0, 0]} castShadow><cylinderGeometry args={[0.4, 0.4, 1.8, 16]} /><M color="#888" metal={0.5} /></mesh>
        <mesh position={[0, 1.9, 0]}><cylinderGeometry args={[0.42, 0.42, 0.1, 16]} /><M color="#666" /></mesh>
        <mesh position={[0.4, 1.0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.4, 8]} /><M color="#555" metal={0.7} /></mesh>
      </group>
    )
    case 'workbench': return (
      <group>
        <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[1.8, 0.1, 0.6]} /><M color="#3a2410" /></mesh>
        {[[-0.8, -0.22], [0.8, -0.22], [-0.8, 0.22], [0.8, 0.22]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.4, lz]}><boxGeometry args={[0.08, 0.8, 0.08]} /><M color="#2a1808" /></mesh>
        ))}
        <mesh position={[0.6, 0.85, 0.2]}><boxGeometry args={[0.2, 0.1, 0.2]} /><M color="#aa3322" metal={0.6} /></mesh>
      </group>
    )
    case 'crate': return (
      <mesh position={[0, 0.4, 0]} castShadow rotation={[0, 0.3, 0]}><boxGeometry args={[0.8, 0.8, 0.8]} /><M color="#3a2a14" /></mesh>
    )
    // ===== ENTRYWAY =====
    case 'coatRack': return (
      <group>
        <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, 2.4, 8]} /><M color="#2a1810" /></mesh>
        <mesh position={[0, 2.4, 0]}><cylinderGeometry args={[0.3, 0.05, 0.1, 8]} /><M color="#2a1810" /></mesh>
        {[0, 1, 2, 3, 4].map(i => (
          <mesh key={i} position={[Math.cos(i * 1.2) * 0.25, 2.3, Math.sin(i * 1.2) * 0.25]} rotation={[0, -i * 1.2, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.15, 6]} /><M color="#2a1810" />
          </mesh>
        ))}
        {/* a hanging coat */}
        <mesh position={[0, 1.5, 0]} castShadow><boxGeometry args={[0.5, 1.0, 0.2]} /><M color="#1a1a2a" rough={1} /></mesh>
      </group>
    )
    case 'shoeRack': return (
      <group>
        <mesh position={[0, 0.15, 0]} castShadow><boxGeometry args={[1.2, 0.3, 0.4]} /><M color="#2a1810" /></mesh>
        <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[1.2, 0.04, 0.4]} /><M color="#3a2418" /></mesh>
        {[[-0.4, 0.5], [0.1, 0.5], [0.5, 0.5], [-0.3, 0.4], [0.3, 0.4]].map(([lx, sc], i) => (
          <mesh key={i} position={[lx, 0.55, 0]} scale={[sc, 0.6, 1]}><boxGeometry args={[0.2, 0.1, 0.3]} /><M color="#1a1a1a" /></mesh>
        ))}
      </group>
    )
    // ===== DECOR =====
    case 'rug': return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[3.0, 2.2]} />
        <meshStandardMaterial color="#5a2828" roughness={1} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
    )
    default: return null
  }
}

// Creaky floorboard visual markers
export function CreakyFloors() {
  const cells = useMemo(() => CREAKY_CELLS.map((c) => ({ ...c, pos: cellToWorld(c.cell[0], c.cell[1], c.floor) })), [])
  return (
    <group>
      {cells.map((c, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[c.pos[0], c.pos[1] + 0.03, c.pos[2]]}>
          <planeGeometry args={[2.8, 2.8]} />
          <meshStandardMaterial color="#1a0e08" roughness={1} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}
