'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { EXIT_CELL, cellToWorld, CELL_SIZE } from '@/lib/maze'
import { asset } from '@/lib/asset'
import { useGameStore } from '@/lib/game-store'

export function Door() {
  const doorTex = useTexture(asset('/textures/door.png'))
  const doorTexConfigured = useRef(false)
  if (!doorTexConfigured.current) {
    doorTex.colorSpace = THREE.SRGBColorSpace
    doorTexConfigured.current = true
  }

  const exitUnlocked = useGameStore((s) => s.exitUnlocked)
  const groupRef = useRef<THREE.Group>(null)
  const openAmount = useRef(0)
  const lightRef = useRef<THREE.PointLight>(null)

  const [x, , z] = cellToWorld(EXIT_CELL[0], EXIT_CELL[1])

  useFrame((_, delta) => {
    const target = exitUnlocked ? 1 : 0
    openAmount.current = THREE.MathUtils.lerp(openAmount.current, target, delta * 2)
    if (groupRef.current) {
      // swing open like a door
      groupRef.current.rotation.y = openAmount.current * -1.6
    }
    if (lightRef.current) {
      lightRef.current.color.set(exitUnlocked ? '#33ff66' : '#ff2222')
      lightRef.current.intensity = exitUnlocked ? 4 : 2
    }
  })

  return (
    <group position={[x, 0, z]}>
      {/* Door frame */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[CELL_SIZE, 4, 0.3]} />
        <meshStandardMaterial color="#1a1a1a" roughness={1} />
      </mesh>
      {/* The door itself, pivoted on its left edge */}
      <group position={[-CELL_SIZE / 2 + 0.1, 0, 0]}>
        <group ref={groupRef}>
          <mesh position={[CELL_SIZE / 2 - 0.15, 2, 0]} castShadow>
            <boxGeometry args={[CELL_SIZE - 0.3, 3.6, 0.12]} />
            <meshStandardMaterial map={doorTex} roughness={0.7} metalness={0.3} color="#9a9a9a" />
          </mesh>
        </group>
      </group>
      {/* Status light above door */}
      <pointLight
        ref={lightRef}
        position={[0, 3.4, 0.5]}
        color="#ff2222"
        intensity={2}
        distance={6}
        decay={2}
      />
      {/* EXIT sign */}
      <mesh position={[0, 3.6, 0.2]}>
        <planeGeometry args={[1.2, 0.3]} />
        <meshStandardMaterial
          color="#220000"
          emissive={exitUnlocked ? '#33ff66' : '#ff2222'}
          emissiveIntensity={1.5}
        />
      </mesh>
    </group>
  )
}
