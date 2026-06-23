'use client'

import { useMemo } from 'react'
import { WARDROBE_CELLS, cellToWorld } from '@/lib/maze'

// Tall wooden wardrobes — interactive hiding spots (hide logic is in Player.tsx).
export function Wardrobes() {
  const items = useMemo(
    () =>
      WARDROBE_CELLS.map((w) => {
        const [x, , z] = cellToWorld(w.cell[0], w.cell[1])
        return { ...w, x, z }
      }),
    []
  )

  return (
    <group>
      {items.map((w, i) => (
        <group key={i} position={[w.x, 0, w.z]} rotation={[0, w.rot, 0]}>
          {/* wardrobe body */}
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[1.2, 2.2, 0.7]} />
            <meshStandardMaterial color="#2a1810" roughness={0.85} />
          </mesh>
          {/* left door */}
          <mesh position={[-0.3, 1.1, 0.37]}>
            <boxGeometry args={[0.56, 2.0, 0.06]} />
            <meshStandardMaterial color="#33200f" roughness={0.85} />
          </mesh>
          {/* right door */}
          <mesh position={[0.3, 1.1, 0.37]}>
            <boxGeometry args={[0.56, 2.0, 0.06]} />
            <meshStandardMaterial color="#33200f" roughness={0.85} />
          </mesh>
          {/* door handles */}
          <mesh position={[-0.05, 1.1, 0.41]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0.05, 1.1, 0.41]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* top cornice */}
          <mesh position={[0, 2.3, 0]}>
            <boxGeometry args={[1.3, 0.15, 0.8]} />
            <meshStandardMaterial color="#1f1208" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
