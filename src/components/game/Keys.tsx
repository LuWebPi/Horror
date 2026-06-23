'use client'

import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { KEY_CELLS, cellToWorld } from '@/lib/maze'
import { useGameStore } from '@/lib/game-store'
import { entities } from '@/lib/entities'
import { getAudio } from '@/lib/audio'

function KeyItem({ cell, index, collected, onCollect }: {
  cell: [number, number]
  index: number
  collected: boolean
  onCollect: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [x, , z] = cellToWorld(cell[0], cell[1])
  const lightRef = useRef<THREE.PointLight>(null)
  const pickupCheck = useRef(0)

  useFrame((state) => {
    if (collected) return
    const t = state.clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 1.5
      groupRef.current.position.y = 1.1 + Math.sin(t * 2 + index) * 0.15
    }
    // proximity pickup
    pickupCheck.current += 0.016
    if (pickupCheck.current > 0.1) {
      pickupCheck.current = 0
      const dx = entities.player.x - x
      const dz = entities.player.z - z
      if (dx * dx + dz * dz < 1.6 * 1.6) {
        onCollect()
      }
    }
  })

  if (collected) return null

  return (
    <group ref={groupRef} position={[x, 1.1, z]}>
      {/* Key ring + shaft */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.035, 8, 24]} />
        <meshStandardMaterial
          color="#ffcc33"
          emissive="#ffaa00"
          emissiveIntensity={0.8}
          metalness={0.9}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, -0.28, 0]}>
        <boxGeometry args={[0.05, 0.4, 0.05]} />
        <meshStandardMaterial
          color="#ffcc33"
          emissive="#ffaa00"
          emissiveIntensity={0.6}
          metalness={0.9}
          roughness={0.3}
        />
      </mesh>
      {/* key teeth */}
      <mesh position={[0.07, -0.45, 0]}>
        <boxGeometry args={[0.09, 0.05, 0.05]} />
        <meshStandardMaterial color="#ffcc33" emissive="#ffaa00" emissiveIntensity={0.6} metalness={0.9} roughness={0.3} />
      </mesh>
      <pointLight
        ref={lightRef}
        color="#ffcc44"
        intensity={2}
        distance={3}
        decay={2}
      />
    </group>
  )
}

export function Keys() {
  const collectKey = useGameStore((s) => s.collectKey)
  const keysCollected = useGameStore((s) => s.keysCollected)
  const exitUnlocked = useGameStore((s) => s.exitUnlocked)
  const showMessage = useGameStore((s) => s.showMessage)
  const unlockExit = useGameStore((s) => s.unlockExit)

  const [collectedSet, setCollectedSet] = useState<Set<number>>(new Set())

  const handleCollect = (i: number) => {
    if (collectedSet.has(i)) return
    setCollectedSet((prev) => {
      const next = new Set(prev)
      next.add(i)
      return next
    })
    getAudio().playKeyPickup()
    collectKey()
    const remaining = 3 - (collectedSet.size + 1)
    if (remaining <= 0) {
      showMessage('All keys found. The exit is unlocked...', 4000)
      unlockExit()
      getAudio().playDoorUnlock()
    } else {
      getAudio().playVoice('/audio/keyfound.mp3', 0.9)
      showMessage(`Key found. ${remaining} remaining.`, 3000)
    }
  }

  const items = useMemo(
    () => KEY_CELLS.map((cell, i) => ({ cell, i })),
    []
  )

  return (
    <group>
      {items.map(({ cell, i }) => (
        <KeyItem
          key={i}
          cell={cell}
          index={i}
          collected={collectedSet.has(i)}
          onCollect={() => handleCollect(i)}
        />
      ))}
    </group>
  )
}
