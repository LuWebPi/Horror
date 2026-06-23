'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { useTexture, Instances, Instance } from '@react-three/drei'
import {
  FLOORS,
  MAZE_WIDTH,
  MAZE_DEPTH,
  CELL_SIZE,
  FLOOR_HEIGHT,
  cellToWorld,
} from '@/lib/maze'
import { asset } from '@/lib/asset'

const WALL_HEIGHT = 4.2

export function Environment() {
  const [wallTex, floorTex, ceilTex, bloodTex] = useTexture([
    asset('/textures/wall.png'),
    asset('/textures/floor.png'),
    asset('/textures/ceiling.png'),
    asset('/textures/blood.png'),
  ])

  useMemo(() => {
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping
    wallTex.repeat.set(1, 1)
    wallTex.colorSpace = THREE.SRGBColorSpace
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping
    floorTex.repeat.set(MAZE_WIDTH, MAZE_DEPTH)
    floorTex.colorSpace = THREE.SRGBColorSpace
    ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping
    ceilTex.repeat.set(MAZE_WIDTH, MAZE_DEPTH)
    ceilTex.colorSpace = THREE.SRGBColorSpace
    bloodTex.wrapS = bloodTex.wrapT = THREE.RepeatWrapping
    bloodTex.colorSpace = THREE.SRGBColorSpace
  }, [wallTex, floorTex, ceilTex, bloodTex])

  // Collect walls per floor
  const floorData = useMemo(() => {
    return FLOORS.map((maze, floor) => {
      const positions: [number, number, number][] = []
      for (let r = 0; r < maze.length; r++) {
        for (let c = 0; c < maze[0].length; c++) {
          if (maze[r][c] === 1) {
            const [x, y, z] = cellToWorld(c, r, floor)
            positions.push([x, y, z])
          }
        }
      }
      return { floor, positions, maze }
    })
  }, [])

  const worldWidth = MAZE_WIDTH * CELL_SIZE
  const worldDepth = MAZE_DEPTH * CELL_SIZE

  return (
    <group>
      {floorData.map(({ floor, positions }) => {
        const y = floor * FLOOR_HEIGHT
        return (
          <group key={floor} position={[0, y, 0]}>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
              <planeGeometry args={[worldWidth, worldDepth]} />
              <meshStandardMaterial map={floorTex} roughness={0.95} metalness={0.05} color="#6a5a4a" />
            </mesh>
            {/* Ceiling (skip ceiling where stairs are, for openness — but simpler: keep ceilings, stairs are teleports) */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]} receiveShadow>
              <planeGeometry args={[worldWidth, worldDepth]} />
              <meshStandardMaterial map={ceilTex} roughness={1} metalness={0} color="#5a4a3a" />
            </mesh>
            {/* Walls */}
            <Instances limit={positions.length} castShadow receiveShadow>
              <boxGeometry args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]} />
              <meshStandardMaterial map={wallTex} roughness={0.9} metalness={0.05} color="#8a7a6a" />
              {positions.map((p, i) => (
                <Instance key={i} position={[p[0], WALL_HEIGHT / 2, p[2]]} />
              ))}
            </Instances>
          </group>
        )
      })}

      {/* Stairs visual: a ramp between ground (y=0) and upper (y=FLOOR_HEIGHT) at [8,6] */}
      <StairsVisual col={8} row={6} fromFloor={0} toFloor={1} />
      {/* Basement trapdoor hint (just a darker patch on the floor) */}
      <BasementHatch />

      {/* Blood decals for atmosphere */}
      <BloodDecals bloodTex={bloodTex} />
    </group>
  )
}

function StairsVisual({ col, row, fromFloor, toFloor }: {
  col: number; row: number; fromFloor: number; toFloor: number
}) {
  const [x, , z] = cellToWorld(col, row, fromFloor)
  const yBase = fromFloor * FLOOR_HEIGHT
  const yTop = toFloor * FLOOR_HEIGHT
  const steps = 8
  return (
    <group position={[x, yBase, z]}>
      {Array.from({ length: steps }).map((_, i) => {
        const t = i / steps
        const y = yBase + (yTop - yBase) * t
        return (
          <mesh key={i} position={[0, y - yBase + 0.25, -1.5 + i * 0.4]} castShadow>
            <boxGeometry args={[1.8, 0.5, 0.4]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
          </mesh>
        )
      })}
    </group>
  )
}

function BasementHatch() {
  const [x, y, z] = cellToWorld(1, 6, 0)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, y + 0.05, z]}>
      <planeGeometry args={[2.2, 2.2]} />
      <meshStandardMaterial color="#1a0e08" roughness={1} transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  )
}

function BloodDecals({ bloodTex }: { bloodTex: THREE.Texture }) {
  const decals = useMemo<[number, number, number][]>(
    () => [
      [5, 0, 3], [11, 0, 5], [3, 1, 9], [13, 1, 9], [7, 0, 11], [9, 2, 3],
    ],
    []
  )
  return (
    <group>
      {decals.map(([c, floor, r], i) => {
        const [x, y, z] = cellToWorld(c, r, floor)
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, y + 0.02, z]}>
            <planeGeometry args={[CELL_SIZE * 0.9, CELL_SIZE * 0.9]} />
            <meshStandardMaterial map={bloodTex} transparent opacity={0.5} roughness={1} color="#4a1818" />
          </mesh>
        )
      })}
    </group>
  )
}
