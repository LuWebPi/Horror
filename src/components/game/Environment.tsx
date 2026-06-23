'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { useTexture, Instances, Instance } from '@react-three/drei'
import {
  MAZE,
  MAZE_WIDTH,
  MAZE_DEPTH,
  CELL_SIZE,
  cellToWorld,
} from '@/lib/maze'
import { asset } from '@/lib/asset'

const WALL_HEIGHT = 4

export function Environment() {
  const [wallTex, floorTex, ceilTex, bloodTex] = useTexture([
    asset('/textures/wall.png'),
    asset('/textures/floor.png'),
    asset('/textures/ceiling.png'),
    asset('/textures/blood.png'),
  ])

  // Configure texture tiling once
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

  // Collect wall cell positions
  const wallPositions = useMemo(() => {
    const positions: [number, number, number][] = []
    for (let r = 0; r < MAZE_DEPTH; r++) {
      for (let c = 0; c < MAZE_WIDTH; c++) {
        if (MAZE[r][c] === 1) {
          positions.push(cellToWorld(c, r))
        }
      }
    }
    return positions
  }, [])

  const worldWidth = MAZE_WIDTH * CELL_SIZE
  const worldDepth = MAZE_DEPTH * CELL_SIZE

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[worldWidth, worldDepth]} />
        <meshStandardMaterial map={floorTex} roughness={0.95} metalness={0.05} color="#7a7a7a" />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]} receiveShadow>
        <planeGeometry args={[worldWidth, worldDepth]} />
        <meshStandardMaterial map={ceilTex} roughness={1} metalness={0} color="#5a5a5a" />
      </mesh>

      {/* Walls - instanced for performance */}
      <Instances limit={wallPositions.length} castShadow receiveShadow>
        <boxGeometry args={[CELL_SIZE, WALL_HEIGHT, CELL_SIZE]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} metalness={0.05} color="#8a8a8a" />
        {wallPositions.map((p, i) => (
          <Instance key={i} position={[p[0], WALL_HEIGHT / 2, p[2]]} />
        ))}
      </Instances>

      {/* Blood decals on the floor for atmosphere */}
      <BloodDecals bloodTex={bloodTex} />
    </group>
  )
}

function BloodDecals({ bloodTex }: { bloodTex: THREE.Texture }) {
  const decals = useMemo<[number, number][]>(
    () => [
      [5, 3], [11, 5], [3, 9], [13, 9], [7, 11], [9, 3],
    ],
    []
  )
  return (
    <group>
      {decals.map(([c, r], i) => {
        const [x, , z] = cellToWorld(c, r)
        return (
          <mesh
            key={i}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[x, 0.02, z]}
          >
            <planeGeometry args={[CELL_SIZE * 0.9, CELL_SIZE * 0.9]} />
            <meshStandardMaterial
              map={bloodTex}
              transparent
              opacity={0.5}
              roughness={1}
              color="#4a1818"
            />
          </mesh>
        )
      })}
    </group>
  )
}
