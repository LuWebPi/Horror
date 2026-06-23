'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { LIGHT_CELLS, cellToWorld, FLOOR_HEIGHT } from '@/lib/maze'
import { getAudio } from '@/lib/audio'
import { useGameStore } from '@/lib/game-store'

const WALL_HEIGHT = 4.2

interface FlickerLightProps {
  position: [number, number, number]
  behavior: 'flicker' | 'dead' | 'steady'
  color?: string
  baseIntensity?: number
  flickerSeed?: number
  isDay?: boolean
}

function FlickerLight({
  position, behavior, color = '#ffd9a0', baseIntensity = 8, flickerSeed = 0, isDay = true,
}: FlickerLightProps) {
  const lightRef = useRef<THREE.PointLight>(null)
  const fixtureRef = useRef<THREE.MeshStandardMaterial>(null)
  const lastFlickerSound = useRef(0)

  useFrame((state) => {
    if (!lightRef.current) return
    const t = state.clock.elapsedTime + flickerSeed
    // During day, lights are dimmer (sun does the work). At night, full intensity.
    const dayMod = isDay ? 0.4 : 1.0

    if (behavior === 'dead') {
      lightRef.current.intensity = 0
      if (fixtureRef.current) fixtureRef.current.emissiveIntensity = 0.05
      return
    }
    if (behavior === 'steady') {
      lightRef.current.intensity = baseIntensity * dayMod
      if (fixtureRef.current) fixtureRef.current.emissiveIntensity = dayMod
      return
    }
    // flicker
    const wave = 0.6 + 0.4 * Math.sin(t * 7.3 + flickerSeed)
    let drop = 1
    const n = Math.sin(t * 23.1 + flickerSeed * 3.7) * Math.cos(t * 17.7 + flickerSeed * 1.3)
    if (n > 0.55) drop = Math.random() > 0.4 ? 1 : 0.05
    if (Math.random() > 0.97) drop = 0.1
    const intensity = baseIntensity * wave * drop * dayMod
    lightRef.current.intensity = intensity
    if (fixtureRef.current) {
      fixtureRef.current.emissiveIntensity = 0.3 + (intensity / baseIntensity) * 0.9
    }
    if (drop < 0.2 && t - lastFlickerSound.current > 1.5) {
      lastFlickerSound.current = t
      getAudio().playFlicker()
    }
  })

  return (
    <group position={position}>
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
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {behavior !== 'dead' && (
        <pointLight ref={lightRef} color={color} intensity={baseIntensity} distance={11} decay={2} castShadow={false} />
      )}
    </group>
  )
}

export function Lights() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const isDay = timeOfDay === 'day'

  const lights = useMemo(() => {
    const behaviors: FlickerLightProps['behavior'][] = [
      'steady', 'flicker', 'steady', 'flicker', 'steady', 'steady', 'flicker', 'steady',
    ]
    return LIGHT_CELLS.map((lc, i) => {
      const [x, y, z] = cellToWorld(lc.cell[0], lc.cell[1], lc.floor)
      const isBasement = lc.floor === 2
      return {
        position: [x, y + WALL_HEIGHT - 0.5, z] as [number, number, number],
        behavior: behaviors[i % behaviors.length],
        flickerSeed: i * 2.7,
        color: isBasement ? '#ffaa55' : (i % 3 === 0 ? '#9fd0ff' : '#ffd9a0'),
        baseIntensity: isBasement ? 6 : 9,
        isDay,
      }
    })
  }, [isDay])

  return (
    <>
      {/* Daytime: bright sun-like ambient. Nighttime: dim moonlight. */}
      <ambientLight intensity={isDay ? 0.55 : 0.18} color={isDay ? '#fff4e0' : '#2a2a4a'} />
      <hemisphereLight args={isDay ? ['#fff0d8', '#5a4a3a', 0.7] : ['#2a2a3a', '#080808', 0.25]} />
      {/* A directional "sun/moon" for nicer shading */}
      <directionalLight
        position={[20, 30, 10]}
        intensity={isDay ? 0.7 : 0.15}
        color={isDay ? '#fff2d0' : '#6070a0'}
      />
      {lights.map((l, i) => (
        <FlickerLight key={i} {...l} isDay={isDay} />
      ))}
    </>
  )
}
