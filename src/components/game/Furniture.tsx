'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { FURNITURE, CREAKY_CELLS, cellToWorld } from '@/lib/maze'

// Decorative furniture meshes (no logic). Collision handled in maze.ts.
export function Furniture() {
  const items = useMemo(
    () =>
      FURNITURE.map((f) => {
        const [x, , z] = cellToWorld(f.cell[0], f.cell[1])
        return { ...f, x, z }
      }),
    []
  )

  return (
    <group>
      {items.map((f, i) => (
        <group key={i} position={[f.x, 0, f.z]} rotation={[0, f.rot, 0]}>
          {renderPiece(f.type)}
        </group>
      ))}
    </group>
  )
}

function renderPiece(type: string) {
  switch (type) {
    case 'bed':
      return (
        <group>
          {/* frame */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[1.8, 0.5, 2.6]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
          </mesh>
          {/* mattress */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <boxGeometry args={[1.6, 0.25, 2.4]} />
            <meshStandardMaterial color="#5a4a4a" roughness={1} />
          </mesh>
          {/* pillow */}
          <mesh position={[0, 0.8, -0.9]} castShadow>
            <boxGeometry args={[1.3, 0.15, 0.5]} />
            <meshStandardMaterial color="#6a5a5a" roughness={1} />
          </mesh>
          {/* headboard */}
          <mesh position={[0, 0.9, -1.35]} castShadow>
            <boxGeometry args={[1.8, 1.0, 0.12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        </group>
      )
    case 'table':
      return (
        <group>
          <mesh position={[0, 0.72, 0]} castShadow>
            <boxGeometry args={[1.6, 0.08, 0.9]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.8} />
          </mesh>
          {[[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, 0.36, lz]} castShadow>
              <boxGeometry args={[0.1, 0.72, 0.1]} />
              <meshStandardMaterial color="#2a1a0a" roughness={0.8} />
            </mesh>
          ))}
        </group>
      )
    case 'sofa':
      return (
        <group>
          {/* base */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[2.0, 0.4, 0.9]} />
            <meshStandardMaterial color="#3a2828" roughness={1} />
          </mesh>
          {/* back */}
          <mesh position={[0, 0.75, -0.4]} castShadow>
            <boxGeometry args={[2.0, 0.7, 0.2]} />
            <meshStandardMaterial color="#332020" roughness={1} />
          </mesh>
          {/* arms */}
          <mesh position={[-1.0, 0.6, 0]} castShadow>
            <boxGeometry args={[0.2, 0.6, 0.9]} />
            <meshStandardMaterial color="#2e1c1c" roughness={1} />
          </mesh>
          <mesh position={[1.0, 0.6, 0]} castShadow>
            <boxGeometry args={[0.2, 0.6, 0.9]} />
            <meshStandardMaterial color="#2e1c1c" roughness={1} />
          </mesh>
        </group>
      )
    case 'shelf':
      return (
        <group>
          <mesh position={[0, 1.2, 0]} castShadow>
            <boxGeometry args={[1.8, 2.4, 0.4]} />
            <meshStandardMaterial color="#241818" roughness={0.9} />
          </mesh>
          {/* shelf lines (slightly lighter) */}
          {[0.4, 1.0, 1.6, 2.0].map((y, i) => (
            <mesh key={i} position={[0, y, 0.05]}>
              <boxGeometry args={[1.7, 0.04, 0.35]} />
              <meshStandardMaterial color="#3a2828" roughness={0.9} />
            </mesh>
          ))}
          {/* a few "books" / objects */}
          {[
            [-0.5, 0.6], [0.2, 0.6], [0.5, 1.2], [-0.3, 1.2], [0.3, 1.8],
          ].map(([bx, by], i) => (
            <mesh key={i} position={[bx, by, 0.1]}>
              <boxGeometry args={[0.12, 0.3, 0.18]} />
              <meshStandardMaterial color={['#5a2020', '#20403a', '#3a3a20', '#402040'][i % 4]} roughness={0.8} />
            </mesh>
          ))}
        </group>
      )
    case 'chair':
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.5, 0.08, 0.5]} />
            <meshStandardMaterial color="#2a1a0a" roughness={0.8} />
          </mesh>
          {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, 0.22, lz]}>
              <boxGeometry args={[0.06, 0.45, 0.06]} />
              <meshStandardMaterial color="#1a0a00" roughness={0.8} />
            </mesh>
          ))}
          <mesh position={[0, 0.7, -0.22]} castShadow>
            <boxGeometry args={[0.5, 0.6, 0.06]} />
            <meshStandardMaterial color="#2a1a0a" roughness={0.8} />
          </mesh>
        </group>
      )
    case 'crate':
      return (
        <group>
          <mesh position={[0, 0.4, 0]} castShadow rotation={[0, 0.3, 0]}>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshStandardMaterial color="#3a2a14" roughness={0.9} />
          </mesh>
        </group>
      )
    default:
      return null
  }
}

// Creaky floorboard visual markers (subtle darker planks)
export function CreakyFloors() {
  const cells = useMemo(() => CREAKY_CELLS.map((c) => cellToWorld(c[0], c[1])), [])
  return (
    <group>
      {cells.map(([x, , z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}>
          <planeGeometry args={[3.6, 3.6]} />
          <meshStandardMaterial
            color="#1a0e08"
            roughness={1}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
