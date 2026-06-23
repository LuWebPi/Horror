'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LIGHT_CELLS, cellToWorld } from '@/lib/maze'
import { getAudio } from '@/lib/audio'

const WALL_HEIGHT = 4

interface FlickerLightProps {
  position: [number, number, number]
  // behavior: 'flicker' | 'dead' | 'steady'
  behavior: 'flicker' | 'dead' | 'steady'
  color?: string
  baseIntensity?: number
  flickerSeed?: number
}

function FlickerLight({
  position,
  behavior,
  color = '#ffd9a0',
  baseIntensity = 6,
  flickerSeed = 0,
}: FlickerLightProps) {
  const lightRef = useRef<THREE.PointLight>(null)
  const fixtureRef = useRef<THREE.MeshStandardMaterial>(null)
  const lastFlickerSound = useRef(0)
  const seed = flickerSeed

  useFrame((state) => {
    if (!lightRef.current) return
    const t = state.clock.elapsedTime + seed
    if (behavior === 'dead') {
      lightRef.current.intensity = 0
      if (fixtureRef.current) fixtureRef.current.emissiveIntensity = 0.05
      return
    }
    if (behavior === 'steady') {
      lightRef.current.intensity = baseIntensity
      if (fixtureRef.current) fixtureRef.current.emissiveIntensity = 1
      return
    }
    // flicker: combination of slow wave + random drops
    const wave = 0.6 + 0.4 * Math.sin(t * 7.3 + seed)
    let drop = 1
    // random harsh drops
    const n = Math.sin(t * 23.1 + seed * 3.7) * Math.cos(t * 17.7 + seed * 1.3)
    if (n > 0.55) drop = Math.random() > 0.4 ? 1 : 0.05
    if (Math.random() > 0.97) drop = 0.1
    const intensity = baseIntensity * wave * drop
    lightRef.current.intensity = intensity
    if (fixtureRef.current) {
      fixtureRef.current.emissiveIntensity = 0.3 + (intensity / baseIntensity) * 0.9
    }
    // occasional flicker sound
    if (drop < 0.2 && t - lastFlickerSound.current > 1.5) {
      lastFlickerSound.current = t
      getAudio().playFlicker()
    }
  })

  return (
    <group position={position}>
      {/* Light fixture (small emissive box hanging from ceiling) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.12, 0.5]} />
        <meshStandardMaterial
          ref={fixtureRef}
          color="#222"
          emissive={behavior === 'dead' ? '#220000' : color}
          emissiveIntensity={behavior === 'dead' ? 0.05 : 1}
          roughness={0.6}
        />
      </mesh>
      {/* thin hanging rod */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {behavior !== 'dead' && (
        <pointLight
          ref={lightRef}
          color={color}
          intensity={baseIntensity}
          distance={9}
          decay={2}
          castShadow={false}
        />
      )}
    </group>
  )
}

export function Lights() {
  // Assign behaviors to light cells deterministically — mostly steady/flicker so the asylum is visible
  const lights = useMemo(() => {
    const behaviors: FlickerLightProps['behavior'][] = [
      'steady', 'flicker', 'steady', 'flicker', 'steady', 'steady', 'flicker', 'steady',
    ]
    return LIGHT_CELLS.map((cell, i) => {
      const [x, , z] = cellToWorld(cell[0], cell[1])
      return {
        position: [x, WALL_HEIGHT - 0.5, z] as [number, number, number],
        behavior: behaviors[i % behaviors.length],
        flickerSeed: i * 2.7,
        color: i % 3 === 0 ? '#9fd0ff' : '#ffd9a0',
        baseIntensity: 8 + (i % 3),
      }
    })
  }, [])

  return (
    <>
      {/* Dim ambient so unlit areas aren't pure black but still tense */}
      <ambientLight intensity={0.12} color="#3a3a4a" />
      <hemisphereLight args={['#2a2a3a', '#080808', 0.3]} />
      {lights.map((l, i) => (
        <FlickerLight key={i} {...l} />
      ))}
    </>
  )
}
